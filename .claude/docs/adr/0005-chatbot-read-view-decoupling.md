# ADR-0005: Decouple the chatbot from the ingestion schema via a read view

**Status:** accepted
**Date:** 2026-07-02

## Context

The chatbot (`src/Chatbot/`) began as a sales-team prototype vibe-coded with Claude
Code. Its `schools` table is a flat, denormalized shape (serial-int PK, `curricula`
as a JSON string, `fees_min_usd`/`fees_max_usd` rolled onto the row) that diverges
from the normalized target schema in `db-tables.md` (UUID PK, `TEXT[]` arrays,
`school_fees` as a separate per-year-group table). Both need to live in one Supabase
database: ingestion (n8n) writes the normalized tables; the chatbot reads school data
and writes its own leads/messages.

Two integration models were considered:

**Option A — Chatbot codes against the normalized schema directly.**
The app writes joins/aggregates over `schools` + `school_fees`. Fewer database
objects, but every ingestion-schema refactor risks breaking the app, and the
sales-team's ongoing vibe-coding would have to track the normalized shape.

**Option B — Chatbot reads a projection view; never owns the schools table.**
A `schools_chatbot` view projects the normalized tables down to the exact flat shape
the app already queries. The view is a stable contract: ingestion evolves underneath
it without breaking the app, and app changes merge back cleanly.

The overriding requirement is that migrating a new prototype version into the project
solution stays cheap — the sales person keeps iterating, we keep merging.

## Decision

Adopt **Option B — read-view decoupling.**

- Create the `schools_chatbot` view (migration `20260702120000_create_schools_chatbot_view.sql`)
  mapping normalized columns to the chatbot's flat contract; `fees_min/max_usd` are
  `MIN/MAX` over `yearly_fee` rows converted to USD, and only `scrape_status='ok'`
  rows are exposed.
- The chatbot is a **read-only** consumer of school data and never owns the `schools`
  table. Its Drizzle model binds to the view (`schools.id` retyped serial-int → UUID).
- The chatbot **owns** `leads` and `messages` (migration
  `20260702_create_chatbot_leads_messages.sql`).
- Split `db/schema.ts` into `schema.leads.ts` (chatbot-owned) and `schema.schools.ts`
  (project-owned view mapping) so a prototype version bump touches only the
  chatbot-owned files and app code.

## Consequences

- **Easier:** ingestion schema changes are absorbed by the view; prototype version
  updates merge with minimal conflict; the read contract is explicit and testable.
- **Harder:** the view carries a fee-currency conversion (static FX rates for now —
  see the phase-2 note in `plan_mvp.md`); a breaking change to the chatbot's expected
  columns still requires a coordinated view update.
- **RLS interaction — refines [ADR-0003](0003-rls-policy-strategy.md):** the view runs
  `security_invoker=on`, so the chatbot needs read access to the underlying tables.
  This migration adds public-read (`anon`, `authenticated`) `SELECT` policies on
  `schools` and `school_fees` — a deliberate exception to ADR-0003's "anon must remain
  blocked on all pipeline tables," justified because school directory data is public
  and non-sensitive. `scrape_queue`, `leads`, and `messages` remain closed to `anon`.
  ADR-0003 should be updated to accepted state reflecting this carve-out.
