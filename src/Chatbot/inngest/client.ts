import { Inngest, eventType } from "inngest";
import { z } from "zod";
import { IS_PRODUCTION } from "@/lib/env";

// Durable side effects for the chat path (ADR-0018).
//
// Everything that must survive a failed request lives behind this client:
// scoring, the `leads` upsert, the `messages` insert, and the hot-lead
// notification. Each is a separately retried step, so a Supabase blip re-runs
// the write without re-running the model — and, more to the point, without
// losing the lead. n8n's version of this had no retry story at all, and its
// notification branch was unreachable (ADR-0017).
//
// No keys locally: `npx inngest-cli dev` discovers the app over HTTP.
//
// Inngest v4 types events with `eventType` + a Standard Schema, not the v3
// `EventSchemas` class. Zod v4 is a Standard Schema, so the schema below is
// both the TypeScript type and the runtime validation — one definition, and a
// malformed event fails at the boundary instead of three steps in.

export const chatTurnCompleted = eventType("chat/turn.completed", {
  schema: z.object({
    /** The browser's session id. Also the `leads` primary key. */
    sessionId: z.string().min(1),
    /** The whole conversation including the assistant turn just streamed. */
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    ),
  }),
});

export const inngest = new Inngest({
  id: "lawrence-chatbot",
  // v4 does NOT infer dev mode from NODE_ENV. Without this it starts in cloud
  // mode, every `PUT /api/inngest` 500s with "no signing key found", and every
  // send fails with "we couldn't find an event key" — so the whole write path
  // silently no-ops locally while the chat itself looks perfectly healthy.
  // Derived from the one NODE_ENV read the rules allow (lib/env.ts) rather than
  // from an INNGEST_DEV variable somebody has to remember to set.
  isDev: !IS_PRODUCTION,
});
