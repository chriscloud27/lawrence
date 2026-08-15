# ADR-0006: Orchestrate the chatbot AI agent in an n8n workflow

**Status:** proposed
**Date:** 2026-07-03

## Context

The chatbot agent is hand-coded in `src/Chatbot/app/api/chat/route.ts`: it holds the
system prompt (`lib/prompts/system.ts`), a manual Anthropic tool loop (`search_schools`,
`offer_calendar` from `lib/tools.ts`), SSE streaming, and lead scoring
(`extractAndSaveScore`). Every prompt tweak or flow change needs a developer and a deploy.

The team wants to **develop the prototype together in n8n** and let non-developers with
n8n access own the agent prompts and conversational flow. For this stage, latency and
token-streaming UX are explicitly not priorities; quick setup and a presentable demo are.
The platform already runs n8n for ingestion, so this also unifies orchestration on one tool.

## What "streaming" means (and why it drives the decision)

**Why / what it is.** An LLM produces tokens sequentially. *Streaming* forwards each token
to the browser as it is generated (via Server-Sent Events), so the reply appears word-by-word
— the "typing" effect — instead of the user staring at a spinner until the whole answer is
ready. The current code streams: `route.ts` iterates `anthropic.messages.create({stream:true})`
and pushes `data: {type:'text',delta:...}` SSE frames the `ChatWidget` renders live.

**How it's done.** Two ingredients: (1) the server keeps the HTTP response open and writes
incremental `text/event-stream` chunks; (2) the client reads the stream and appends deltas to
the bubble. It requires an always-open connection from browser → server → LLM.

**What it brings (desired output).** Lower *perceived* latency and a livelier UX — the answer
feels instant even when total time is unchanged. It brings nothing to correctness or data;
it is purely a UX affordance. n8n webhooks are request/response by default and do not emit SSE
cleanly, so streaming is exactly the capability in tension with moving orchestration to n8n.

## Decision

Move the chatbot's AI orchestration into an **n8n workflow** (`chat-agent.json`, exported to
`n8n/workflows/`). Next.js becomes a thin client:

- `route.ts` forwards the conversation to an n8n **Chat/Webhook trigger** (URL via
  `$env.N8N_CHAT_WEBHOOK_URL`) and returns n8n's reply.
- The n8n **AI Agent node** owns the system prompt, model choice, and tools; the team edits
  these in the n8n UI. Anthropic credentials live in n8n's credential store, off the app env.
- Session/state stays where ADR-0005 put it: the chatbot still writes `leads`/`messages` and
  reads `schools_chatbot`. Scoring moves to an n8n node (or a called sub-workflow).
- Tools (`search_schools`) call back into the existing Next.js API routes, unchanged.

We adopt **Streaming Scenario A now** and **hold Scenario B as the documented upgrade path.**

### Scenario A — Non-streaming, request/response (ACCEPTED for this stage)
n8n webhook uses "respond when the last node finishes." The full assistant message returns as
one JSON body; `ChatWidget` shows a typing indicator, then the complete bubble. Simplest to
build, fully UI-editable, matches "streaming not important." Trade-off: no word-by-word effect;
the user waits for the whole reply.

### Scenario B — Streaming preserved via a shim (DEFERRED)
Keep the token-streaming UX by either (a) using n8n's streaming response mode from the AI Agent
node where supported, or (b) a Next.js proxy that re-opens the SSE stream — at the cost of
splitting agent config between n8n and code. Revisit if/when perceived latency or demo polish
becomes a priority. No work now; recorded so the choice is deliberate later.

## Consequences

- **Easier:** non-devs edit prompts/flow/tools in the n8n UI with no deploy; orchestration
  unified on n8n; Anthropic key centralized in n8n credentials; fast to stand up and demo.
- **Harder / accepted trade-offs:** lose token streaming (Scenario A); an extra network hop and
  n8n now a runtime dependency for live chat, not just batch ingestion; workflow logic lives in
  JSON blobs (weaker diffs/tests than the current typed route); scoring logic leaves TypeScript.
- **Migration note:** the in-code path in `route.ts` can stay behind a flag during transition;
  mock mode (no `ANTHROPIC_API_KEY`) remains a fallback for UI work.
- **Follow-ups (separate tasks):** build `chat-agent.json`; add `N8N_CHAT_WEBHOOK_URL` to
  `.env.example`; document required n8n credentials in `n8n/credentials.example.json`.
