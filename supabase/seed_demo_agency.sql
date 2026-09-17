-- ============================================================
-- Demo fixtures for local development (build step 15).
--
-- The Admin views (step 13) need rows to render before the TypeScript write
-- path exists (step 14). Two tenants, because cross-agency isolation is the
-- only check that proves RLS rather than assuming it.
--
-- The `agencies` rows themselves are reference data and live in
-- 20260915071821_add_agency_tenancy.sql — `supabase db reset` replays
-- migrations before seeds, and the backfill migration needs them.
--
-- Everything here is synthetic. No real parent data, no user UUIDs, no
-- credentials — ever — in a committed file (.claude/rules/secrets.md).
-- Re-runnable: every insert is ON CONFLICT DO NOTHING.
-- ============================================================

-- ------------------------------------------------------------
-- Leads — demo-agency: two cold (<50), two warm (50–75), two hot (>75)
-- ------------------------------------------------------------

INSERT INTO leads (
  id, session_id, agency_id, source, status, classification, score, score_breakdown,
  captured_name, captured_email, location, timeline, forcing_function,
  child_age, current_school, curriculum, budget_range_usd
)
SELECT v.id, v.id, a.id, 'chatbot', v.status, v.classification, v.score, v.breakdown::jsonb,
       v.name, v.email, v.location, v.timeline, v.forcing, v.age, v.school, v.curriculum, v.budget
FROM agencies a, (VALUES
  ('seed-demo-001', 'new',       'cold', 28,
   '{"timeline":8,"budget":15,"authority":5}',
   'Ama Boateng',     'ama.boateng@example.test',     'Accra',      'exploring',
   NULL, 11, 'Local primary', 'IGCSE', NULL),

  ('seed-demo-002', 'nurture',   'cold', 41,
   '{"timeline":12,"budget":18,"authority":11}',
   'Piotr Nowak',     'piotr.nowak@example.test',     'Warsaw',     'next year',
   NULL, 13, 'State gymnasium', 'IB', '20000-30000'),

  ('seed-demo-003', 'new',       'warm', 58,
   '{"timeline":18,"budget":22,"authority":18,"need":12}',
   'Renu Shah',       'renu.shah@example.test',       'Dubai',      '3 months',
   'Relocation', 14, 'International school', 'IGCSE', '30000-45000'),

  ('seed-demo-004', 'contacted', 'warm', 69,
   '{"timeline":20,"budget":20,"authority":18,"need":11}',
   'Hugo Marchand',   'hugo.marchand@example.test',   'Geneva',     'next term',
   'Exam timing', 15, 'Private day school', 'A-Level', '45000-60000'),

  ('seed-demo-005', 'booked',    'hot',  84,
   '{"timeline":24,"budget":24,"authority":22,"need":14}',
   'Mei-Ling Chan',   'meiling.chan@example.test',    'Hong Kong',  'September',
   'Relocation deadline', 12, 'Local international', 'IB', '60000+'),

  ('seed-demo-006', 'contacted', 'hot',  91,
   '{"timeline":25,"budget":25,"authority":24,"need":17}',
   'Olivia Hartley',  'olivia.hartley@example.test',  'London',     'urgent',
   'Boarding place for January entry', 13, 'Prep school', 'GCSE', '60000+')
) AS v(id, status, classification, score, breakdown, name, email, location, timeline,
       forcing, age, school, curriculum, budget)
WHERE a.slug = 'demo-agency'
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Leads — rival-agency: the rows the demo counsellor must NOT see
-- ------------------------------------------------------------

INSERT INTO leads (
  id, session_id, agency_id, source, status, classification, score, score_breakdown,
  captured_name, captured_email, location, timeline, child_age, curriculum, budget_range_usd
)
SELECT v.id, v.id, a.id, 'chatbot', 'new', v.classification, v.score, v.breakdown::jsonb,
       v.name, v.email, v.location, v.timeline, v.age, v.curriculum, v.budget
FROM agencies a, (VALUES
  ('seed-rival-001', 'hot',  88,
   '{"timeline":25,"budget":24,"authority":23,"need":16}',
   'Sofia Duarte',  'sofia.duarte@example.test',  'Lisbon',   'urgent',    14, 'IB',    '60000+'),

  ('seed-rival-002', 'cold', 33,
   '{"timeline":10,"budget":16,"authority":7}',
   'Daniel Okafor', 'daniel.okafor@example.test', 'Lagos',    'exploring', 10, 'IGCSE', NULL)
) AS v(id, classification, score, breakdown, name, email, location, timeline, age, curriculum, budget)
WHERE a.slug = 'rival-agency'
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Messages — a short transcript per lead
-- ------------------------------------------------------------

INSERT INTO messages (id, lead_id, role, content)
SELECT v.id, v.lead_id, v.role, v.content
FROM (VALUES
  ('seed-demo-001-m1', 'seed-demo-001', 'user',      'Hi, just starting to look into schools for my son.'),
  ('seed-demo-001-m2', 'seed-demo-001', 'assistant', 'Of course — early is a good time to look. What''s prompting the search at the moment?'),
  ('seed-demo-001-m3', 'seed-demo-001', 'user',      'Nothing urgent, we''re a couple of years out really.'),

  ('seed-demo-002-m1', 'seed-demo-002', 'user',      'We are considering an IB school for next year.'),
  ('seed-demo-002-m2', 'seed-demo-002', 'assistant', 'That gives you a comfortable runway. What is drawing you to the IB specifically?'),
  ('seed-demo-002-m3', 'seed-demo-002', 'user',      'My wife studied it. We have not decided anything yet though.'),

  ('seed-demo-003-m1', 'seed-demo-003', 'user',      'We are relocating to Dubai in about three months and need a school place.'),
  ('seed-demo-003-m2', 'seed-demo-003', 'assistant', 'Three months with a move in the middle is a lot to hold at once. Is your daughter mid-IGCSE?'),
  ('seed-demo-003-m3', 'seed-demo-003', 'user',      'Yes, she is in her first IGCSE year. My husband and I are deciding together.'),

  ('seed-demo-004-m1', 'seed-demo-004', 'user',      'Looking for A-level support before the next term starts.'),
  ('seed-demo-004-m2', 'seed-demo-004', 'assistant', 'Next term is a clear marker to work back from. Which subjects are the pressure points?'),
  ('seed-demo-004-m3', 'seed-demo-004', 'user',      'Maths and physics. We can invest properly in the right place.'),

  ('seed-demo-005-m1', 'seed-demo-005', 'user',      'We move to Hong Kong in September and need an IB place for our son.'),
  ('seed-demo-005-m2', 'seed-demo-005', 'assistant', 'September is tight for an IB entry — that shapes which schools are realistic. Are you leading the search?'),
  ('seed-demo-005-m3', 'seed-demo-005', 'user',      'I am, yes. Budget is not the constraint, timing is.'),

  ('seed-demo-006-m1', 'seed-demo-006', 'user',      'We need a boarding place for January entry, quite urgently.'),
  ('seed-demo-006-m2', 'seed-demo-006', 'assistant', 'January entry narrows things considerably. What has made the move necessary now?'),
  ('seed-demo-006-m3', 'seed-demo-006', 'user',      'A work posting abroad. I make the decision and we are ready to move on it.'),

  ('seed-rival-001-m1', 'seed-rival-001', 'user',      'We need a place for our daughter as soon as possible.'),
  ('seed-rival-001-m2', 'seed-rival-001', 'assistant', 'Understood. What is the driver behind the timing?'),

  ('seed-rival-002-m1', 'seed-rival-002', 'user',      'Just browsing options for IGCSE.'),
  ('seed-rival-002-m2', 'seed-rival-002', 'assistant', 'Happy to help you get oriented. What matters most to you in a school?')
) AS v(id, lead_id, role, content)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Counsellor membership
--
-- `agency_members.user_id` references auth.users, which this file must not
-- fabricate — creating the users is an auth-API operation, not SQL, and
-- hardcoding a UUID would break on every reset. Create the two local users
-- first:
--
--   scripts/seed-local-counsellors.sh
--
-- then re-run this seed (or the script does it for you). Until the users
-- exist, this block is a no-op and the leads above simply have no counsellor
-- who can read them.
-- ------------------------------------------------------------

DO $$
DECLARE
  pair RECORD;
  uid  UUID;
BEGIN
  FOR pair IN
    SELECT * FROM (VALUES
      ('demo-agency',  'counsellor@demo-agency.test'),
      ('rival-agency', 'counsellor@rival-agency.test')
    ) AS t(slug, email)
  LOOP
    SELECT id INTO uid FROM auth.users WHERE email = pair.email;

    IF uid IS NULL THEN
      RAISE NOTICE 'seed: no auth user for % — run scripts/seed-local-counsellors.sh, then re-apply this seed', pair.email;
      CONTINUE;
    END IF;

    INSERT INTO agency_members (agency_id, user_id, role)
    SELECT a.id, uid, 'owner' FROM agencies a WHERE a.slug = pair.slug
    ON CONFLICT (agency_id, user_id) DO NOTHING;
  END LOOP;
END $$;
