import { buildSystemPrompt } from '@/lib/prompts/system';
import { TOOLS } from '@/lib/tools';
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

const isMockMode = !process.env.ANTHROPIC_API_KEY;

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

  // --- MOCK MODE ---
  if (isMockMode) {
    const mock = buildMockResponse(clientMessages);
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Simulate streaming by sending text word by word
        const words = mock.text.split(' ');
        for (const word of words) {
          send({ type: 'text', delta: word + ' ' });
          await new Promise(r => setTimeout(r, 40));
        }

        if (mock.schools) send({ type: 'schools', schools: mock.schools });
        if (mock.calendlyUrl) send({ type: 'calendar', calendlyUrl: mock.calendlyUrl });

        // Save assistant message
        await db.insert(messages).values({
          id: nanoid(),
          leadId: leadId!,
          role: 'assistant',
          content: mock.text,
          createdAt: new Date(),
        });

        // Update lead score
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

  // --- LIVE MODE (Anthropic API) ---
  const { anthropic, MODEL } = await import('@/lib/anthropic');
  const agentName = process.env.AGENT_NAME || 'Sarah';
  const agentSpecialty = process.env.AGENT_SPECIALTY || 'international school placement across Asia';
  const systemPrompt = buildSystemPrompt(agentName, agentSpecialty);
  const turnCount = clientMessages.filter(m => m.role === 'user').length;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        let fullText = '';
        let schoolResults: object[] | null = null;
        let scoreData: object | null = null;

        const apiMessages = clientMessages.map(m => ({ role: m.role, content: m.content }));

        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          tools: TOOLS,
          messages: apiMessages,
          stream: true,
        });

        let toolUseBlock: { id: string; name: string; input: Record<string, unknown> } | null = null;
        let toolInputJson = '';

        for await (const event of response) {
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'tool_use') {
              toolUseBlock = { id: event.content_block.id, name: event.content_block.name, input: {} };
              toolInputJson = '';
            }
          } else if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              fullText += event.delta.text;
              send({ type: 'text', delta: event.delta.text });
            } else if (event.delta.type === 'input_json_delta') {
              toolInputJson += event.delta.partial_json;
            }
          } else if (event.type === 'content_block_stop') {
            if (toolUseBlock) {
              try { toolUseBlock.input = JSON.parse(toolInputJson || '{}'); } catch { toolUseBlock.input = {}; }

              if (toolUseBlock.name === 'search_schools') {
                const input = toolUseBlock.input as Record<string, unknown>;
                const params = new URLSearchParams();
                if (input.country) params.set('country', String(input.country));
                if (input.city) params.set('city', String(input.city));
                if (input.curriculum) params.set('curriculum', String(input.curriculum));
                if (input.age_min) params.set('age_min', String(input.age_min));
                if (input.age_max) params.set('age_max', String(input.age_max));
                if (input.fees_max_usd) params.set('fees_max_usd', String(input.fees_max_usd));
                if (input.boarding !== undefined) params.set('boarding', String(input.boarding));
                params.set('limit', String(input.limit || 4));

                const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3001';
                const res = await fetch(`${baseUrl}/api/schools/search?${params}`);
                const data = await res.json();
                schoolResults = data.schools || [];
                send({ type: 'schools', schools: schoolResults });

                const followUp = await anthropic.messages.create({
                  model: MODEL,
                  max_tokens: 512,
                  system: systemPrompt,
                  messages: [
                    ...apiMessages,
                    { role: 'assistant', content: [{ type: 'tool_use', id: toolUseBlock.id, name: toolUseBlock.name, input: toolUseBlock.input }] },
                    { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: JSON.stringify(data) }] },
                  ],
                });
                const followText = followUp.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('');
                if (followText) { send({ type: 'text', delta: followText }); fullText += followText; }
                scoreData = await extractAndSaveScore(leadId!, apiMessages, systemPrompt);

              } else if (toolUseBlock.name === 'offer_calendar') {
                send({ type: 'calendar', calendlyUrl: process.env.CALENDLY_URL || '' });
                const followUp = await anthropic.messages.create({
                  model: MODEL,
                  max_tokens: 256,
                  system: systemPrompt,
                  messages: [
                    ...apiMessages,
                    { role: 'assistant', content: [{ type: 'tool_use', id: toolUseBlock.id, name: toolUseBlock.name, input: toolUseBlock.input }] },
                    { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: 'Calendar embed shown.' }] },
                  ],
                });
                const followText = followUp.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('');
                if (followText) { send({ type: 'text', delta: followText }); fullText += followText; }
                scoreData = await extractAndSaveScore(leadId!, apiMessages, systemPrompt);
              }

              toolUseBlock = null;
              toolInputJson = '';
            }
          } else if (event.type === 'message_stop') {
            if (!scoreData && fullText) {
              scoreData = await extractAndSaveScore(leadId!, apiMessages, systemPrompt);
            }
          }
        }

        if (fullText) {
          await db.insert(messages).values({ id: nanoid(), leadId: leadId!, role: 'assistant', content: fullText, createdAt: new Date() });
        }

        send({ type: 'done', leadId, score: scoreData });
        controller.close();
      } catch (error) {
        const err = error as Error;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}

async function extractAndSaveScore(
  leadId: string,
  conversationMessages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt: string,
): Promise<object> {
  const { anthropic, MODEL } = await import('@/lib/anthropic');
  const scoringPrompt = `Score this parent lead. Return ONLY valid JSON:
{"timeline":<0|10|20|30>,"forcing_function":<0|25>,"commitment":<0|10|15|20>,"location":<0|15|20>,"budget":<0|5|10>,"location_text":"<city>","timeline_text":"<when>","forcing_function_text":"<reason>","curriculum_text":"<pref>","child_age_text":"<age>"}`;

  try {
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 256, system: scoringPrompt, messages: conversationMessages });
    const text = res.content[0].type === 'text' ? res.content[0].text : '{}';
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};
    const total = (parsed.timeline || 0) + (parsed.forcing_function || 0) + (parsed.commitment || 0) + (parsed.location || 0) + (parsed.budget || 0);
    const classification = classify(total);
    const breakdown = { timeline: parsed.timeline || 0, forcing_function: parsed.forcing_function || 0, commitment: parsed.commitment || 0, location: parsed.location || 0, budget: parsed.budget || 0, total };
    const update: Record<string, unknown> = { score: total, scoreBreakdown: breakdown, classification };
    if (parsed.location_text) update.location = parsed.location_text;
    if (parsed.timeline_text) update.timeline = parsed.timeline_text;
    if (parsed.forcing_function_text) update.forcingFunction = parsed.forcing_function_text;
    if (parsed.curriculum_text) update.curriculum = parsed.curriculum_text;
    await db.update(leads).set(update).where(eq(leads.id, leadId));
    return { ...breakdown, classification };
  } catch { return {}; }
}
