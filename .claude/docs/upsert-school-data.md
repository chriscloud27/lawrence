# Upserting School Data (`scripts/upsert-schools.mjs`)

## What it does

Reads Doris JSON-LD from `.claude/docs/data/sources/html-saved/*.html` (see
`doris-school.md` / architectural principle #5 — no LLM extraction needed for
Doris sources) and upserts rows into `schools` + `school_fees` /
`school_entry_points` via the Supabase service-role key.

```bash
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/upsert-schools.mjs [--yes]
```

## `scrape_status` is always `needs_review` — there is no promotion step

`toSchoolRow()` (`scripts/upsert-schools.mjs:79`) hardcodes
`scrape_status: 'needs_review'` on every upsert, because raw JSON-LD can't
supply fields like `curricula`, `strengths`, `sen_support` — those are left at
column defaults and need a human to fill them in before the record is
trustworthy.

**Nothing in the codebase currently promotes a row from `needs_review` to
`ok`.** This is a *different* `scrape_status` path than the one documented in
`.claude/docs/data/pipeline-flow.md` and `project-context.md` (LLM
`extraction_confidence < 0.6` → `needs_review`, for the n8n/AI-enrichment
pipeline) — that path also has no promotion step, but at least a human
reviewing low-confidence extractions is the implied next action. The Doris
script has no equivalent review UI or flag-flip script at all.

This matters because `schools_chatbot`
(`supabase/migrations/20260702120000_create_schools_chatbot_view.sql:58`)
filters on `WHERE s.scrape_status = 'ok'` — any school stuck in
`needs_review` is silently invisible on `/schools`, with no error anywhere in
the request path. If most/all schools you upsert don't show up on the
chatbot's school list, this is why.

## Approving a row for now (manual)

Until a real review step exists, flip the row directly:

```sql
UPDATE schools SET scrape_status = 'ok' WHERE slug = '<slug>';
```

## Open follow-up

A real review/approval step (UI, script, or n8n node) that promotes
`needs_review` → `ok` after a human checks the missing fields is still
undesigned. Until then, treat any `ok` flip as a manual, ad hoc action — don't
assume it happens automatically anywhere in the pipeline.
