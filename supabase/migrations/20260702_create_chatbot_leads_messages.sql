CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','booked','nurture','closed')),
  classification TEXT CHECK (classification IN ('hot','warm','cold')),
  score INTEGER NOT NULL DEFAULT 0,
  score_breakdown JSONB,
  captured_name TEXT,
  captured_email TEXT,
  location TEXT,
  timeline TEXT,
  forcing_function TEXT,
  child_age INTEGER,
  current_school TEXT,
  curriculum TEXT,
  budget_range_usd TEXT
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Down migration:
-- DROP TABLE IF EXISTS messages;
-- DROP TABLE IF EXISTS leads;
