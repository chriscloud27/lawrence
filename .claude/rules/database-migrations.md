---
description: Rules for Supabase database migrations in database/migrations/
globs: ["database/migrations/**/*.sql"]
---

# Database Migration Rules

## File Naming
- Format: `{timestamp}_{description}.sql` → `20240101_create_pipeline_runs.sql`
- Always use UTC timestamps, never relative dates

## Migration Safety
- Every migration must be reversible — include a `-- Down migration:` comment block
- Never DROP columns in the same migration that removes references to them
- Add NOT NULL columns only with a DEFAULT value, or as a two-step migration

## Supabase-Specific
- Use Row Level Security (RLS) for all tables that contain user or pipeline data
- Enable RLS immediately after table creation: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
- Prefer Supabase built-in `uuid_generate_v4()` for primary keys

## Testing
- Run `supabase db diff` before committing to confirm the migration matches intent
- Test rollback with `supabase db reset` on a local instance before pushing
