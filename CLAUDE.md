# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
