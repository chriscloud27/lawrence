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
| `agencies` | One row per tenant agency. White-label + intake config. | ~1–10 |
| `agency_members` | Join table: which auth user is a counsellor of which agency. | ~1–5 per agency |
| `leads` | One row per chatbot BANT lead. See "Chatbot Leads" below. | ~10s–100s |
| `messages` | One row per chat message, linked to a lead. | ~10 per lead |

## Relationships

```
schools (1) ──< school_fees (many)
schools (1) ──< school_entry_points (many)
schools (1) ──< scrape_queue (1)

auth.users (1) ──< agency_members (many) >── (1) agencies
                                                  │
                                         agencies (1) ──< leads (many)
                                                             │
                                                    leads (1) ──< messages (many)
```

Two ownership domains (ADR-0005, ADR-0016). The school directory is a shared public
catalogue and carries **no** `agency_id`; tenancy applies to the app-owned tables only.
`messages` has no `agency_id` either — its tenant derives through `lead_id`.

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

## Agency Tenancy

**Purpose:** The tenant primitive for the app-owned tables (ADR-0016). Isolation is an RLS
policy, not a filter every query has to remember.

**Canonical source:** `supabase/migrations/20260915071821_add_agency_tenancy.sql` and
`20260915071822_backfill_leads_agency_id.sql`.

### agencies

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | `gen_random_uuid()` | |
| slug | TEXT | NO | | UNIQUE. `demo-agency`, `rival-agency` seeded as reference data |
| name | TEXT | NO | | Display name |
| intake_method | TEXT | NO | `chatbot` | `chatbot` \| `form` \| `both` — ADR-0010's per-agency setting, a column and never a code fork |
| accent_family | TEXT | NO | `blue` | Tailwind colour **family name** (`blue`, `emerald`, …), never a hex value. The single white-label axis in `.claude/rules/design.md` |
| created_at | TIMESTAMPTZ | NO | NOW() | |

RLS: enabled. `agencies_member_select` scopes `SELECT` to agencies the caller belongs to.

### agency_members

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| agency_id | UUID | NO | | FK → `agencies.id` ON DELETE CASCADE. PK part 1 |
| user_id | UUID | NO | | FK → `auth.users.id` ON DELETE CASCADE. PK part 2 |
| role | TEXT | NO | | `owner` \| `counsellor` |
| created_at | TIMESTAMPTZ | NO | NOW() | |

Index: `idx_agency_members_user(user_id)` — every tenancy check runs this lookup.

RLS: enabled. `agency_members_self_select` scopes `SELECT` to the caller's own agencies.

### current_agency_ids()

`SECURITY DEFINER`, `STABLE`, returns `SETOF UUID` — the agencies the current `auth.uid()`
belongs to. Every counsellor-facing policy goes through it.

It exists because a policy that subqueries `agency_members` re-triggers `agency_members`'s own
policy, which Postgres rejects outright (`infinite recursion detected in policy for relation
"agency_members"`). Running as the function owner side-steps that, and gives the tenant of the
current request exactly one definition. The planner evaluates it once per query (hashed SubPlan),
not once per row.

**Why not a JWT claim.** A claim is a snapshot: revoke a counsellor's membership and their
existing token keeps working until it refreshes — up to `jwt_expiry` of access after removal.
The function is evaluated per statement and is always current. Revisit only when a query plan
asks for it.

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
| updated_at | TIMESTAMPTZ | NO | NOW() | Auto-stamped by trigger on every row modification (ADR-0009) |
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
| agency_id | UUID | NO | | FK → `agencies.id`. The tenant. Added nullable then backfilled + set NOT NULL across two migrations |
| source | TEXT | NO | `chatbot` | `chatbot` \| `form` — ADR-0010's intake tag. Ships with the chatbot as the only producer so the v2 form path is an INSERT, not a migration |
| escalated_at | TIMESTAMPTZ | YES | | When admissions was emailed about this lead. NULL = never. Claimed by a conditional `UPDATE ... WHERE escalated_at IS NULL` so a retried Inngest step cannot send a second email (ADR-0018) |

Indexes: `idx_leads_agency(agency_id)`, `idx_leads_agency_score(agency_id, score DESC)` — the
Admin list's default ordering.

RLS: enabled, with two `SELECT` policies that Postgres ORs together:

- `leads_owner_select` — the parent reading their own recap: `auth.uid() = user_id` (ADR-0009).
- `leads_agency_select` — the counsellor: `agency_id IN (SELECT current_agency_ids())` (ADR-0016).

Plus one `UPDATE` policy, `leads_agency_update`, for counsellor status changes. It carries
`WITH CHECK` as well as `USING`: `USING` filters what is visible, `WITH CHECK` constrains what
the row may become — without it a counsellor could update a row they can see *into* another
agency.

Ingest writes still happen only via the `service_role` key (n8n today, step 14 after), which
bypasses RLS — no INSERT policy for `anon` or `authenticated`.

### agent_config

The prompt and the thresholds a counsellor owns, versioned. Added by
[ADR-0018](../adr/0018-chat-agent-in-typescript.md) as the answer to the requirement that put the
agent in n8n in the first place: a non-developer changes how the assistant speaks, without a
developer and without a deploy.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | `gen_random_uuid()` | |
| agency_id | UUID | NO | | FK → `agencies.id`, ON DELETE CASCADE |
| system_prompt | TEXT | NO | | Seeded from `src/agents/prompts/parent-turn.txt`. **The two must be kept identical** — `evals/prompt.js` grades the file, the app runs the row |
| bant_thresholds | JSONB | NO | | `{"low":25,"medium":50,"hot":75}` (ADR-0017) |
| routing_copy | JSONB | NO | | `{turn_cap_close, resources, booking}` — the parent-visible copy the model does not write |
| version | INTEGER | NO | | Unique per agency |
| created_by | UUID | YES | | FK → `auth.users.id`, ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| is_active | BOOLEAN | NO | false | |

**Never updated in place.** A save INSERTs version N+1 and moves `is_active`; a revert moves it
back. The row that was live before an edit still exists to revert *to* — the audit trail n8n never
had.

Indexes: `idx_agent_config_one_active` — a **partial unique index** on `(agency_id) WHERE is_active`,
so two active rows for one agency are a constraint violation rather than a coin flip at read time.
Plus `idx_agent_config_agency_version(agency_id, version DESC)` for the chat route's per-turn read.

RLS: enabled.

- `agent_config_agency_select` — `agency_id IN (SELECT current_agency_ids())`, reusing the
  ADR-0016 helper rather than re-deriving the membership subquery.
- `agent_config_owner_insert` / `agent_config_owner_update` — `current_owner_agency_ids()`, a second
  `SECURITY DEFINER` helper that adds `role = 'owner'`. Both carry `WITH CHECK` as well as `USING`,
  for the same reason `leads_agency_update` does.

No grant to `anon`. The parent-facing `/api/chat` reads the active row with the **service key**,
because the parent has no session and one agency's visitors must never be able to read another's
prompt.

### messages

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | TEXT | NO | | |
| lead_id | TEXT | NO | | FK → `leads.id` |
| role | TEXT | NO | | `user` \| `assistant` |
| content | TEXT | NO | | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

No `agency_id` column, deliberately: the tenant derives through `lead_id`. Denormalising it onto
both tables creates two copies that can disagree, and nothing in the schema would notice.

RLS: enabled, two `SELECT` policies:

- `messages_owner_select` (ADR-0009) — `lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid())`.
- `messages_agency_select` (ADR-0016) — `lead_id IN (SELECT id FROM leads WHERE agency_id IN (SELECT current_agency_ids()))`.

Writes happen only via the `service_role` key (n8n).

### Write paths

Since [ADR-0018](../adr/0018-chat-agent-in-typescript.md) the chat write path is TypeScript, not
n8n. `bant-prequalify.json` and `chat-agent.json` are deleted (archived under
`.claude/docs/archive/n8n/`).

- `src/Chatbot/inngest/functions/score-and-persist.ts` — on `chat/turn.completed`, as separately
  retried steps:
  - `upsert-lead` — upserts a `leads` row keyed by `id` (= the browser's `session_id`), carrying
    `agency_id`, `source`, `score`, `score_breakdown`, `classification`, and any profile fields the
    delta extracted. Null profile fields are dropped rather than written, so a later turn cannot
    erase what an earlier one captured.
  - `insert-messages` — appends only the turns not already stored. `messages.id` is derived as
    `{session_id}-{index}`, so a retry that partially succeeded collides instead of duplicating.
  - `notify-admissions` — fires once above the hot threshold, claimed via a conditional UPDATE on
    `leads.escalated_at` so a retry cannot send a second email.
  - All four use the **service-role** client (`lib/supabase-admin.ts`), which bypasses RLS. There is
    still no INSERT policy for `anon` or `authenticated` on `leads` or `messages`.
- `src/Chatbot/app/(admin)/admin/settings/actions.ts` — the only counsellor-facing write. Inserts a
  new `agent_config` version and moves `is_active`; never updates prompt or threshold columns in
  place. Uses the **cookie-bound** client so the owner-only RLS policies authorise it.
- `n8n/workflows/link-lead.json` — sets `leads.user_id` by `session_id` after Google sign-in
  (ADR-0008). The one remaining n8n write.

### Read paths (ADR-0009)

- Authenticated users can read their own `leads` row via the RLS-scoped browser client (`lib/supabase-browser.ts`), 
  filtered by `auth.uid() = user_id` (automatic via RLS policy `leads_owner_select`).
- Authenticated users can read their own `messages` rows via the RLS-scoped browser client, 
  filtered by the `messages_owner_select` policy (subquery: `lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid())`).
- Used by `src/Chatbot/lib/lead-history.ts::fetchLatestLeadRecap()` to populate cross-device conversation recap on sign-in.

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
