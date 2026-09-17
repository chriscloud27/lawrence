// The parent-facing conversation (ADR-0018, superseding ADR-0006).
//
// Thin by rule (.claude/rules/chatbot.md): the prompt comes from the database,
// the model comes from the seam, the tools come from lib/ai/tools.ts, and the
// scoring and writes happen in an Inngest function. What is left here is the
// HTTP shape and the ceiling.
//
// TWO THINGS THIS FILE MUST NEVER DO, both load-bearing:
//
//   * Name a model or import a provider package. Ask the seam for a job
//     (.claude/rules/ai-providers.md).
//   * Put a score, a breakdown, a tier, or a threshold in the response. The
//     parent never sees the qualification machinery — not in the body, not in
//     a header. The body here is plain text and nothing else, which is the
//     cheapest possible guarantee of that.

import { stepCountIs, streamText } from "ai";
import {
  cacheableSystem,
  costLogFrom,
  logAiCall,
  modelFor,
} from "@/lib/ai/provider";
import { parentAgentTools } from "@/lib/ai/tools";
import { getActiveAgentConfig } from "@/lib/agent-config";
import { checkLimits, clientIp, limitResponse } from "@/lib/rate-limit";
import { chatTurnCompleted, inngest } from "@/inngest/client";
import type { ConversationTurn } from "@/lib/bant/types";

// fs (lib/prompts.ts) and the Supabase service client both need Node.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Streaming plus a tool round-trip can outrun the default on a cold model.
export const maxDuration = 60;

interface ChatRequestBody {
  messages: ConversationTurn[];
  sessionId: string;
}

/**
 * A single-chunk text stream, for the paths that answer with fixed copy.
 * Returned as a stream rather than JSON so the client has exactly one response
 * shape to read — a second shape is a second bug.
 */
function textStream(text: string): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}

export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const sessionId = body.sessionId;

  if (!sessionId || messages.length === 0) {
    return Response.json({ error: "sessionId and messages are required" }, { status: 400 });
  }

  // Ceiling first, before any spend: an endpoint that calls a model must not be
  // an unmetered one (build step 11).
  const limit = await checkLimits({ ip: clientIp(request), sessionId, countsAsTurn: true });
  if (!limit.ok) return limitResponse(limit);

  const config = await getActiveAgentConfig();

  // Past the cap the parent gets an ending, not an error — HTTP 200, warm copy,
  // and no mention of a cap, a score, or a process (.claude/rules/chatbot.md).
  if (limit.turnCapReached) {
    return textStream(config.routingCopy.turn_cap_close);
  }

  const startedAt = Date.now();

  const result = streamText({
    model: modelFor("parent_turn"),
    // Marked cacheable: the system prompt is identical on every turn of every
    // conversation, and prompt caching is the largest single cost lever in the
    // ADR-0015 model. Anthropic will not cache below 2048 tokens, so a short
    // prompt reporting zero cache tokens is expected, not a bug.
    messages: [cacheableSystem(config.systemPrompt), ...messages],
    tools: parentAgentTools,
    // WITHOUT THIS THE AGENT GOES SILENT AFTER A TOOL CALL. v6 `streamText`
    // stops at the end of a step, and a tool call ends a step — so the parent
    // reads "Let me search for schools that might be a good fit." and then
    // nothing, forever. `stopWhen` lets the model run again with the tool
    // results and actually deliver the recommendation.
    //
    // Five steps: a search, a refined search, a calendar offer, and slack.
    // It is a ceiling against a loop, not a target.
    stopWhen: stepCountIs(5),
    onFinish({ usage, providerMetadata, text }) {
      // The cost log is not optional for a streaming call site
      // (.claude/rules/ai-providers.md). Counts only — no prompt or completion
      // text, because parent messages are PII.
      logAiCall(
        costLogFrom({
          job: "parent_turn",
          usage,
          providerMetadata,
          latencyMs: Date.now() - startedAt,
          sessionId,
        })
      );

      // Scoring and persistence happen here, off the response path, so the
      // parent never waits on a scoring call and a failed write is retried
      // rather than lost. Fire-and-forget by design: the parent's reply has
      // already streamed, and a transport failure must not surface to them.
      inngest
        .send(
          chatTurnCompleted.create({
            sessionId,
            messages: [...messages, { role: "assistant" as const, content: text }],
          }),
        )
        .catch((error) => {
          console.error("[chat] could not enqueue chat/turn.completed", {
            sessionId,
            error: String(error),
          });
        });
    },
  });

  // Plain text, not a UI message stream. The BANT delta, the tier, and the
  // score are computed in the Inngest function and never touch this response —
  // there is no field here for them to leak into.
  return result.toTextStreamResponse();
}
