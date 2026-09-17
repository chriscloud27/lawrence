-- ============================================================
-- Backfill leads.agency_id and make it NOT NULL (build step 15, part 2).
--
-- Separate file on purpose: .claude/rules/database-migrations.md — "Add NOT NULL
-- columns only with a DEFAULT value, or as a two-step migration". Doing this in
-- the previous migration would take an ACCESS EXCLUSIVE lock and fail on any
-- pre-existing row.
--
-- The demo agency is the only tenant that exists when this runs, so every lead
-- written before tenancy belongs to it.
-- ============================================================

UPDATE leads
SET agency_id = (SELECT id FROM agencies WHERE slug = 'demo-agency')
WHERE agency_id IS NULL;

ALTER TABLE leads ALTER COLUMN agency_id SET NOT NULL;

-- ============================================================
-- Down migration:
-- ALTER TABLE leads ALTER COLUMN agency_id DROP NOT NULL;
-- (the backfilled values are left in place; the column itself is dropped by the
--  down migration of 20260915071821_add_agency_tenancy.sql)
-- ============================================================
