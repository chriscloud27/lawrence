# ADR-0016: Agency tenancy via a membership table and RLS

**Status:** accepted
**Date:** 2026-09-15

## Context

The app-owned tables (`leads`, `messages`) had no tenant. `.claude/docs/stack-audit.md` listed
**Per-agency config — Open** under *Missing layers*: the gap was named but no schema was
specified. Two pieces of work were blocked behind it. Build step 13 puts the agency dashboard
behind an auth gate, and build step 14 gives each agency its own `agent_config`; building either
single-tenant means retrofitting isolation across every query written in between.

The product is white-label: several agencies run the same deployment, each seeing only its own
parents. The parents are families, and the data includes children's ages, schools, and budgets.
Getting isolation wrong is not a bug class you discover from a dashboard — you discover it from
an agency that saw a competitor's lead.

Three questions had to be answered together:

1. What carries the tenant, and which tables carry it?
2. Where does isolation live — in SQL, or in the TypeScript that reads it?
3. How does a request know which agency it belongs to?

## Decision

**1. `agencies` + `agency_members`, tenanting the app side only.**

`agencies` holds the tenant and its two configurable axes: `intake_method` (ADR-0010's
`chatbot` | `form` | `both`, as a column rather than a code fork) and `accent_family` (the single
white-label axis in `.claude/rules/design.md`, storing a Tailwind colour family name, never a
hex). `agency_members` joins `auth.users` to an agency with a role.

`leads` gains `agency_id`. The school directory — `schools`, `school_fees`,
`school_entry_points`, `scrape_queue` — does **not**. It is a shared public catalogue under the
ingestion ownership domain (ADR-0005), and scoping it per agency would mean re-scraping the same
school once per tenant.

`messages` does not get an `agency_id` either. Its tenant derives through `lead_id`, mirroring
the existing `messages_owner_select` policy. Denormalising the tenant onto both tables creates
two copies that can disagree, and nothing in the schema would notice when they did.

**2. Isolation is RLS, and only RLS.**

No application-level `agency_id` filter in TypeScript on top of the policies. Two isolation
mechanisms means the weaker one eventually wins an argument nobody is watching: a query that
forgets the filter is silently safe, so the next one that forgets it looks safe too — until it
runs somewhere the policy does not.

The parent-facing policies from ADR-0009 (`leads_owner_select`, `messages_owner_select`) are
left untouched. A table may carry several `SELECT` policies and Postgres `OR`s them, so the
parent recap path and the counsellor path coexist without either being rewritten.

`leads_agency_update` carries `WITH CHECK` as well as `USING`. `USING` filters what is visible;
`WITH CHECK` constrains what the row may become. Without it, a counsellor could update a row
they can legitimately see *into* another agency.

Ingest writes stay `service_role`-only (n8n today, step 14 after), which bypasses RLS. There is
no INSERT policy for `anon` or `authenticated`.

**3. Membership is resolved by a `SECURITY DEFINER` function, not a JWT claim.**

```sql
CREATE FUNCTION current_agency_ids() RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$ SELECT agency_id FROM agency_members WHERE user_id = auth.uid() $$;
```

Every counsellor-facing policy goes through it.

The function is not a convenience wrapper — it is load-bearing. A policy that subqueries
`agency_members` directly re-triggers `agency_members`'s own policy, and Postgres rejects the
statement with `infinite recursion detected in policy for relation "agency_members"`. This was
found by running the isolation test, not by reading the SQL. Running as the function owner
side-steps the recursion and gives the tenant of the current request exactly one definition.

`13-admin-consolidation.md` proposed putting `agency_id` in the JWT instead. That needs a
Supabase custom access token hook, and a claim is a snapshot: revoke a counsellor's membership
and their existing token keeps working until it refreshes — up to `jwt_expiry` of access after
removal. The function is evaluated per statement and is always current. With
`idx_agency_members_user` it is one index lookup on a table with one row per counsellor, and the
planner hashes it once per query rather than once per row. Revisit the claim when a query plan
asks for it, not before.

## Enforcement is RLS *and* a session check, not the layout

`app/(admin)/layout.tsx` redirects an unauthenticated visitor, but a layout is
not a security boundary in the App Router: Next.js renders a layout and its page
**concurrently**, so a page's data fetch starts before the layout's `redirect()`
resolves. Pushing the schema to the hosted project made this visible — every
unauthenticated `GET /admin` logged `permission denied for table leads`, meaning
the query really had run and only the absent grant stopped it.

So `lib/leads.ts` calls `requireUser()` (`lib/auth.ts`, memoised with React
`cache`) before every query. This is the Data Access Layer pattern the Next.js
authentication guide recommends, and it sits *in front of* the policies rather
than replacing them:

- `requireUser()` stops an anonymous request reaching the table at all.
- RLS decides which agency's rows an authenticated counsellor sees. That
  remains the only tenant boundary — no query adds an `agency_id` filter.

## Consequences

**Good**

- A query written by a future session is tenant-safe by default. Forgetting a filter is not a
  disclosure, because there is no filter to forget.
- Revoking a counsellor takes effect on their next statement, not their next token refresh.
- Step 13's auth gate and step 14's `agent_config` both have an `agency_id` to hang off.
- `intake_method` and `accent_family` land where ADR-0010 and the design rules say they belong —
  as agency data, so white-labelling never becomes a per-agency code path.

**Costs and risks**

- **`leads.agency_id` is now `NOT NULL`, and n8n does not set it.** The live
  `bant-prequalify.json` write path inserts leads without an agency and will fail against this
  schema until step 14 replaces it or its upsert node is given the demo agency's id. This is the
  one breaking consequence of the step.
- Every counsellor-facing policy depends on one function. A mistake in `current_agency_ids()` is
  a mistake in all of them at once — which is the point, but it makes that function the thing to
  review hardest.
- `SECURITY DEFINER` runs as the owner. It is pinned with `SET search_path` and `EXECUTE` is
  revoked from `PUBLIC` and granted only to `authenticated`.
- Seeding requires two steps: `supabase db reset` cannot create `auth.users`, so counsellor
  memberships land via `scripts/seed-local-counsellors.sh` after the reset.

**Neutral**

- Extends ADR-0003 (RLS policy strategy) rather than superseding it: the parent-facing policies
  are unchanged and the mechanism is the same one, applied to a second reader.
- Two agencies (`demo-agency`, `rival-agency`) ship as reference data in the migration, not as
  fixtures — the backfill migration needs them, and `db reset` replays migrations before seeds.
  The second exists so cross-tenant isolation can be tested rather than assumed.

## References

- `.claude/docs/build-steps/15-tenancy-and-persistence.md` — the step this ADR records
- `supabase/migrations/20260915071821_add_agency_tenancy.sql`, `..._backfill_leads_agency_id.sql`
- ADR-0003 — RLS policy strategy (extended, not superseded)
- ADR-0005 — ingestion/app ownership domains
- ADR-0009 — parent-facing recap read path
- ADR-0010 — configurable intake method (`intake_method`)
- `.claude/docs/data/db-tables.md` — the maintained schema spec
