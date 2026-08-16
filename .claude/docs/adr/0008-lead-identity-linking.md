# ADR-0008: Link chatbot leads to identity via Supabase Auth (Google)

**Status:** accepted
**Date:** 2026-08-16

## Context

The BANT chatbot (`src/Chatbot/`) persists conversation state — session id, prequal answers,
score — only in browser `localStorage` (`lib/session.ts`). A parent has no way to resume their
conversation or score on a different device or browser, and no durable lead record exists
beyond the ad-hoc Gmail notification n8n sends for hot leads (`inform-agent` node in
`bant-prequalify.json`) — there is currently no write path from the qualification flow into
Supabase at all.

Investigating the existing `leads` table surfaced a second problem: it exists in **two
diverging, undocumented copies** — `db/migrations/001_init_postgres.sql` (enum types, UUID
primary keys) and `supabase/migrations/20260702_create_chatbot_leads_messages.sql` (CHECK
constraints, TEXT primary keys) — and neither is described in `.claude/docs/data/db-tables.md`,
which only documents the scraping pipeline's `schools`/`school_fees`/`school_entry_points`/
`scrape_queue` tables.

## Decision

1. **Auth provider:** Use Supabase Auth's built-in Google OAuth provider for optional parent
   sign-in — not a separate auth system (NextAuth, etc.) — since the project already runs on
   Supabase and this needs no new infrastructure. The Google Client ID/Secret are configured
   only in the Supabase Dashboard (Authentication → Providers → Google); they are never stored
   in this repo, per `.claude/rules/secrets.md`.

2. **Schema:** `supabase/migrations/` is the canonical, applied schema (per ADR-0002's CLI
   lifecycle) — `db/migrations/001_init_postgres.sql` is a stale duplicate from an earlier
   Drizzle/SQLite translation and must not be edited further. `leads` gains a nullable
   `user_id UUID REFERENCES auth.users(id)` and a `session_id TEXT UNIQUE` column — the bridge
   between an anonymous localStorage session and an authenticated identity. RLS is enabled on
   `leads`, scoped to `auth.uid() = user_id` for reads.

3. **Write path:** No new write path is introduced in the chatbot app. Per the existing rule
   in `.claude/rules/chatbot.md` ("all Supabase calls are read-only from the chatbot; writes go
   through n8n pipelines only"), both new writes go through n8n:
   - `bant-prequalify.json` gains an `upsert-lead` step on the hot-tier branch (parallel to the
     existing `inform-agent` Gmail node), upserting the lead row keyed by `session_id`.
   - A new minimal workflow, `link-lead.json`, is called by the chatbot after Google sign-in
     to set `user_id` on the `leads` row matching the browser's `session_id`.

4. **Documentation:** `.claude/docs/data/db-tables.md` gets a new "Chatbot Leads" section
   documenting `leads`/`messages` in full (previously undocumented), noting
   `supabase/migrations/` as canonical. `.claude/rules/database-migrations.md` gets a pointer
   telling future sessions to check that doc before altering these tables, instead of
   re-deriving the schema from migration diffs.

## Consequences

**Easier:**
- A parent's qualification progress and score becomes durable and cross-device once they
  sign in, without any new write surface in the Next.js app — n8n remains the single writer
  to Supabase, consistent with every other pipeline in this project.
- Future features (reading a lead's history back on a new device, an admin dashboard) have a
  real schema and a documented one to build against.

**Harder:**
- Two n8n workflows now need to stay in sync on the `leads` schema (`bant-prequalify.json`
  and `link-lead.json`), rather than one.
- The stale `db/migrations/001_init_postgres.sql` still exists and could confuse a future
  reader who finds it before `supabase/migrations/` — flagged here and in the schema doc, but
  not deleted; that's left for the project owner to remove explicitly.

**Trade-off accepted:** An extra n8n webhook round-trip for the auth-linking write, instead of
a simpler direct server-side Supabase write, in exchange for keeping a single, consistent
write path through n8n across the whole project.

**Revisit at v2 if:** a lead's full history needs to be read back into a new device's chat
window (needs a read-only `/api/lead/history` path — no rule conflict, just not built yet), or
if the two-workflow write duplication becomes a real maintenance burden and a shared
"lead-writer" sub-workflow is warranted.
