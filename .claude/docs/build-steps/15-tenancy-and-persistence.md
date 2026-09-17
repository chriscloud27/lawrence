# Step 15 — Agency Tenancy & Persistence Schema

> Closes **"Per-agency config — Open"** under *Missing layers* in `.claude/docs/stack-audit.md`.
> The audit names the gap but specifies no schema; this step is the specification.
>
> **Runs between Step 12 and Step 13**, despite its filename. Step 13's auth gate and Step 14's
> `agent_config` table both assume the tenancy primitive already exists — building either
> single-tenant means retrofitting RLS across every query later. The execution-order table in
> `stack-audit.md` records this ordering; committed step files are not renumbered.

## Assumes

- Steps 10–12 complete
- `supabase/migrations/` contains, in order: `20260702_create_chatbot_leads_messages.sql`
  (`leads` PK is **TEXT** — the client-generated `sessionId` — and `messages.lead_id TEXT`
  references it), `20260816121024_add_lead_auth_linking.sql` (`user_id`, `session_id`,
  policy `leads_owner_select`), `20260816140000_add_lead_recap_support.sql` (`updated_at`,
  trigger `set_updated_at()`, policy `messages_owner_select`)
- RLS is already `ENABLE`d on both `leads` and `messages`; neither has a write policy — writes
  run as `service_role`, which bypasses RLS
- `.claude/docs/data/db-tables.md` is the maintained schema spec and must move with the migration
  (`.claude/rules/database-migrations.md`)
- No table anywhere carries an `agency_id` today

## Task

Give the app-owned tables a tenant, and make isolation an RLS policy rather than a filter every
future query has to remember.

### 1. Ownership boundary — what is and is not tenanted

```
auth.users ──< agency_members >── agencies
                                      │
                           ┌──────────┴──────────┐
                         leads              agent_config   (step 14)
                           │
                        messages

schools ──< school_fees           ingestion-owned (ADR-0005), agency-agnostic,
        ──< school_entry_points   read by the chatbot only through schools_chatbot
        ──< scrape_queue
```

Two ownership domains, unchanged from ADR-0005. The tenancy layer sits on the **app side only**.
The school directory is a shared public catalogue — do not add `agency_id` to it, and do not
scope the `schools_chatbot` view per agency.

### 2. Migration A — `supabase/migrations/<UTC>_add_agency_tenancy.sql`

Filename timestamp from `date -u +%Y%m%d%H%M%S`, per `.claude/rules/database-migrations.md`.

| Object | Shape |
|---|---|
| `agencies` | `id UUID PK DEFAULT gen_random_uuid()`, `slug TEXT NOT NULL UNIQUE`, `name TEXT NOT NULL`, `intake_method TEXT NOT NULL DEFAULT 'chatbot' CHECK (intake_method IN ('chatbot','form','both'))`, `accent_family TEXT NOT NULL DEFAULT 'blue'`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| `agency_members` | `agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE`, `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `role TEXT NOT NULL CHECK (role IN ('owner','counsellor'))`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `PRIMARY KEY (agency_id, user_id)` |
| `leads.agency_id` | `UUID REFERENCES agencies(id)` — **nullable in this migration** |
| `leads.source` | `TEXT NOT NULL DEFAULT 'chatbot' CHECK (source IN ('chatbot','form'))` |

`intake_method` is ADR-0010's per-agency setting, landing where the ADR says it belongs — a column,
never a code fork. `accent_family` is the single white-label axis in `.claude/rules/design.md` §
White-Label; it stores a **Tailwind colour family name** (`blue`, `emerald`, `indigo`, …), never a
hex value.

`leads.source` is ADR-0010's intake tag. It ships now, with the chatbot as the only producer, so
that the v2 form path is an insert rather than a migration against a populated table.

Indexes:

- `idx_agency_members_user` on `agency_members(user_id)` — every RLS check below runs this lookup
- `idx_leads_agency` on `leads(agency_id)`
- `idx_leads_agency_score` on `leads(agency_id, score DESC)` — the Admin list's default ordering

Enable RLS immediately after each `CREATE TABLE`, per the rules:

```sql
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;
```

Close with a `-- Down migration:` block dropping the policies, indexes, columns, then tables, in
reverse order.

### 3. Migration B — `<UTC>_backfill_leads_agency_id.sql`

Separate file. `.claude/rules/database-migrations.md`: *"Add NOT NULL columns only with a DEFAULT
value, or as a two-step migration."* A `NOT NULL` add with no default against a populated table
takes an `ACCESS EXCLUSIVE` lock and fails outright on existing rows.

```sql
UPDATE leads SET agency_id = (SELECT id FROM agencies WHERE slug = 'demo-agency')
WHERE agency_id IS NULL;

ALTER TABLE leads ALTER COLUMN agency_id SET NOT NULL;
```

This migration **depends on the seed having run**, which is the one ordering trap in this step:
`supabase db reset` replays migrations *then* seeds. Resolve it by inserting the two agency rows in
Migration A itself (`INSERT ... ON CONFLICT (slug) DO NOTHING`) and keeping only the
lead/member/message fixtures in the seed file. Agencies are reference data here, not fixtures.

### 4. RLS — membership subquery, not a JWT claim

Leave both parent-facing policies **untouched**: `leads_owner_select` and `messages_owner_select`
still serve the signed-in parent reading their own recap (ADR-0009). A table can carry several
`SELECT` policies; Postgres `OR`s them.

Add the counsellor-facing side:

```sql
CREATE POLICY leads_agency_select ON leads FOR SELECT USING (
  agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
);

CREATE POLICY leads_agency_update ON leads FOR UPDATE USING (
  agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
) WITH CHECK (
  agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
);

CREATE POLICY messages_agency_select ON messages FOR SELECT USING (
  lead_id IN (
    SELECT id FROM leads
    WHERE agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY agencies_member_select ON agencies FOR SELECT USING (
  id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
);

CREATE POLICY agency_members_self_select ON agency_members FOR SELECT USING (
  agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
);
```

`leads_agency_update` needs the `WITH CHECK` clause as well as `USING`: without it a counsellor
could update a row they can see *into* another agency. `USING` filters what is visible; `WITH
CHECK` constrains what the row may become.

**Why a subquery and not the JWT.** `13-admin-consolidation.md` § 5 says "`agency_id` in the JWT".
That requires a Supabase custom access token hook, and a claim is a snapshot: revoke a counsellor's
membership and their existing token keeps working until it refreshes — up to an hour of access
after removal. The subquery is evaluated per statement and is always current. With
`idx_agency_members_user` the cost is an index lookup on a table with one row per counsellor.
Revisit the claim as a measured performance change, when a query plan asks for it, not before.

**`messages` gets no `agency_id`.** Its tenancy derives through `lead_id`, mirroring the existing
`messages_owner_select` policy exactly. Denormalising the tenant onto both tables creates two
copies that can disagree, and nothing in the schema would notice when they did.

**No write policy for `anon` or `authenticated`.** Writes stay `service_role`-only (n8n today,
Inngest after Step 14). `leads_agency_update` is a status change by a signed-in counsellor, which
is a different thing from the ingest write path.

### 5. Seed — `supabase/seed_demo_agency.sql`

Admin (Step 13) needs rows to render before the TypeScript write path exists (Step 14).

- **Two** agencies — `demo-agency` and `rival-agency`. The second exists for one reason: the
  cross-agency isolation check is the only test that proves RLS rather than assuming it, and it
  needs a second tenant to fail against.
- One `agency_members` row per agency. Seeding `auth.users` requires the Supabase-local auth
  schema; create the two users via `supabase` local auth (or the dashboard for a cloud project)
  and reference their UUIDs through a `DO $$` block that looks them up by email, so the file
  contains **no hardcoded user IDs and no credentials**.
- ~6 leads on `demo-agency` spanning all three bands — two `cold` (<50), two `warm` (50–75), two
  `hot` (>75) — each with a short `messages` transcript and a populated `score_breakdown`.
- 1–2 leads on `rival-agency`, so the isolation test has something to *not* see.
- Synthetic names and emails only. No real parent data, ever, in a committed file.

Wire it into `supabase/config.toml` (`[db.seed] sql_paths`) so `supabase db reset` applies it.

### 6. Documentation

- `.claude/docs/data/db-tables.md` — add `agencies` and `agency_members` to the Table Overview and
  Relationships diagram, add the two new `leads` columns to that table's column list, and extend
  the RLS notes under *Chatbot Leads* with the four new policies. Same commit as the migration.
- Run `/adr-new` for the tenancy model. It establishes a pattern every future query follows, which
  is precisely the ADR trigger in `CLAUDE.md`. It should record: membership-table subquery over JWT
  claim and why; `messages` tenanted transitively; schools deliberately untenanted; and that
  ADR-0003 (RLS policy strategy) is extended, not superseded.
- `.claude/docs/stack-audit.md` — flip *Per-agency config* from **Open** to the new ADR, and note
  that step 15 runs between 12 and 13.

## Do Not

- Add `agency_id` to `messages`, `schools`, `school_fees`, `school_entry_points`, or `scrape_queue`.
- Change `leads.id` from `TEXT` to `UUID`. It is the client-generated `sessionId` and
  `messages.lead_id` references it; converting it is a separate migration with its own blast radius.
- Drop, rewrite, or "consolidate" `leads_owner_select` / `messages_owner_select`. The parent-facing
  read path in ADR-0009 depends on them.
- Add a custom access token hook or touch `auth.*` configuration.
- Add application-level `agency_id` filtering in TypeScript. RLS is the mechanism; a second one
  means the weaker eventually wins an argument nobody is watching (`13-admin-consolidation.md` § 5).
- Put a real user UUID, email, project ref, or connection string in the seed file or the migration
  (`.claude/rules/secrets.md`).
- Create `agent_config`. That is Step 14's table; this step only makes `agency_id` available to it.

## Verify

- [ ] `supabase db reset` replays every migration and the seed with no error
- [ ] Both migrations carry a `-- Down migration:` block; applying them down leaves the schema as it
      was before this step
- [ ] `select count(*) from leads where agency_id is null` returns `0`, and the column is `NOT NULL`
- [ ] `\d+ leads` shows `source` with its CHECK constraint and a `'chatbot'` default
- [ ] RLS enabled on `agencies` and `agency_members`
- [ ] **Isolation:** as the `rival-agency` counsellor, `select count(*) from leads` returns only
      rival-agency's rows — zero from `demo-agency`. This is the test that matters.
- [ ] As the `demo-agency` counsellor, all six seeded leads and their messages are readable
- [ ] As `anon`, `select * from leads` returns zero rows
- [ ] A parent signed in with a linked `leads.user_id` still reads their own row and messages —
      `leads_owner_select` / `messages_owner_select` unbroken
- [ ] `explain analyze` on the Admin list query uses `idx_agency_members_user`, not a seq scan
- [ ] `.claude/docs/data/db-tables.md` documents both new tables, both new `leads` columns, and all
      four new policies
- [ ] The tenancy ADR exists and `stack-audit.md` no longer lists per-agency config as Open
- [ ] `git diff` contains no credential, real user UUID, project ref, or connection string
