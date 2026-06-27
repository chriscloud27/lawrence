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
│ Output: Raw JSON matching source format                             │
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
