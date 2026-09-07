# Chatbot Rules

## Overview
Next.js 16 app (`src/Chatbot/`) — frontend for querying data stored in Supabase via n8n pipelines.
Uses Anthropic SDK for AI responses, Drizzle ORM + better-sqlite3 for local state, shadcn/ui + Tailwind for UI.

## Intake Method (v2)

Per ADR-0010, the chatbot is one of two peer intake front-ends — the other is a structured
intake form with document upload. Which one(s) an agency runs is a per-agency
`intake_method` setting (`chatbot` | `form` | `both`), never a per-agency code fork. Both write
into the same `leads` row shape (tagged with a `source` column) and feed the same downstream
BANT scoring and profile construction — do not build chatbot-only assumptions into that shared
pipeline. The chatbot's read-only-from-Supabase / writes-via-n8n rule below applies identically
to the form intake path.

## Model Selection
- Default to `claude-haiku-4-5` for fast, cheap chat turns
- Use `claude-sonnet-4-6` only when reasoning over complex query results requires it
- Always declare the model as a named constant at the top of the file — never inline in the API call

## Drizzle / SQLite
- Schema lives in `src/Chatbot/db/` — one file per logical domain
- Run `npm run seed` to populate local dev data; do not commit the generated `.db` file
- Migrations: use `drizzle-kit generate` → commit the SQL → apply on startup or via seed script
- Never write raw SQL strings outside of Drizzle query builders

## Supabase Integration
- Read from Supabase via the shared Supabase client — do not create a second client instance
- All Supabase calls are read-only from the chatbot; writes go through n8n pipelines only
- Use environment variable `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

## Next.js Conventions
- This version (16.x) has breaking changes — read `node_modules/next/dist/docs/` before editing routing or server actions
- Use App Router (`src/Chatbot/app/`) — no Pages Router
- Server Components by default; add `"use client"` only when browser APIs or state are required
- API routes live in `app/api/` — keep them thin, delegate logic to `lib/`

## Environment Variables
- Document all required vars in `.env.example` at repo root
- Never access `process.env` directly in components — wrap in `src/Chatbot/lib/env.ts`

## Structure
- `app/` — routes and layouts
- `components/` — shared UI components (shadcn-based)
- `lib/` — business logic, Supabase client, Anthropic client
- `db/` — Drizzle schema and local SQLite helpers
- `scripts/` — one-off scripts (seed, migrations); not imported by app code

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

The AI agent produces two outputs per turn:
1. **Conversational reply** — warm, contextual, one follow-up question
2. **Hidden JSON BANT delta block** — structured scoring update (0–25 per dimension)

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

A downstream JavaScript Code node parses this delta, accumulates cumulative score, and triggers routing decisions.

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
