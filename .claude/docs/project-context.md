# Project Context

## What is Lawrence?

Lawrence is a data ingestion platform that scrapes, validates, AI-enriches, and stores structured school data for external clients. It pulls school profiles from the Doris international school directory, extracts structured data via an OpenAI agent, and persists it to Supabase — where a Next.js chatbot (`src/Chatbot/`) surfaces the data to end-users as a conversational school-search experience.

**Domain:** chat.mach2.cloud  
**Stage:** Prototype

## Customer

External clients and their end-users: families searching for international schools. The chatbot (`src/Chatbot/`) is the primary consumer of the ingested data. It allows users to query schools by budget, curriculum, location, age range, and admissions windows.

## Background & Goals

**Problem:** There is no structured, queryable dataset of international school profiles — fees, curricula, admissions windows — accessible to families via a conversational interface.

**What Lawrence does:** Automates the scraping and structuring of school data at scale so the chatbot can answer real questions (e.g. "IB schools in London under £30k/year with boarding").

**Prototype goal:** End-to-end pipeline running — scrape → extract → store → query via chatbot — with real school data for a demo-able slice of schools.

**Success looks like:**
- Scrape queue processes a batch of schools without manual intervention
- Chatbot answers school-search queries from live Supabase data
- Extraction confidence consistently above 0.6 (auto-flagging low-confidence records)

## Current Scope

**Active pipeline:** Doris School Directory → Supabase (`schools`, `school_fees`, `school_entry_points`)

- Source: `https://www.doris.school/schools/{country}/{slug}`
- Extraction: `gpt-4o-mini` at temperature 0 via `src/agents/prompts/school-extraction.txt`
- Target: ~1,000+ schools, ~5–15 fee rows and ~1–5 entry point rows each
- Change detection: ETag / MD5 hash — only re-scrapes changed pages
- Weekly delta cost: ~$0.10–0.30 (gpt-4o-mini)

## Architecture Overview

```
Doris School Directory
        │
        ▼
n8n: scrape-doris-school workflow
  - Pulls URLs from scrape_queue WHERE status = 'pending'
  - ETag / MD5 change detection (skip unchanged pages)
  - Truncates HTML to ~12,000 chars
        │
        ▼
AI Extraction Agent (gpt-4o-mini, temp 0)
  - Output: { school, fees[], entry_points[] }
  - js_rendered error → headless browser fallback queue
        │
        ▼
Validation (Zod)
  - Confidence < 0.6 → scrape_status = 'needs_review'
  - curricula / strengths / languages validated against enums
        │
        ▼
Supabase (PostgreSQL)
  - UPSERT schools ON CONFLICT (slug)
  - DELETE + INSERT school_fees, school_entry_points
  - UPDATE scrape_queue SET status = 'done'
        │
        ▼
Next.js Chatbot (src/Chatbot/)
  - Anthropic SDK + Drizzle ORM
  - Reads from Supabase; answers school-search queries
```

Full pipeline details: `.claude/docs/data/pipeline-flow.md`  
Table schemas: `.claude/docs/data/db-tables.md`  
How to add a pipeline: `.claude/docs/pipeline-playbook.md`

## Constraints & Trade-offs

| Constraint | Decision |
|---|---|
| **Timeline** | Prototype speed is the priority. Defer hardening, observability, and polish. |
| **Cost** | Default to `gpt-4o-mini` for extraction. Use `gpt-4o` only if extraction quality is demonstrably insufficient. |
| **Data quality** | Low-confidence extractions (`< 0.6`) are flagged `needs_review` rather than rejected — keeps pipeline moving while allowing manual correction. |
| **Immutability** | Records are not updated in-place; new scrape runs upsert on `slug` and delete/re-insert child rows (`school_fees`, `school_entry_points`). |

## Stakeholders

| Role | Person |
|---|---|
| Owner / builder | Chris (chrisallin24@gmail.com) |
| External clients | TBD — fill in when onboarded |

## Open Questions

- Who are the first external clients? What slice of the Doris catalog do they need first?
- Headless browser fallback: build in-house or use a service (e.g. Browserless, Apify)?
- Is there a target SLA for how fresh the school data needs to be (daily / weekly / on-demand)?
- Document-extraction pipeline design (v2 form intake) — model choice, batch vs. real-time,
  storage bucket layout — needs its own ADR once `intake_documents` schema is drafted (see
  ADR-0010, "explicitly deferred").

**Resolved:** Chatbot auth model — Supabase Auth (Google, extending to Apple + email per
ADR-0010), nullable `leads.user_id` bridge, established in ADR-0008/0009/0010.

## v2 Pivot (September 2026)

Intake is now a per-agency configurable choice between the chatbot (above) and a structured
intake form with multi-modal document upload (voice notes, PDFs, screenshots) — both feed the
same downstream profile-construction and BANT-scoring pipeline. See `v2/lawrence-problem-solution-v2.md`
for the product framing and ADR-0010 for the architectural decision.
