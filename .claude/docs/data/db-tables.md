# Database Tables

This document describes the Supabase (PostgreSQL) table schemas for the Lawrence pipeline.

**Important:** This is the authoritative source before writing a migration. After a migration is committed, the migration file becomes authoritative. Update this doc and the migration together.

Migration: `database/migrations/20260627_create_schools_schema.sql`  
Enum values: `.claude/docs/data/schemas/schools-enums.json`

---

## Table Overview

| Table | Role | Rows (est.) |
|---|---|---|
| `schools` | One row per school. Core identity, location, profile, academics. | ~1,000+ |
| `school_fees` | One row per fee line item. Linked to school. | ~5–15 per school |
| `school_entry_points` | One row per admissions window/cohort. | ~1–5 per school |
| `scrape_queue` | Pipeline control. Tracks scrape status, ETag, hash. | ~1,000+ |
| `leads` | One row per chatbot BANT lead. See "Chatbot Leads" below. | ~10s–100s |
| `messages` | One row per chat message, linked to a lead. | ~10 per lead |

## Relationships

```
schools (1) ──< school_fees (many)
schools (1) ──< school_entry_points (many)
schools (1) ──< scrape_queue (1)
```

---

## schools

**Purpose:** One row per school. Core identity, location, profile, and academic metadata.

**Primary key:** `id` (UUID, `gen_random_uuid()`)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | |
| slug | TEXT | NO | | URL-safe, unique, e.g. `st-edwards-school` |
| name | TEXT | NO | | |
| source_url | TEXT | NO | | Page scraped (Doris or direct school URL) |
| official_url | TEXT | YES | | School's own website |
| founded_year | INT | YES | | |
| address_street | TEXT | YES | | |
| address_city | TEXT | YES | | |
| address_region | TEXT | YES | | |
| address_country | TEXT | YES | | |
| address_postcode | TEXT | YES | | |
| lat | FLOAT | YES | | |
| lng | FLOAT | YES | | |
| description | TEXT | YES | | Max 500 chars, factual summary |
| school_type | TEXT | YES | | `Independent` \| `State` \| `Semi-private` \| `International` |
| governance | TEXT | YES | | e.g. `Charitable company` |
| religious_affiliation | TEXT | YES | | Exact value or `None` |
| gender_policy | TEXT | YES | | `Co-educational` \| `Boys` \| `Girls` \| `Co-educational (boarding)` |
| boarding_available | BOOLEAN | NO | FALSE | |
| day_available | BOOLEAN | NO | TRUE | |
| student_count | INT | YES | | |
| age_min | INT | YES | | |
| age_max | INT | YES | | |
| curricula | TEXT[] | NO | `{}` | Valid values in `schools-enums.json` > `curricula` |
| languages_instruction | TEXT[] | NO | `{}` | Valid values in `schools-enums.json` > `languages_instruction` |
| languages_offered | TEXT[] | NO | `{}` | Free text; languages taught as subjects |
| strengths | TEXT[] | NO | `{}` | Valid values in `schools-enums.json` > `strengths` |
| sen_learning_support | TEXT | YES | | `Basic` \| `Moderate` \| `Advanced` \| `Specialist` |
| sen_behaviour_support | TEXT | YES | | `Basic` \| `Moderate` \| `Advanced` \| `Specialist` |
| instagram_url | TEXT | YES | | |
| linkedin_url | TEXT | YES | | |
| facebook_url | TEXT | YES | | |
| content_hash | TEXT | YES | | MD5 of raw HTML; used for change detection |
| last_scraped_at | TIMESTAMPTZ | YES | | |
| last_modified_at | TIMESTAMPTZ | YES | | From JSON-LD `dateModified` if present |
| extraction_confidence | FLOAT | YES | | 0.0–1.0; LLM self-reported; <0.6 = flag for review |
| scrape_status | TEXT | NO | `pending` | `pending` \| `ok` \| `failed` \| `needs_review` |

### Field Nullability Rules

- `id`, `name`, `source_url`, `scrape_status` — NEVER NULL
- `lat`, `lng`, `founded_year`, `official_url` — nullable, extract if present
- `curricula`, `strengths`, `languages_instruction` — default empty array `{}`
- `sen_learning_support`, `sen_behaviour_support` — nullable; only set if explicitly stated
- `extraction_confidence` — always set by LLM (0.0–1.0); below 0.6 flags for manual review

### Indexes

- `idx_schools_country` on `address_country`
- `idx_schools_city` on `address_city`
- `idx_schools_age` on `(age_min, age_max)`
- `idx_schools_boarding` on `boarding_available`
- `idx_schools_curricula` GIN on `curricula`
- `idx_schools_strengths` GIN on `strengths`

---

## school_fees

**Purpose:** One row per fee line item. A school typically has 5–15 rows covering tuition by year group, registration, enrollment deposit, and additional charges.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | |
| school_id | UUID | NO | | FK → `schools.id` ON DELETE CASCADE |
| year_group | TEXT | YES | | `Year 9` \| `Year 12` \| `Sixth Form` \| NULL |
| fee_type | TEXT | NO | | `yearly_fee` \| `application_fee` \| `enrollment_fee` \| `additional_fee` |
| label | TEXT | YES | | Human label, e.g. `Annual tuition (three terms)` |
| amount | NUMERIC | NO | | |
| currency | TEXT | NO | `GBP` | ISO 4217 code |
| notes | TEXT | YES | | e.g. `Outside-UK families only`, `Non-refundable` |
| scraped_at | TIMESTAMPTZ | NO | NOW() | |

---

## school_entry_points

**Purpose:** One row per admissions cohort / entry window per school.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | |
| school_id | UUID | NO | | FK → `schools.id` ON DELETE CASCADE |
| label | TEXT | YES | | e.g. `Shell (Year 9)`, `Sixth Form Entry` |
| year_group | TEXT | YES | | Standardised: `Year 9` \| `Year 12` etc. |
| places_available | INT | YES | | Approximate |
| open_date | DATE | YES | | When applications open |
| deadline_date | DATE | YES | | Application deadline |
| rolling_admissions | BOOLEAN | NO | FALSE | |
| notes | TEXT | YES | | Entry test requirements etc. |
| scraped_at | TIMESTAMPTZ | NO | NOW() | |

---

## scrape_queue

**Purpose:** Pipeline control. One row per URL to scrape. Tracks HTTP change-detection state and retry logic. Do NOT join this with `schools` in the hot path — it is read by a separate n8n workflow.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | |
| school_id | UUID | YES | | FK → `schools.id` ON DELETE CASCADE |
| url | TEXT | NO | | |
| status | TEXT | NO | `pending` | `pending` \| `processing` \| `done` \| `failed` |
| last_etag | TEXT | YES | | From HTTP `ETag` header |
| last_hash | TEXT | YES | | MD5 of body when ETag unavailable |
| retry_count | INT | NO | 0 | |
| last_error | TEXT | YES | | |
| queued_at | TIMESTAMPTZ | NO | NOW() | |
| processed_at | TIMESTAMPTZ | YES | | |

---

## Chatbot Leads

**Purpose:** BANT-qualified leads captured by the `src/Chatbot` widget (ADR-0006, ADR-0007,
ADR-0008). Distinct from the `schools`/`school_fees`/etc. scraping-pipeline tables above —
these are chatbot/qualification data, owned by the chatbot's read-write boundary
(`.claude/rules/chatbot.md`: chatbot reads only, all writes go through n8n).

**Canonical source:** `supabase/migrations/` — specifically
`20260702_create_chatbot_leads_messages.sql` (base tables) and
`20260816121024_add_lead_auth_linking.sql` (`user_id`/`session_id`/RLS policy). **Do not**
treat `db/migrations/001_init_postgres.sql` as authoritative — it's a stale duplicate from an
earlier Drizzle/SQLite translation with a diverging schema (enum types, UUID keys) and should
not be edited further (see ADR-0008).

**Primary key:** `id` (TEXT — not UUID; the chatbot's `sessionId`, generated client-side via
`crypto.randomUUID()`, is written here as-is on first hot-tier write)

### leads

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | TEXT | NO | | Chatbot's `sessionId` |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| status | TEXT | NO | `new` | `new` \| `contacted` \| `booked` \| `nurture` \| `closed` |
| classification | TEXT | YES | | `hot` \| `warm` \| `cold` |
| score | INTEGER | NO | 0 | 0–100, from BANT scoring (`.claude/rules/bant-scoring.md`) |
| score_breakdown | JSONB | YES | | `{timeline, budget, authority}` (+ `need` post-refinement) |
| captured_name | TEXT | YES | | Not currently captured by the widget (future field) |
| captured_email | TEXT | YES | | Not currently captured by the widget (future field) |
| location | TEXT | YES | | |
| timeline | TEXT | YES | | |
| forcing_function | TEXT | YES | | |
| child_age | INTEGER | YES | | |
| current_school | TEXT | YES | | |
| curriculum | TEXT | YES | | |
| budget_range_usd | TEXT | YES | | |
| user_id | UUID | YES | | FK → `auth.users.id`. Set by the `link-lead` n8n workflow after Google sign-in (ADR-0008) |
| session_id | TEXT | YES | | UNIQUE. Bridges the browser's localStorage session to this row before/without auth |

RLS: enabled. `leads_owner_select` policy scopes `SELECT` to `auth.uid() = user_id`. Writes
happen only via the `service_role` key (n8n), which bypasses RLS — no write policy needed.

### messages

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | TEXT | NO | | |
| lead_id | TEXT | NO | | FK → `leads.id` |
| role | TEXT | NO | | `user` \| `assistant` |
| content | TEXT | NO | | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

RLS: enabled (no policies defined yet — no read path exists for `messages` today).

### Write paths

- `n8n/workflows/bant-prequalify.json` — `upsert-lead` node, hot-tier branch only. Upserts on
  `session_id` conflict.
- `n8n/workflows/link-lead.json` — sets `leads.user_id` by `session_id` after Google sign-in.

---

## Key Query Patterns

### Match a parent's budget to schools
```sql
SELECT s.name, s.address_city, s.address_country, f.amount, f.currency
FROM schools s
JOIN school_fees f ON f.school_id = s.id
WHERE f.fee_type = 'yearly_fee'
  AND f.amount BETWEEN :budget_min AND :budget_max
  AND f.currency = :currency;
```

### Match curriculum preference
```sql
SELECT name FROM schools
WHERE curricula && ARRAY[:curriculum_1, :curriculum_2];
-- e.g. ARRAY['IB (DP)', 'Cambridge A Levels']
```

### Match child age to school
```sql
SELECT name FROM schools
WHERE age_min <= :child_age AND age_max >= :child_age;
```

### Find schools with open admissions
```sql
SELECT s.name, e.label, e.deadline_date
FROM schools s
JOIN school_entry_points e ON e.school_id = s.id
WHERE e.deadline_date >= CURRENT_DATE
ORDER BY e.deadline_date ASC;
```

---

## Adding a New Table

1. Start here: write the template above for your new table
2. Reference the schema in `schemas/{entity}.md` — fields must match (type, nullable, default)
3. Create the migration: `database/migrations/TIMESTAMP_create_{table_name}.sql`
4. Update CLAUDE.md if it's a significant schema change (→ ADR?)
5. Run migration against staging before committing

See: `.claude/rules/database-migrations.md` for migration rules.
