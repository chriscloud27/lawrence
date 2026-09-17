-- ============================================================
-- Hosted: link your counsellor login to an agency.
--
-- This is the ONLY step that cannot be done from the CLI, because it needs an
-- `auth.users` row and creating one means setting a password. That is yours to
-- do and must not pass through a script or an AI context
-- (.claude/rules/secrets.md).
--
-- Everything else is already applied to the hosted project:
--   * schema  — `supabase db push`              (9 migrations, in sync)
--   * agencies — reference data inside 20260915071821_add_agency_tenancy.sql
--   * demo leads + transcripts — `supabase db push --include-seed`
--
-- HOW TO RUN
--   1. Supabase dashboard -> Authentication -> Users -> Add user.
--      Use your own email. Tick "Auto Confirm User" — hosted projects require
--      email confirmation and sign-in fails silently without it.
--   2. Dashboard -> SQL Editor -> paste this file -> edit the marked line -> Run.
--
-- Idempotent. Safe to re-run.
-- ============================================================

INSERT INTO agency_members (agency_id, user_id, role)
SELECT a.id, u.id, 'owner'
FROM agencies a
CROSS JOIN auth.users u
WHERE a.slug = 'demo-agency'
  AND lower(u.email) = lower('chrisallin24@gmail.com')   -- <<< EDIT THIS
ON CONFLICT (agency_id, user_id) DO NOTHING;

-- Fail loudly rather than leaving you staring at an empty dashboard.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM agency_members) THEN
    RAISE EXCEPTION
      'No agency_members row created — the email above matches no row in Authentication -> Users.';
  END IF;
END $$;

-- Confirm what you can now see. Expect 6 demo-agency leads.
-- The 2 rival-agency leads must NOT appear: that is tenant isolation working,
-- and it is the one check that proves RLS rather than assuming it.
SELECT a.slug, count(l.id) AS leads_visible_to_you
FROM agencies a
JOIN agency_members m ON m.agency_id = a.id
LEFT JOIN leads l ON l.agency_id = a.id
GROUP BY a.slug;

-- ------------------------------------------------------------
-- TEARDOWN — removes every synthetic demo row, leaves your agency,
-- your membership and any real leads untouched.
-- ------------------------------------------------------------
-- DELETE FROM messages WHERE lead_id LIKE 'seed-%';
-- DELETE FROM leads    WHERE id      LIKE 'seed-%';
