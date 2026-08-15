import { db } from '@/lib/db';
import { leads, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { classify } from '@/lib/scoring';
import { buildMockResponse } from '@/lib/mock-chat';

export const runtime = 'nodejs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  leadId?: string;
}

// n8n owns AI orchestration (ADR-0006, Scenario A: non-streaming). When the
// webhook URL is unset we fall back to mock mode so UI dev stays unblocked.
const N8N_CHAT_WEBHOOK_URL = process.env.N8N_CHAT_WEBHOOK_URL;
const isMockMode = !N8N_CHAT_WEBHOOK_URL;

export async function POST(request: Request) {
  const body: ChatRequestBody = await request.json();
  const { messages: clientMessages, leadId: existingLeadId } = body;

  // Upsert lead
  let leadId = existingLeadId;
  if (!leadId) {
    leadId = nanoid();
    await db.insert(leads).values({
      id: leadId,
      createdAt: new Date(),
      score: 0,
      status: 'new',
    });
  }

  // Save the new user message
  const lastUserMsg = clientMessages[clientMessages.length - 1];
  if (lastUserMsg?.role === 'user') {
    await db.insert(messages).values({
      id: nanoid(),
      leadId,
      role: 'user',
      content: lastUserMsg.content,
      createdAt: new Date(),
    });
  }

  const encoder = new TextEncoder();

  // --- MOCK MODE (no n8n configured) ---
  if (isMockMode) {
    const mock = buildMockResponse(clientMessages);
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const words = mock.text.split(' ');
        for (const word of words) {
          send({ type: 'text', delta: word + ' ' });
          await new Promise(r => setTimeout(r, 40));
        }

        if (mock.schools) send({ type: 'schools', schools: mock.schools });
        if (mock.calendlyUrl) send({ type: 'calendar', calendlyUrl: mock.calendlyUrl });

        await db.insert(messages).values({
          id: nanoid(),
          leadId: leadId!,
          role: 'assistant',
          content: mock.text,
          createdAt: new Date(),
        });

        await db.update(leads).set({
          score: mock.score,
          classification: mock.classification,
          status: mock.classification === 'cold' ? 'nurture' : 'new',
        }).where(eq(leads.id, leadId!));

        send({ type: 'done', leadId, score: { total: mock.score, classification: mock.classification } });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // --- LIVE MODE (n8n orchestration, Scenario A: one complete reply) ---
  const agentName = process.env.AGENT_NAME || 'Sarah';
  const agentSpecialty = process.env.AGENT_SPECIALTY || 'international school placement across Asia';

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const res = await fetch(N8N_CHAT_WEBHOOK_URL!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: clientMessages,
            leadId,
            agentName,
            agentSpecialty,
            calendlyUrl: process.env.CALENDLY_URL || '',
          }),
        });

        if (!res.ok) {
          throw new Error(`n8n webhook responded ${res.status}`);
        }

        const result = await res.json();
        const reply: string = result.reply || '';
        const schools = result.schools ?? null;
        const calendlyUrl: string | null = result.calendlyUrl || null;
        const score = result.score ?? null;

        // Re-emit as SSE frames the ChatWidget already parses. Non-streaming:
        // the whole reply is one text delta.
        if (reply) send({ type: 'text', delta: reply });
        if (schools && schools.length) send({ type: 'schools', schools });
        if (calendlyUrl) send({ type: 'calendar', calendlyUrl });

        // Persist assistant message + the score n8n computed.
        if (reply) {
          await db.insert(messages).values({
            id: nanoid(),
            leadId: leadId!,
            role: 'assistant',
            content: reply,
            createdAt: new Date(),
          });
        }

        if (score && typeof score.total === 'number') {
          const classification = score.classification || classify(score.total);
          const update: Record<string, unknown> = {
            score: score.total,
            scoreBreakdown: score.breakdown ?? undefined,
            classification,
          };
          if (score.location_text) update.location = score.location_text;
          if (score.timeline_text) update.timeline = score.timeline_text;
          if (score.forcing_function_text) update.forcingFunction = score.forcing_function_text;
          if (score.curriculum_text) update.curriculum = score.curriculum_text;
          await db.update(leads).set(update).where(eq(leads.id, leadId!));
        }

        send({ type: 'done', leadId, score });
        controller.close();
      } catch (error) {
        const err = error as Error;
        send({ type: 'error', message: err.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
