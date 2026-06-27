# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**lawrence** — data ingestion platform. Scrape, validate, AI-enrich, store.  
**Domain:** chat.mach2.cloud | **Stage:** prototype

**Stack:** n8n (orchestration MVP) · OpenAI (enrichment) · Supabase (PostgreSQL) · Docker · Node.js/TypeScript

**Pipeline flow:** External source → n8n → validation → AI agent (optional) → Supabase

## Skills

- `/adr-new` — create a numbered ADR
- `/run-pipeline <name>` — trigger pipeline, tail logs, verify DB
- `/deploy-staging` — build, push, migrate, health-check
- `/db-migrate [staging|production]` — apply Supabase migrations

## ADRs

Records live in `.claude/docs/adr/`. Write one when choosing between technologies, establishing a pattern all future code must follow, or when the "why" would be opaque to a new contributor. Not for implementation details or bug fixes.

Status flow: `proposed` → `accepted` → `superseded by [ADR-XXXX]`. Never edit an accepted ADR.

## Key Files

- `.claude/docs/adr/` — architecture decisions
- `.claude/docs/project-context.md` — customer, goals, constraints (fill in early)
- `.claude/docs/glossary.md` — domain terms
- `.claude/docs/pipeline-playbook.md` — how to add a pipeline end-to-end
- `.claude/docs/data/` — data schemas, source formats, pipeline field map, DB table specs
- `n8n/workflows/` — exported workflow JSON (committed)
- `database/migrations/` — Supabase migrations (timestamped SQL)
- `src/agents/` — OpenAI agent functions
- `.env.example` — all required env vars
