# Supabase CLI Reference

Local development uses the Supabase CLI with Docker Desktop. Migrations live in `supabase/migrations/`.

## Local stack lifecycle

| Goal | Command |
|------|---------|
| Start local stack | `supabase start` |
| Stop local stack | `supabase stop` |
| Check running services | `supabase status` |
| Wipe DB and re-apply all migrations | `supabase db reset` |

## Migrations

| Goal | Command |
|------|---------|
| Create a new migration file | `supabase migration new <name>` |
| Apply pending migrations to local DB | `supabase migration up` |
| List applied migrations | `supabase migration list` |
| Check local DB is in sync with migrations | `supabase db diff` |
| Push migrations to remote (staging/prod) | `supabase db push` |

**Rule:** Never edit an applied migration — always create a new one.

## Day-to-day diff workflow

Write a new migration, then verify it applies cleanly:

```bash
supabase db reset     # recreate DB from all migrations
supabase db diff      # should return "No schema changes found"
```

To capture changes made directly in Studio:

```bash
supabase db diff -f supabase/migrations/<timestamp>_<name>.sql
```

## Remote (Supabase cloud)

| Goal | Command |
|------|---------|
| Link to cloud project | `supabase link --project-ref <your-project-ref>` — ref is in `supabase/.temp/project-ref` |
| Push local migrations to cloud | `supabase db push` |
| Pull remote schema to local | `supabase db pull` |

## Useful extras

| Goal | Command |
|------|---------|
| Open local Studio | `open http://localhost:54323` |
| Tail DB logs | `supabase db logs` |
| Generate TypeScript types | `supabase gen types typescript --local > src/types/database.ts` |

## Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `connect ECONNREFUSED 127.0.0.1:54322` | Local stack not running | `supabase start` |
| `DROP TABLE` in diff output | Local DB out of sync with migrations | `supabase db reset` |
| `no files matched pattern: supabase/seed.sql` | No seed file — harmless | Create `supabase/seed.sql` if needed |
| Migrations in wrong directory | Files must be in `supabase/migrations/` not `database/migrations/` | Move files |
