# Chatbot Rules

## Overview
Next.js 16 + React 19 app (`src/Chatbot/`) — the parent-facing chat widget, the marketing page, the
schools directory, and the agency dashboard. Ships `@supabase/supabase-js` + `@supabase/ssr` for
data and auth, the AI SDK (`ai` v6 + `@ai-sdk/*`), Zod v4, Inngest, Resend, and Tailwind v4.

**The agent runs here, not in n8n** ([ADR-0018](../docs/adr/0018-chat-agent-in-typescript.md),
superseding ADR-0006). `/api/chat` streams a turn from `modelFor("parent_turn")`; scoring lives in
`lib/bant/`; durable writes and the hot-lead email are Inngest steps. `/api/prequalify` and the two
chat workflows are gone. n8n keeps scheduled scraping and the ADR-0008 identity link.

## Intake Method (v2)

Per ADR-0010, the chatbot is one of two peer intake front-ends — the other is a structured
intake form with document upload. Which one(s) an agency runs is a per-agency
`intake_method` setting (`chatbot` | `form` | `both`), never a per-agency code fork. Both write
into the same `leads` row shape (tagged with a `source` column) and feed the same downstream
BANT scoring and profile construction — do not build chatbot-only assumptions into that shared
pipeline. The chatbot's read-only-from-Supabase / writes-via-n8n rule below applies identically
to the form intake path.

## Model Selection

> **Per-job model routing is governed by [ADR-0015](../docs/adr/0015-ai-model-provider-strategy.md).**
> That ADR is `proposed`: its routing table is a hypothesis under evaluation, not a plan of record.
> This project deliberately runs two providers — see `.claude/rules/ai-agents.md`, which defaults to
> `gpt-4o-mini` for extraction.

The seam landed at build step 12: **no model ID may appear outside
`src/Chatbot/lib/ai/provider.ts`**, and no provider package may be imported outside it. Ask for a
job — `modelFor("parent_turn")` — and read `.claude/rules/ai-providers.md` before touching routing.

`parent_turn` and `bant_delta` are `claude-haiku-4-5` today; `bant_refine` is `claude-sonnet-4-6`
and runs only in the 50–75 band. Those are the current values, not a settled decision.

## Data Access

**Current state:** app-owned tables (`leads`, `messages`, `agent_config`) are reached through
`@supabase/supabase-js` via the shared clients in `lib/`. There is no ORM, no `src/Chatbot/db/`
directory, and no local SQLite — any instruction to run `npm run seed` or `drizzle-kit generate`
describes a workflow that does not exist here.

Three clients, and which one you pick is a security decision, not a convenience one:

| Client | Key | Used by |
|---|---|---|
| `getSupabaseServerClient()` | anon | the public schools directory — no session, RLS sees no `auth.uid()` |
| `getSupabaseRequestClient()` | anon + session cookies | everything behind auth, so RLS scopes by agency |
| `getSupabaseAdminClient()` | **service role** | Inngest write steps and the anonymous chat route's `agent_config` read — bypasses RLS |

Never reach for the admin client from a component, a `"use client"` file, or an Admin page. Admin
writes go through the cookie-bound client so the owner-only policies decide, not the route.

**Decided target:** [ADR-0013](../docs/adr/0013-production-stack-configuration.md) names **Drizzle**
for app-owned tables, with `supabase-js` retained for Auth, Storage, and Realtime. Neither client
may write the same tables. Drizzle is not installed yet — treat this as the destination, not the
current state, and do not generate code against it until the dependency lands deliberately.

- Never write raw SQL strings outside of a query builder. This survives either client.

## Supabase Integration
- Read from Supabase via the shared clients above — do not create a second client instance
- **The chatbot REQUEST PATH is read-only.** Writes happen in Inngest steps
  (`inngest/functions/`), not in a route handler and not in n8n. This changed at ADR-0018; the
  earlier form of this rule said writes go through n8n pipelines, which is no longer true and no
  longer possible — the chat workflows are deleted.
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only and is read in exactly one file,
  `lib/supabase-admin.ts`

## Next.js Conventions
- This version (16.x) has breaking changes — read `node_modules/next/dist/docs/` before editing routing or server actions
- Use App Router (`src/Chatbot/app/`) — no Pages Router
- Server Components by default; add `"use client"` only when browser APIs or state are required
- API routes live in `app/api/` — keep them thin, delegate logic to `lib/`

## Environment Variables
- Document all required vars in `.env.example` at repo root
- Never access `process.env` directly in components — wrap in `src/Chatbot/lib/env.ts`

## Structure
- `app/` — routes and layouts (App Router), plus `app/api/` route handlers
- `components/` — shared UI components, hand-written against the `lw-*` token layer. shadcn/ui is
  the decided pattern but no shadcn dependency is installed in this app today
- `lib/` — business logic, Supabase clients, session state, schools queries

---

## AI Agent Behavior & Qualification

### Persona

The AI assistant reads as a **warm, experienced admissions advisor**, not a form or interrogator.

**Tone:**
- Empathetic (acknowledges parent context: relocation anxiety, exam pressure, school-choice complexity)
- Professional causual (friendly, not overly formal; avoids slang)
- Curious (asks clarifying questions naturally, one per turn)
- Advisory (offers context and perspective, not just takes input)
- Never clinical or scripted

**Do:**
- Reflect understanding: "Sounds like you're juggling IGCSE plus admissions decisions."
- Listen for BANT signals passively (e.g., "September exams" = urgency + need)
- One question per turn maximum
- Acknowledge constraints and trade-offs
- Reframe objections as information ("So budget is a limiting factor — that helps me understand your options")

**Do NOT:**
- Ask all BANT dimensions at once
- Use phrases like "Can you tell me your budget?" (form-like interrogation)
- Mention qualification process or scoring
- Assume unilateral decision-making authority
- Offer options without context
- Be transactional

### BANT Scoring (Hidden from Parent)

Two outputs per turn, and only the first ever reaches the browser:
1. **Conversational reply** — warm, contextual, one follow-up question. Streamed from `/api/chat`
   as **plain text**, so there is no field in the response for anything else to leak into.
2. **Hidden BANT delta** — structured scoring (0–25 per dimension), computed in an Inngest step
   *after* the stream closes, validated with Zod, and written to `leads`. The parent never sees it,
   and it never delays a token.

Example hidden block (not shown to parent):
```json
{
  "timeline": 18,
  "budget": 12,
  "authority": 20,
  "need": 10,
  "explanation": "Parent mentioned September deadline (timeline signal). Joint decision with spouse (authority split). Premium school context (budget signal)."
}
```

`lib/bant/delta.ts` parses and validates this; `lib/bant/index.ts` accumulates and routes. On
malformed JSON it logs the raw response and throws — never a silent skip.

### Handoff Trigger

At 75+ score, the conversation naturally shifts to handoff:
- "Based on everything you've shared, I think you'd benefit from a deeper conversation with one of our advisors."
- Offer booking link or email option
- Transition to human counsellor

Never mention score or qualification threshold to parent.

### Objection Handling

When parents express doubt or resistance:
- Reframe as information, not objection
- Clarify constraints (budget, timeline, decision-making)
- Offer concrete next steps (resource list, booking link, email)
- Do NOT try to overcome objection; instead, match them to the right resource tier

Example:
- **Parent:** "We're still exploring, not ready to commit."
- **Response:** "That's totally understandable — there's a lot to consider. Here are some resources to explore at your own pace. Feel free to come back when you're ready to dig deeper."
- (Score impact: -5 timeline points; route to standard resources tier)

---

See `.claude/rules/bant-scoring.md` for the full BANT rubric and routing tiers.
