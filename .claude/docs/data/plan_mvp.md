# MVP Plan: Ingestion + Chatbot Migration to Target Schema

**Status:** draft · **Date:** 2026-07-02 · **Owner:** data/platform

Plan to reach the target-state database in `db-tables.md`, covering (1) school
web-scraping ingestion and (2) migrating the sales-team Chatbot prototype
(`src/Chatbot/`) onto the target schema.

---

## Step 1 — Target state & architecture

Authoritative target = the normalized Supabase schema in `db-tables.md`: rich
`schools` (UUID PK, `TEXT[]` arrays, enum-constrained), fees and admissions
split into their own tables, plus a pipeline-control table.

```
                         ┌──────────────────────────────────────────┐
   INGESTION (write)     │                DELIVERY (read)           │
                         │                          chat.mach2.cloud│
 Doris directory         │                          (Next.js 16)    │
   │ HTTP GET            │                              │           │
   ▼                     │                              │ read-only │
 ┌──────────────┐        │                              ▼           │
 │ scrape_queue │◄───┐   │                    ┌───────────────────┐ │
 │ (control)    │    │   │                    │  Supabase Postgres│ │
 └──────┬───────┘    │   │                    │                   │ │
        │ pending    │   │   UPSERT(slug)     │  schools   ───────┼─┤
        ▼            │   │  ┌──────────────►  │  school_fees      │ │
 ┌──────────────┐    │   │  │                 │  school_entry_pts │ │
 │ n8n workflow │────┘   │  │                 │  scrape_queue     │ │
 │ scrape-doris │        │  │                 │                   │ │
 └──────┬───────┘        │  │                 │  schools_chatbot  │ │  ← view
        │ HTML(trunc)    │  │                 │  (read view)   ───┼─┤
        ▼                │  │                 │                   │ │
 ┌──────────────┐        │  │                 │  leads    ◄───────┼─┤ chatbot
 │ OpenAI       │────────┘  │                 │  messages ◄───────┼─┤ writes
 │ gpt-4o-mini  │  JSON {school, fees[], entry_points[]}          │ │ (own)
 └──────────────┘  validate (Zod + enums, conf ≥ 0.6)             │ │
                         └──────────────────────────────────────────┘
```

Two data planes over one DB: **ingestion writes** `schools/fees/entry_points`
via n8n; **chatbot reads** those (through a view) and **writes** its own
`leads/messages`.

---

## Step 2 — Validate target vs. ingestion + MVP scrape

The target schema is sound for ingestion as-is: `scrape_queue` decouples crawl
control from data, UPSERT-on-`slug` gives idempotency, `content_hash`/ETag give
change detection, `extraction_confidence < 0.6 → needs_review` gives a human
gate. No structural changes needed to start ingesting.

### Mismatches to resolve first

| # | Issue | Resolution |
|---|---|---|
| 1 | **Geography.** Sample record + enums are UK (St Edward's, GBP, "Year 9"); chatbot seed CSV is 54 Thailand schools. | MVP targets **both markets** (see Step 3/decision). Handle GBP + THB/USD currencies and both Doris URL paths. |
| 2 | **Fees shape.** Target = normalized `school_fees` rows per year-group; chatbot expects flat `fees_min_usd`/`fees_max_usd`. | Projection **view** `schools_chatbot` (Step 3). |
| 3 | **PK type.** Target `schools.id` = UUID; chatbot `schools.id` = `serial int`. | Chatbot never owns `schools`; reads the view. |
| 4 | **Doc drift.** `db-tables.md` points migrations at `database/migrations/`; actual dir is `supabase/migrations/`. | Fix the pointer when next editing the doc. |

### MVP scrape scope

Start with **`schools` core + `yearly_fee` only**. Skip `school_entry_points`
(deadlines are the flakiest field, chatbot doesn't read them yet), SEN, and
social links — defer to phase 2.

Extract: identity, location, `school_type`, `gender_policy`, boarding/day,
`age_min/max`, `curricula`, `strengths`, and `yearly_fee` line items. Gate on
`extraction_confidence`; write `needs_review` rows without blocking the run.

### n8n workflow `scrape-doris-school.json` (MVP node chain)

```
Cron (daily)
  → Postgres: SELECT * FROM scrape_queue WHERE status='pending' LIMIT n
  → HTTP Request: GET url, send If-None-Match: {{last_etag}}  ({{ $env.DORIS_BASE_URL }})
  → IF 304 Not Modified → Postgres: UPDATE scrape_queue SET status='done' → end
  → Function: strip + truncate HTML to 12,000 chars, MD5 the body
  → IF hash == last_hash → mark done → end
  → OpenAI (gpt-4o-mini, temp 0): prompt = school-extraction.txt → JSON
  → Function/Zod: validate against enums; set scrape_status
  → Postgres: UPSERT schools ON CONFLICT(slug)
  → Postgres: DELETE + INSERT school_fees WHERE fee_type='yearly_fee'
  → Postgres: UPDATE scrape_queue SET status='done', processed_at=NOW()
  (error branch → retry_count++, last_error, status='failed')
```

Credentials by reference only (`{{ $env.* }}`); file naming per
`.claude/rules/n8n-workflows.md`.

---

## Step 3 — Chatbot strategy

Prototype audit: already Postgres-native (`pgTable` + `postgres` + Drizzle), all
DB access centralized in `lib/db.ts`, zero raw SQL, SQLite only in the one-off
seed script. The app layer is not the problem — the **schema collision is**
(mismatches 2 & 3).

**Chosen model: read-view decoupling. Chatbot is a read-only consumer, never a
schema owner.**

- Project owns ingestion tables. A DB **view `schools_chatbot`** projects the
  normalized schema down to the flat shape the chatbot already queries
  (`slug, name, city, country, website, curricula, age_from, age_to,
  fees_min_usd, fees_max_usd, boarding, day, description`). `fees_min/max_usd`
  become `MIN/MAX(amount) FILTER (WHERE fee_type='yearly_fee')` over
  `school_fees`, normalized to USD.
- Chatbot points its `schools` Drizzle model at the **view**. `/api/schools/search`
  is unchanged — same columns, same filters.
- Chatbot keeps full ownership of `leads` + `messages`.

**Why not "code against the target schema directly":** the view is a stable
contract. The vibe-coding loop keeps hitting the exact flat shape it expects;
ingestion evolves underneath without breaking the app.

**Making chatbot version bumps easy to merge:**
- **Contract boundary:** chatbot owns `app/ components/ lib/` + `leads`/`messages`
  schema. Project owns ingestion schema + the `schools_chatbot` view.
- **Schema split:** split `db/schema.ts` → `db/schema.leads.ts` (chatbot-owned)
  + `db/schema.schools.ts` (view mapping, project-owned). Then the only
  historically-conflicting file is decoupled and a version bump merges near-clean.
- **Merge flow:** sales person works on a branch of `src/Chatbot/`; app-layer
  changes merge freely.

---

## Step 4 — Provision DB + load example data

1. **Consolidate migrations** in `supabase/migrations/` (apply in order):
   - `20260627_create_schools_schema.sql` (exists) — schools/fees/entry_points/scrape_queue.
   - `20260702_create_chatbot_leads_messages.sql` (exists) — leads/messages.
   - **New** `<ts>_create_schools_chatbot_view.sql` — the read view (Step 3).
   - RLS: read-only policy for the chatbot role on `schools_chatbot`; confirm
     insert policies on `leads`/`messages`.
2. **Apply locally first:** `supabase db reset`, then `supabase db diff` to
   confirm it matches `db-tables.md`. Use `/db-migrate` for staging.
3. **Load example data (two sources):**
   - Seed `schools/school_fees` from `sample-records/st-edwards-school.json`
     (all fields populated) — smoke-tests the view.
   - For volume, transform `thailand-schools-seed.csv` (54 rows) into
     `scrape_queue`, then run the n8n MVP workflow to populate for real. Do
     **not** hand-load the flat CSV into `schools` — that reintroduces the
     denormalized shape.
4. **Point the chatbot** `DATABASE_URL` at Supabase (`sslmode=require`), remap
   its `schools` model to the view, test `/api/schools/search` and `/api/leads`.
   Retire `better-sqlite3` + local `.db` (should not be committed).

---

## Decisions (locked 2026-07-02)

- [x] Chatbot integration model — **read-view decoupling**.
- [x] MVP market — **both (UK + Thailand)**.

## Deferred to phase 2

`school_entry_points` ingestion (deadlines/places), SEN fields, social links,
JS-rendered fallback (headless browser), currency-conversion service for fees.
