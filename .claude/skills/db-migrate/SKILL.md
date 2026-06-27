---
name: db-migrate
description: Run pending Supabase database migrations. Shows diff first, confirms with user, then applies. Works on local or staging/production based on argument.
---

# DB Migrate

## Usage
```
/db-migrate              # Migrate local dev DB
/db-migrate staging      # Migrate staging
/db-migrate production   # Migrate production (requires extra confirmation)
```

## Steps

1. **Show pending migrations**
   ```bash
   supabase db diff --local
   ```
   List files in `database/migrations/` not yet applied.

2. **Confirm with user** before applying to staging or production.
   For production: explicitly ask "Type 'yes' to confirm production migration".

3. **Apply migrations**
   - Local: `supabase db push`
   - Staging: `supabase db push --db-url "$STAGING_DATABASE_URL"`
   - Production: `supabase db push --db-url "$PROD_DATABASE_URL"`

4. **Verify schema matches expected state**
   ```bash
   supabase db diff  # Should show no diff after applying
   ```

5. Report: which migrations were applied, tables affected, any errors.

## Safety Rules
- Never run production migrations without a confirmed backup timestamp
- If a migration fails midway, do NOT re-run — investigate the partial state first
- All migrations in `database/migrations/` must be idempotent (safe to describe but not auto-re-run)
