-- ============================================================
-- SCHOOL DATA MODEL — schema.sql
-- Version: 1.0.0
-- Target: Postgres 14+ / Supabase
-- Run order: execute top to bottom
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: schools
-- One row per school. Core identity, location, profile.
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (

  -- IDENTITY
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT UNIQUE NOT NULL,         -- url-safe identifier, e.g. 'st-edwards-school'
  name                  TEXT NOT NULL,
  source_url            TEXT NOT NULL,                -- page we scraped (doris or direct school URL)
  official_url          TEXT,                         -- school's own website
  founded_year          INT,

  -- LOCATION
  address_street        TEXT,
  address_city          TEXT,
  address_region        TEXT,
  address_country       TEXT,
  address_postcode      TEXT,
  lat                   FLOAT,
  lng                   FLOAT,

  -- PROFILE
  description           TEXT,
  school_type           TEXT,                         -- 'Independent' | 'State' | 'Semi-private'
  governance            TEXT,                         -- 'Charitable company' | 'Proprietary' | 'Government'
  religious_affiliation TEXT,                         -- 'Church of England' | 'Catholic' | 'None' | etc.
  gender_policy         TEXT,                         -- 'Co-educational' | 'Boys' | 'Girls'
  boarding_available    BOOLEAN DEFAULT FALSE,
  day_available         BOOLEAN DEFAULT TRUE,
  student_count         INT,
  age_min               INT,
  age_max               INT,

  -- ACADEMICS
  -- Array of valid values defined in .claude/docs/data/schemas/schools-enums.json > curricula
  curricula             TEXT[] DEFAULT '{}',
  -- Array of valid values defined in .claude/docs/data/schemas/schools-enums.json > languages_instruction
  languages_instruction TEXT[] DEFAULT '{}',
  -- Additional languages offered as subjects (not instruction medium)
  languages_offered     TEXT[] DEFAULT '{}',

  -- SCHOOL STRENGTHS (maps to Discover filter "School strengths")
  -- Valid values: .claude/docs/data/schemas/schools-enums.json > strengths
  strengths             TEXT[] DEFAULT '{}',

  -- SEN SUPPORT
  -- Valid values: 'Basic' | 'Moderate' | 'Advanced' | 'Specialist'
  sen_learning_support  TEXT,
  sen_behaviour_support TEXT,

  -- SOCIAL / LINKS
  instagram_url         TEXT,
  linkedin_url          TEXT,
  facebook_url          TEXT,

  -- PIPELINE META
  content_hash          TEXT,                         -- MD5 of raw HTML body; used for change detection
  last_scraped_at       TIMESTAMPTZ,
  last_modified_at      TIMESTAMPTZ,                  -- from JSON-LD dateModified if present
  extraction_confidence FLOAT,                        -- 0.0–1.0; LLM self-reported; <0.6 = flag for review
  scrape_status         TEXT NOT NULL DEFAULT 'pending'
                        CHECK (scrape_status IN ('pending','ok','failed','needs_review'))
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_schools_country   ON schools (address_country);
CREATE INDEX IF NOT EXISTS idx_schools_city      ON schools (address_city);
CREATE INDEX IF NOT EXISTS idx_schools_age       ON schools (age_min, age_max);
CREATE INDEX IF NOT EXISTS idx_schools_boarding  ON schools (boarding_available);
CREATE INDEX IF NOT EXISTS idx_schools_curricula ON schools USING GIN (curricula);
CREATE INDEX IF NOT EXISTS idx_schools_strengths ON schools USING GIN (strengths);


-- ============================================================
-- TABLE: school_fees
-- One row per fee line item. A school typically has 5–15 rows.
-- ============================================================
CREATE TABLE IF NOT EXISTS school_fees (

  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Which year group this fee applies to (NULL = applies to all / general)
  year_group  TEXT,                   -- 'Year 9' | 'Year 12' | 'Sixth Form' | NULL

  -- Fee classification
  fee_type    TEXT NOT NULL,          -- 'yearly_fee' | 'application_fee' | 'enrollment_fee' | 'additional_fee'
  label       TEXT,                   -- Human label, e.g. 'Annual tuition (three terms)'

  -- Amount
  amount      NUMERIC NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'GBP',

  -- Conditions / notes (e.g. 'Outside-UK families only', 'Non-refundable')
  notes       TEXT,

  scraped_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_fees ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fees_school      ON school_fees (school_id);
CREATE INDEX IF NOT EXISTS idx_fees_type_amount ON school_fees (fee_type, amount);


-- ============================================================
-- TABLE: school_entry_points
-- One row per admissions cohort / entry window.
-- ============================================================
CREATE TABLE IF NOT EXISTS school_entry_points (

  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Label shown to parents, e.g. 'Shell (Year 9)', 'Sixth Form Entry'
  label               TEXT,
  year_group          TEXT,           -- standardised: 'Year 9' | 'Year 10' | 'Year 12' | etc.

  places_available    INT,            -- approximate number of places
  open_date           DATE,           -- when applications open
  deadline_date       DATE,           -- application deadline
  rolling_admissions  BOOLEAN DEFAULT FALSE,

  -- Free-text notes from school (e.g. entry test requirements)
  notes               TEXT,

  scraped_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_entry_points ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_entry_school   ON school_entry_points (school_id);
CREATE INDEX IF NOT EXISTS idx_entry_deadline ON school_entry_points (deadline_date);


-- ============================================================
-- TABLE: scrape_queue
-- Pipeline control table. Tracks HTTP state for change detection.
-- Separate workflow reads this; do NOT join with schools in hot path.
-- ============================================================
CREATE TABLE IF NOT EXISTS scrape_queue (

  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,

  url           TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','processing','done','failed')),

  -- Change detection
  last_etag     TEXT,                 -- from HTTP ETag header
  last_hash     TEXT,                 -- MD5 of body when ETag unavailable

  -- Retry logic
  retry_count   INT DEFAULT 0,
  last_error    TEXT,

  queued_at     TIMESTAMPTZ DEFAULT NOW(),
  processed_at  TIMESTAMPTZ
);

ALTER TABLE scrape_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_queue_status ON scrape_queue (status);
CREATE INDEX IF NOT EXISTS idx_queue_school ON scrape_queue (school_id);


-- ============================================================
-- Down migration:
-- DROP TABLE IF EXISTS scrape_queue;
-- DROP TABLE IF EXISTS school_entry_points;
-- DROP TABLE IF EXISTS school_fees;
-- DROP TABLE IF EXISTS schools;
-- ============================================================
