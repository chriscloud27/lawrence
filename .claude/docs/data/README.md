# Data Structure Reference

This directory documents the data structures and schemas across the lawrence pipeline.

## Overview

- **`sources/`** — Raw input formats from external sources (API responses, CSV fields, webhook payloads)
- **`schemas/`** — Canonical validated schemas (what we expect after validation passes)
- **`pipeline-flow.md`** — Transformation map from external source → our schema → Supabase columns
- **`db-tables.md`** — Supabase table definitions, RLS policies, and field types

## How to Use

1. **Documenting a new data source:** Create `sources/{source-name}.md` with the raw input shape
2. **Defining a new entity:** Create `schemas/{entity-name}.md` with the validated canonical schema
3. **Mapping the flow:** Add the transformation steps to `pipeline-flow.md`
4. **Planning the database:** Update `db-tables.md` before writing the migration

## Pipeline Shape

```
External Source → n8n Extract → Validate (Zod) → Enrich (OpenAI) → Supabase
                 [sources/]    [schemas/]       [optional]        [db-tables.md]
```

Each step is documented in its respective file.
