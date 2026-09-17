-- ============================================================
-- Agency tenancy for the app-owned tables (build step 15).
--
-- Adds the tenant primitive (`agencies`, `agency_members`), tenants `leads`,
-- and makes isolation an RLS policy rather than a filter every future query
-- has to remember.
--
-- Scope: app side only. The school directory (`schools`, `school_fees`,
-- `school_entry_points`, `scrape_queue`) is a shared public catalogue and stays
-- agency-agnostic per ADR-0005.
--
-- `messages` deliberately gets no `agency_id`: its tenancy derives through
-- `lead_id`, mirroring `messages_owner_select`. Two copies of the tenant can
-- disagree and nothing in the schema would notice.
-- ============================================================

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agencies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  -- ADR-0010: intake method is a per-agency setting, never a code fork.
  intake_method TEXT NOT NULL DEFAULT 'chatbot'
                CHECK (intake_method IN ('chatbot','form','both')),
  -- The single white-label axis (.claude/rules/design.md § White-Label):
  -- a Tailwind colour family name ('blue', 'emerald', ...), never a hex value.
  accent_family TEXT NOT NULL DEFAULT 'blue',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS agency_members (
  agency_id  UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('owner','counsellor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agency_id, user_id)
);

ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- leads: tenant + intake tag
--
-- agency_id is nullable here on purpose. Adding NOT NULL without a default
-- against a populated table fails outright; the backfill migration that
-- follows sets it (.claude/rules/database-migrations.md).
-- ------------------------------------------------------------

ALTER TABLE leads ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- ADR-0010's intake tag. Ships now, with the chatbot as the only producer, so
-- the v2 form path is an INSERT rather than a migration against live rows.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'chatbot';

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check CHECK (source IN ('chatbot','form'));

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------

-- Every RLS check below runs this lookup.
CREATE INDEX IF NOT EXISTS idx_agency_members_user ON agency_members(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_agency ON leads(agency_id);
-- The Admin list's default ordering.
CREATE INDEX IF NOT EXISTS idx_leads_agency_score ON leads(agency_id, score DESC);

-- ------------------------------------------------------------
-- RLS — counsellor side
--
-- The parent-facing policies (leads_owner_select, messages_owner_select) are
-- left untouched: a table may carry several SELECT policies and Postgres ORs
-- them, so the ADR-0009 recap read path keeps working unchanged.
--
-- Membership subquery, not a JWT claim: a claim is a snapshot, so revoking a
-- counsellor leaves their existing token working until it refreshes. The
-- subquery is evaluated per statement and is always current.
-- ------------------------------------------------------------

-- A policy that subqueries `agency_members` re-triggers `agency_members`'s own
-- policy, which Postgres rejects as "infinite recursion detected in policy for
-- relation agency_members". The membership lookup therefore lives in one
-- SECURITY DEFINER function, which runs as the owner and so is not re-filtered.
-- It is also the single place the tenant of the current request is defined.
CREATE OR REPLACE FUNCTION current_agency_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION current_agency_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_agency_ids() TO authenticated;

CREATE POLICY leads_agency_select ON leads FOR SELECT USING (
  agency_id IN (SELECT current_agency_ids())
);

-- WITH CHECK as well as USING: without it a counsellor could update a row they
-- can see *into* another agency. USING filters what is visible; WITH CHECK
-- constrains what the row may become.
CREATE POLICY leads_agency_update ON leads FOR UPDATE USING (
  agency_id IN (SELECT current_agency_ids())
) WITH CHECK (
  agency_id IN (SELECT current_agency_ids())
);

CREATE POLICY messages_agency_select ON messages FOR SELECT USING (
  lead_id IN (SELECT id FROM leads WHERE agency_id IN (SELECT current_agency_ids()))
);

CREATE POLICY agencies_member_select ON agencies FOR SELECT USING (
  id IN (SELECT current_agency_ids())
);

CREATE POLICY agency_members_self_select ON agency_members FOR SELECT USING (
  agency_id IN (SELECT current_agency_ids())
);

-- No INSERT/DELETE policy for anon or authenticated. The ingest write path stays
-- service_role-only (n8n today, step 14 after), which bypasses RLS.

-- ------------------------------------------------------------
-- Grants
--
-- config.toml leaves auto_expose_new_tables unset, so new tables are not
-- reachable through the Data API roles without an explicit GRANT (same reason
-- as 20260816130000_grant_schools_chatbot_base_table_select.sql). RLS above is
-- what actually scopes the rows.
-- ------------------------------------------------------------

GRANT SELECT ON agencies TO authenticated;
GRANT SELECT ON agency_members TO authenticated;
GRANT SELECT, UPDATE ON leads TO authenticated;
GRANT SELECT ON messages TO authenticated;

-- ------------------------------------------------------------
-- Reference data
--
-- The two agencies are inserted here, not in the seed: the backfill migration
-- that follows needs them, and `supabase db reset` replays migrations *before*
-- seeds. Agencies are reference data in this prototype, not fixtures.
-- rival-agency exists so cross-tenant isolation can be tested rather than
-- assumed.
-- ------------------------------------------------------------

INSERT INTO agencies (slug, name, intake_method, accent_family) VALUES
  ('demo-agency',  'Demo Education Consultants',  'chatbot', 'blue'),
  ('rival-agency', 'Rival Admissions Advisory',   'chatbot', 'emerald')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Down migration:
-- REVOKE SELECT ON messages FROM authenticated;
-- REVOKE SELECT, UPDATE ON leads FROM authenticated;
-- REVOKE SELECT ON agency_members FROM authenticated;
-- REVOKE SELECT ON agencies FROM authenticated;
-- DROP POLICY IF EXISTS agency_members_self_select ON agency_members;
-- DROP POLICY IF EXISTS agencies_member_select ON agencies;
-- DROP POLICY IF EXISTS messages_agency_select ON messages;
-- DROP POLICY IF EXISTS leads_agency_update ON leads;
-- DROP POLICY IF EXISTS leads_agency_select ON leads;
-- DROP FUNCTION IF EXISTS current_agency_ids();
-- DROP INDEX IF EXISTS idx_leads_agency_score;
-- DROP INDEX IF EXISTS idx_leads_agency;
-- DROP INDEX IF EXISTS idx_agency_members_user;
-- ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
-- ALTER TABLE leads DROP COLUMN IF EXISTS source;
-- ALTER TABLE leads DROP COLUMN IF EXISTS agency_id;
-- DROP TABLE IF EXISTS agency_members;
-- DROP TABLE IF EXISTS agencies;
-- ============================================================
