# Pipeline Flow: Data Transformation Map

This document describes how data moves through the lawrence pipeline and which schemas apply at each stage.

## Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ External Source                                                      │
│ (API, RSS, CSV, Webhook)                                             │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                    See: sources/{name}.md
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ n8n Extract                                                          │
│ (HTTP Request, Parse, Map fields)                                    │
│                                                                      │
│ Output: Raw JSON matching source format                              │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Validation (Zod)                                                     │
│ - Type coercion                                                      │
│ - Required field checks                                              │
│ - Format validation (dates, URLs, emails)                            │
│                                                                      │
│ Output: Validated record matching schema                             │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                    See: schemas/{entity}.md
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Optional: AI Enrichment (OpenAI Agent)                               │
│ - Summarization                                                      │
│ - Classification                                                     │
│ - Entity extraction                                                  │
│                                                                      │
│ Output: Same schema + new enriched fields                            │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Store in Supabase                                                    │
│ - Insert into table matching schema                                  │
│ - Apply RLS policies                                                 │
│ - Trigger any post-insert hooks                                      │
│                                                                      │
│ Output: Persisted row in database                                    │
└──────────────────────────────────────────────────────────────────────┘
```

See: `db-tables.md` for Supabase schema

## Transformation Rules

- **Type coercion:** Always prefer stricter types downstream (e.g., `string` → `UUID`, `number` → `Decimal` for money)
- **Field mapping:** n8n mapper must clearly comment which source field → schema field
- **Null handling:** `sources/*.md` specifies nullable fields; validation enforces; DB schema matches
- **Immutability:** Once in Supabase, records should not be modified — create new rows for corrections

## Adding a New Pipeline

1. Create `sources/{source-name}.md` documenting the raw input shape
2. Create `schemas/{entity-name}.md` documenting the validated schema (same as Zod type)
3. Add transformation steps to this diagram (optional enrichment node)
4. Update `db-tables.md` with the Supabase table definition
5. Write the migration in `database/migrations/TIMESTAMP_*.sql`
6. Create the n8n workflow in `n8n/workflows/{action}-{source}.json`
7. Create the Zod schema in `src/schemas/{entity-name}.ts`
8. Create the OpenAI agent in `src/agents/{entity-name}-enricher.ts` (if enrichment needed)

See: `.claude/docs/pipeline-playbook.md` for detailed end-to-end guide.

---

## School Scrape Pipeline (Doris → Supabase)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Doris School Directory                                               │
│ https://www.doris.school/schools/{country}/{slug}                    │
│ See: sources/doris-school.md                                         │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTP GET (ETag / MD5 change detection)
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ n8n: scrape-doris-school workflow                                    │
│ - Pull URL from scrape_queue WHERE status = 'pending'                │
│ - If ETag/hash unchanged → skip, mark done                           │
│ - Truncate HTML to 12,000 chars                                      │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ raw HTML (truncated)
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ AI Extraction Agent (gpt-4o-mini, temperature 0)                     │
│ Prompt: src/agents/prompts/school-extraction.txt                     │
│ Output: { school, fees[], entry_points[] }                           │
│                                                                      │
│ If error = 'js_rendered' → route to headless browser fallback        │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ structured JSON
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Validation                                                           │
│ - extraction_confidence < 0.6 → scrape_status = 'needs_review'       │
│ - curricula / strengths / languages must match enums                 │
│   See: .claude/docs/data/schemas/schools-enums.json                  │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Supabase Insert                                                      │
│ - UPSERT schools ON CONFLICT (slug)                                  │
│ - INSERT school_fees (delete old rows for school first)              │
│ - INSERT school_entry_points (delete old rows for school first)      │
│ - UPDATE scrape_queue SET status = 'done', processed_at = NOW()      │
└──────────────────────────────────────────────────────────────────────┘
```

Sample output record: `.claude/docs/data/sample-records/st-edwards-school.json`
