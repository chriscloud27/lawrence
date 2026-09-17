# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Mode

When I say "build step N", read the file at
`.claude/docs/build-steps/NN-<name>.md` and execute it.

Two series live there:
- **01–09** — the v2 intake form and agency dashboard build.
- **10–16** — stack remediation and the local end-to-end build, from
  `.claude/docs/stack-audit.md`. The order encodes dependencies, not severity, and it is **not**
  numeric: run `10 → 11 → 12 → 15 → 13 → 14 → 16`. Step 15 lands the tenancy primitive that
  steps 13 and 14 both assume; step 12 must precede 14. The execution-order table in
  `stack-audit.md` is the reference. **10–15 are done; 16 is what remains.**

Before starting:
- Read the referenced files in the "Assumes" section
- Verify they exist and match the described state

After completing:
- Run through the "Verify" checklist at the bottom of the step file
- Report pass/fail for each item
- Do not proceed to the next step until all items pass

## Design System

All design tokens are defined in `.claude/DESIGN.md` and wired as Tailwind v4 utilities in
`src/Chatbot/app/globals.css`. Never invent new colors, fonts, or spacing values.
When the step file is silent on a detail, check `.claude/DESIGN.md` first.

## Rules

- One step per turn. Do not read ahead.
- Create files in the paths specified by each step.
- If a step says "create component X", check if X already exists first.
- If a verification item fails, fix it before reporting.

## Project

**lawrence** — data ingestion platform. Scrape, validate, AI-enrich, store.  
**Domain:** chat.mach2.cloud | **Stage:** prototype

**Stack:** Next.js 16 app (`src/Chatbot/`) · AI SDK v6 (Anthropic + OpenAI) · Supabase (PostgreSQL) · Inngest (durable steps) · Resend (email) · n8n (**ingestion only**) · Docker

**Two flows, and they are separate:**
- **Ingestion:** external source → n8n → validation → AI enrichment → Supabase
- **Conversation:** parent → `/api/chat` (streaming, TypeScript) → Inngest steps → Supabase → Admin

n8n orchestrated the chat until [ADR-0018](.claude/docs/adr/0018-chat-agent-in-typescript.md) moved
it into TypeScript. It keeps scheduled scraping and the ADR-0008 identity link, and nothing else.

## Architectural Principles

1. **Qualification by listening, not interrogation** — BANT signals harvested passively through empathetic conversation; one question per turn maximum; scoring hidden from parent.
2. **Two-stage scoring** — Stage 1: JS pre-qual (0–75 pts) → Stage 2: AI agent (35–50 band only) → refined score (0–100 pts) → routing tier.
3. **Architecture before implementation** — Discuss decisions first, validate against spec, then build. Open questions are blockers only.
4. **v1/v2 boundary is a scope guard** — Anything not in v1 spec (dashboard, retry logic, adaptive flow, multi-channel) is explicitly deferred to v2.
5. **Doris uses JSON-LD** — Structured data embedded in page `<head>`; no LLM extraction needed for v1.
6. **Intake method is a configurable peer surface, not a fixed product** — Chatbot and structured-form-with-upload are both front-ends producing the same `leads` shape; which one(s) an agency runs is a per-agency setting, not a code fork. Everything downstream (profile construction, BANT scoring, portal display) is intake-method-agnostic. See ADR-0010.

See `.claude/projects/.../memory/architectural-principles.md` for full rationale.

## Skills

- `/adr-new` — create a numbered ADR
- `/run-pipeline <name>` — trigger pipeline, tail logs, verify DB
- `/deploy-staging` — build, push, migrate, health-check
- `/db-migrate [staging|production]` — apply Supabase migrations
- `/feature-log add` / `/feature-log summary` — log completed feature requests, roll up into an executive summary

**Feature log:** after completing a feature request (not a trivial one-liner or pure discovery task), run `/feature-log add` to append an entry to `.claude/docs/feature-log.md`. Use judgment on what counts — a shipped feature, fix, or notable chore/refactor qualifies; mid-task edits, exploration, and plan iterations do not.

## ADRs

Records live in `.claude/docs/adr/`. Write one when choosing between technologies, establishing a pattern all future code must follow, or when the "why" would be opaque to a new contributor. Not for implementation details or bug fixes.

Status flow: `proposed` → `accepted` → `superseded by [ADR-XXXX]`. Never edit an accepted ADR.

## Security

**No secrets in files or AI context.** Read `.claude/rules/secrets.md` before any action involving credentials, API keys, tokens, or external service config.

Rules in brief:
- Never read, log, reference, or store values from `.env.local`, `.env`, or `supabase/.temp/`
- Never hardcode credentials, project refs, connection strings, or tokens in any committed file
- Credential reference pattern in config/code: `$env.VAR`, `env(VAR)`, or `${VAR}` — never inline
- Explicit user go-ahead required before accessing any credential file in this session

## AI Providers

Every LLM call goes through the seam at `src/Chatbot/lib/ai/provider.ts` — no provider package
import and no model ID anywhere else. Read `.claude/rules/ai-providers.md` before touching a model,
a prompt, or a routing decision; a routing change needs an eval run (`npx promptfoo eval`) and a
note in ADR-0015.

## Design System

The Lawrence Design System (`.claude/DESIGN.md`) is the source of truth for all UI work in `src/Chatbot/`. All colors map to Tailwind CSS palette families (no custom hex). Tokens are wired as Tailwind v4 utilities via `@theme` in `src/Chatbot/app/globals.css` (`bg-lw-accent`, `text-lw-text`, `rounded-lw-lg`, etc.). White-labeling an agency requires swapping one Tailwind color family in a marked block in `globals.css` — no hex editing. Read `.claude/rules/design.md` before writing or editing any component with visual styling — raw hex values and Tailwind default palette colors (`blue-600`, `gray-100`, …) are not allowed.

## Key Files

- `.claude/docs/adr/` — architecture decisions
- `.claude/docs/stack-audit.md` — **stack scorecard, cost model, and bundle comparison.** Read this
  before proposing, adding, or replacing any infrastructure, hosting, LLM provider, or library
  choice. It carries the verdict per layer and names which ADR settled or reopened each one.
- `.claude/docs/project-context.md` — customer, goals, constraints (fill in early)
- `.claude/docs/glossary.md` — domain terms
- `promptfooconfig.yaml` + `evals/` — BANT and persona eval harness; the gate on any model change
- `.claude/docs/pipeline-playbook.md` — how to add a pipeline end-to-end
- `.claude/docs/supabase-cli-reference.md` — Supabase CLI commands, diff workflow, common errors
- `.claude/docs/data/` — data schemas, source formats, pipeline field map, DB table specs
- `n8n/workflows/` — exported workflow JSON (committed). **Ingestion only** after ADR-0018:
  `scrape-doris-school.json` and `link-lead.json`. The two chat workflows are deleted; copies live
  in `.claude/docs/archive/n8n/` as the record of what was ported
- `supabase/migrations/` — Supabase migrations (timestamped SQL)
- `src/agents/prompts/` — system prompts as `.txt`. `evals/prompt.js` reads these same files, and
  `agent_config.system_prompt` is seeded from `parent-turn.txt` — **keep the file and the seeded row
  identical**. Staged into `src/Chatbot/.prompts/` at build time by `scripts/sync-prompts.mjs`
- `src/Chatbot/` — Next.js 16 + React 19 app: parent-facing chat widget, marketing page, schools
  directory, **and the agency dashboard** (`app/(admin)/`, folded in by build step 13). Ships
  `@supabase/supabase-js` + `@supabase/ssr`, the AI SDK (`ai` v6 + `@ai-sdk/*`), Zod v4 and
  Tailwind v4 — **no ORM installed**
- `src/Chatbot/app/(admin)/` — counsellor-facing route group behind an auth + agency-membership
  gate. Reads real `leads` / `messages` rows through RLS (ADR-0016); read-only until build step 14
- `src/Chatbot/lib/` — Supabase clients (`supabase-server.ts` exports the anon singleton and the
  cookie-bound `getSupabaseRequestClient`; `supabase-browser.ts`; `supabase-admin.ts` is the
  **service-role** client and is the only file that bypasses RLS), `bant/` (the two-stage scoring
  engine, with tests), `agent-config.ts` (the active prompt and thresholds), `ai/` (the provider
  seam and the agent's tools), `leads.ts` (counsellor reads), `score.ts` (display bands),
  `notify.ts` (Resend), session state, schools queries
- `src/Chatbot/inngest/` — durable write path: scoring, the `leads` upsert, the `messages` insert,
  and the hot-lead email, each a separately retried step
- `src/Chatbot/app/api/chat/` — the parent-facing agent. Streams plain text; no score, tier, or
  breakdown ever appears in the response
- `src/Landing/` — Next.js 16 marketing site (MDX, next-intl, Tailwind v3.4, Zod v3), static export
  to GitHub Pages
- `.env.example` — all required env vars
- `.claude/DESIGN.md` — Lawrence Design System (Tailwind-only colors, typography, spacing, components)
- `src/Chatbot/app/globals.css` — Tailwind v4 `@theme` wiring of `lw-*` design tokens (source of runtime implementation)
