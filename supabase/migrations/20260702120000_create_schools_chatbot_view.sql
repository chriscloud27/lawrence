-- ============================================================
-- VIEW: schools_chatbot
-- Read contract for the Next.js chatbot (src/Chatbot/).
-- Projects the normalized target schema (schools + school_fees)
-- down to the flat shape the chatbot's Drizzle `schools` model expects.
--
-- The chatbot is a READ-ONLY consumer and never owns the schools table.
-- Ingestion (n8n) writes schools/school_fees; this view is the stable
-- boundary the app codes against.
--
-- Depends on: 20260627_create_schools_schema.sql
-- ============================================================

-- Static FX rates → USD. MVP placeholder; replace with an FX service in phase 2.
-- Any currency not listed here yields NULL fees (excluded from min/max).
CREATE OR REPLACE VIEW schools_chatbot
WITH (security_invoker = on) AS
WITH fx (currency, rate_to_usd) AS (
  VALUES
    ('USD', 1.00),
    ('GBP', 1.27),
    ('THB', 0.028)
),
yearly_fees_usd AS (
  SELECT
    f.school_id,
    ROUND(f.amount * fx.rate_to_usd)::int AS amount_usd
  FROM school_fees f
  JOIN fx ON fx.currency = f.currency
  WHERE f.fee_type = 'yearly_fee'
),
fees AS (
  SELECT
    school_id,
    MIN(amount_usd) AS fees_min_usd,
    MAX(amount_usd) AS fees_max_usd
  FROM yearly_fees_usd
  GROUP BY school_id
)
SELECT
  s.id,                                   -- UUID (chatbot schema.schools.ts must type as text/uuid)
  s.slug,
  s.name,
  s.address_city                AS city,
  s.address_country             AS country,
  COALESCE(s.official_url, s.source_url) AS website,   -- chatbot expects NOT NULL
  to_jsonb(s.curricula)         AS curricula,          -- TEXT[] → jsonb array
  s.age_min                     AS age_from,
  s.age_max                     AS age_to,
  fees.fees_min_usd,
  fees.fees_max_usd,
  s.boarding_available          AS boarding,
  s.day_available               AS day,
  s.description,
  NULL::text                    AS hero_image_url       -- not in target schema yet
FROM schools s
LEFT JOIN fees ON fees.school_id = s.id
WHERE s.scrape_status = 'ok';             -- hide pending/failed/needs_review from the chatbot

-- Public directory data — safe to expose read-only.
GRANT SELECT ON schools_chatbot TO anon, authenticated;

-- security_invoker=on means the caller's RLS on base tables applies.
-- Add public-read policies so anon/authenticated can read through the view.
-- (The chatbot's direct DATABASE_URL connection is superuser and bypasses RLS;
--  these policies make the view work if it is ever exposed via PostgREST.)
DROP POLICY IF EXISTS schools_public_read ON schools;
CREATE POLICY schools_public_read ON schools
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS school_fees_public_read ON school_fees;
CREATE POLICY school_fees_public_read ON school_fees
  FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- Down migration:
-- DROP POLICY IF EXISTS school_fees_public_read ON school_fees;
-- DROP POLICY IF EXISTS schools_public_read ON schools;
-- DROP VIEW IF EXISTS schools_chatbot;
-- ============================================================
