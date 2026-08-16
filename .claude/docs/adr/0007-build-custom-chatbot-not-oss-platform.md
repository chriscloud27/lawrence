# ADR-0007: Build the qualification chatbot custom instead of adopting an open-source platform

**Status:** accepted
**Date:** 2026-08-16

## Context

Before continuing the custom Next.js chatbot build (`src/Chatbot/`), we evaluated whether an open-source chatbot platform compatible with our stack (React/Next.js, Supabase, n8n) could replace some or all of the custom layer — specifically the chat UI, session/message storage, and admin inbox — while we keep authoring the bespoke BANT qualification logic ourselves.

Three candidates were researched and rated on development effort, maintenance needs, cost, and integratability: Typebot (conversational-form builder), Chatwoot (customer-engagement platform with AI add-on), and Botpress (visual bot-flow builder with NLU). None are purpose-built for passive, listen-not-interrogate BANT scoring with hidden two-stage evaluation and tiered routing — that logic would need to be built as custom integration code against any of them.

## Decision

Continue building the chatbot custom on the current stack (Next.js + Anthropic SDK + Drizzle + n8n + Supabase) rather than adopting Typebot, Chatwoot, or Botpress.

Rated summary (1–5, higher = better fit):

| | Typebot | Chatwoot+AI | Botpress | Custom |
|---|---|---|---|---|
| Dev effort | 3 | 2 | 2 | 4 |
| Maintenance | 4 | 2 | 2 | 4 |
| Cost | 4 | 3 | 3 | 4 |
| Integratability | 3 | 2 | 2 | 5 |
| **Overall** | 3.5 | 2.25 | 2.25 | **4.25** |

Key reasons a platform swap was rejected:
- The core value of this product (passive BANT signal extraction, hidden scoring, tiered routing per [[architectural-principles]]) is bespoke conversational logic none of these platforms ship — it must be custom-built regardless of host platform.
- Typebot's chat UX is form-like, which fights the required "no interrogation" persona (`.claude/rules/chatbot.md`).
- Chatwoot's runtime (Rails + Redis + Sidekiq) is heavier than needed at v1 scope, and its data model (contacts/inboxes) doesn't map cleanly onto our `leads`/`schools_chatbot` schema (ADR-0005).
- Botpress's self-hosted line has had no release since 2023-06-22, signaling a stale/abandoned self-hosted track.
- Custom keeps a single source of truth for lead/message state and reuses infrastructure we already run (n8n + Supabase), with no adapter layer.

## Consequences

**Easier:**
- Single data model and source of truth (Supabase `leads`/`schools_chatbot`) — no dual-write between our schema and a foreign platform's.
- Full control over conversational persona, scoring logic, and routing without fighting a platform's abstractions.
- No new runtime or DevOps surface to operate beyond the existing n8n/Supabase/Next.js stack.

**Harder:**
- We own building and maintaining the chat UI, admin inbox, and session storage ourselves — no free ride from an existing platform's mature UI.
- No built-in human-agent shared inbox / omnichannel support if that's needed later (would require custom build or a v2 addition).

**Trade-off accepted:** More upfront build effort now, in exchange for architectural fit and avoiding a costly migration off a platform not designed for this qualification logic.

**Revisit at v2 if:** the team wants human-agent handoff/shared-inbox UX (Chatwoot becomes relevant, additive not instead-of), or a white-label customer needs a visual no-code flow editor for non-engineers (Typebot's niche) — both out of v1 scope per the v1/v2 boundary principle.
