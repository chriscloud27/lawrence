# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Mode

When I say "build step N", read the file at
`.claude/docs/build-steps/0N-<name>.md` and execute it.

Before starting:
- Read the referenced files in the "Assumes" section
- Verify they exist and match the described state

After completing:
- Run through the "Verify" checklist at the bottom of the step file
- Report pass/fail for each item
- Do not proceed to the next step until all items pass

## Design System

All design tokens are defined in `src/styles/design-tokens.css`.
Never invent new colors, fonts, or spacing values.
When the step file is silent on a detail, check `.claude/DESIGN.md` first.

## Rules

- One step per turn. Do not read ahead.
- Create files in the paths specified by each step.
- If a step says "create component X", check if X already exists first.
- If a verification item fails, fix it before reporting.

## Project

**lawrence** — data ingestion platform. Scrape, validate, AI-enrich, store.  
**Domain:** chat.mach2.cloud | **Stage:** prototype

**Stack:** n8n (orchestration MVP) · OpenAI (enrichment) · Supabase (PostgreSQL) · Docker · Node.js/TypeScript · Next.js chatbot (`src/Chatbot/`)

**Pipeline flow:** External source → n8n → validation → AI agent (optional) → Supabase → Chatbot (read)

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

## Design System

The Lawrence Design System (`.claude/DESIGN.md`) is the source of truth for all UI work in `src/Chatbot/`. All colors map to Tailwind CSS palette families (no custom hex). Tokens are wired as Tailwind v4 utilities via `@theme` in `src/Chatbot/app/globals.css` (`bg-lw-accent`, `text-lw-text`, `rounded-lw-lg`, etc.). White-labeling an agency requires swapping one Tailwind color family in a marked block in `globals.css` — no hex editing. Read `.claude/rules/design.md` before writing or editing any component with visual styling — raw hex values and Tailwind default palette colors (`blue-600`, `gray-100`, …) are not allowed.

## Key Files

- `.claude/docs/adr/` — architecture decisions
- `.claude/docs/project-context.md` — customer, goals, constraints (fill in early)
- `.claude/docs/glossary.md` — domain terms
- `.claude/docs/pipeline-playbook.md` — how to add a pipeline end-to-end
- `.claude/docs/supabase-cli-reference.md` — Supabase CLI commands, diff workflow, common errors
- `.claude/docs/data/` — data schemas, source formats, pipeline field map, DB table specs
- `n8n/workflows/` — exported workflow JSON (committed)
- `supabase/migrations/` — Supabase migrations (timestamped SQL)
- `src/agents/` — OpenAI agent functions
- `src/Chatbot/` — Next.js chatbot; Anthropic SDK, Drizzle ORM, shadcn/ui
- `src/Chatbot/db/` — Drizzle schema + local SQLite helpers
- `src/Chatbot/lib/` — Supabase client, Anthropic client, business logic
- `.env.example` — all required env vars
- `.claude/DESIGN.md` — Lawrence Design System (Tailwind-only colors, typography, spacing, components)
- `src/Chatbot/app/globals.css` — Tailwind v4 `@theme` wiring of `lw-*` design tokens (source of runtime implementation)
