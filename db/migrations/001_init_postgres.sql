-- Up migration: initial schema for the Lawrence chatbot
-- Translated from src/Chatbot/db/schema.ts (Drizzle/SQLite)

CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'booked', 'nurture', 'closed');
CREATE TYPE lead_classification AS ENUM ('hot', 'warm', 'cold');
CREATE TYPE message_role AS ENUM ('user', 'assistant');

CREATE TABLE leads (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            lead_status NOT NULL DEFAULT 'new',
  classification    lead_classification,
  score             INTEGER,
  score_breakdown   JSONB,
  captured_name     TEXT,
  captured_email    TEXT,
  location          TEXT,
  timeline          TEXT,
  forcing_function  TEXT,
  child_age         INTEGER,
  current_school    TEXT,
  curriculum        TEXT,
  budget_range_usd  TEXT
);

CREATE TABLE messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  role        message_role NOT NULL,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE schools (
  id              SERIAL      PRIMARY KEY,
  slug            TEXT        UNIQUE NOT NULL,
  name            TEXT        NOT NULL,
  city            TEXT,
  country         TEXT,
  website         TEXT,
  curricula       JSONB,
  age_from        INTEGER,
  age_to          INTEGER,
  fees_min_usd    INTEGER,
  fees_max_usd    INTEGER,
  boarding        BOOLEAN,
  day             BOOLEAN,
  description     TEXT,
  hero_image_url  TEXT
);

-- Down migration:
-- DROP TABLE IF EXISTS messages;
-- DROP TABLE IF EXISTS leads;
-- DROP TABLE IF EXISTS schools;
-- DROP TYPE IF EXISTS lead_status;
-- DROP TYPE IF EXISTS lead_classification;
-- DROP TYPE IF EXISTS message_role;
