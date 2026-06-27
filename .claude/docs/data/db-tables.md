# Database Tables

This document describes the Supabase (PostgreSQL) table schemas.

**Important:** This is the authoritative source before writing a migration. After a migration is committed, the migration file becomes authoritative. Update this doc and the migration together.

## Table Template

For each new table, document:

```markdown
## {table_name}

**Purpose:** What does this table store?

**Primary key:** `id` (UUID, auto-generated)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | uuid_generate_v4() | |
| {field} | {type} | {YES/NO} | {default} | {constraints, FK references} |

### RLS Policies

- `SELECT`: [who can read]
- `INSERT`: [who can write]
- `UPDATE`: [who can modify]
- `DELETE`: [who can delete]

### Indexes

- `idx_{table_name}_{field}` on `{field}` for frequent filters

### Relationships

- Foreign keys to other tables
- Reverse references (tables that reference this one)

### Notes

Any pipeline-specific details, business logic, or gotchas.
```

## Example: articles

```markdown
## articles

**Purpose:** Canonical records of ingested news articles, blog posts, or similar content.

**Primary key:** `id` (UUID, auto-generated)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | uuid_generate_v4() | |
| source_id | VARCHAR(255) | NO | | Unique ID from external source (e.g., NewsAPI id) |
| title | TEXT | NO | | Article headline |
| body | TEXT | YES | NULL | Full article text or summary |
| url | VARCHAR(1024) | NO | | Canonical URL to article |
| published_at | TIMESTAMP | NO | | When the article was published (in source timezone) |
| extracted_at | TIMESTAMP | NO | NOW() | When lawrence extracted it |
| author | VARCHAR(255) | YES | NULL | Article author if available |
| category | VARCHAR(100) | YES | NULL | Classified by AI or manual tagging |
| summary | TEXT | YES | NULL | AI-generated summary (optional enrichment) |
| sentiment | VARCHAR(20) | YES | NULL | AI classification: positive, negative, neutral |
| created_at | TIMESTAMP | NO | NOW() | When row was created in lawrence |
| updated_at | TIMESTAMP | NO | NOW() | When row was last modified |

### RLS Policies

- `SELECT`: All authenticated users (pipeline reads its own rows)
- `INSERT`: Only n8n service account
- `UPDATE`: Only n8n service account (for enrichment updates)
- `DELETE`: Never allowed

### Indexes

- `idx_articles_source_id` on `source_id` — lookup by external source ID
- `idx_articles_published_at` on `published_at` — time range queries
- `idx_articles_url` on `url` — uniqueness check before insert

### Relationships

- Referenced by: `article_tags` (many-to-many)
- No foreign keys; `source_id` is a string identifier, not a table reference

### Notes

- `source_id` + `url` should be unique per source pipeline (handle in app, not DB constraint initially)
- `body` may be truncated by API; check source docs
- Timezone for `published_at` depends on source — document per source in `sources/*.md`
```

## Adding a New Table

1. Start here: write the template above for your new table
2. Reference the schema in `schemas/{entity}.md` — fields must match (type, nullable, default)
3. Create the migration: `database/migrations/TIMESTAMP_create_{table_name}.sql`
4. Update CLAUDE.md if it's a significant schema change (→ ADR?)
5. Run migration against staging before committing

See: `.claude/rules/database-migrations.md` for migration rules.
