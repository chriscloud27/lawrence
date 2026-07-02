# ADR-0003: RLS policy strategy for backend pipeline access

**Status:** accepted  
**Date:** 2026-06-27  
**Updated:** 2026-07-02 (decision resolved; see [ADR-0005](0005-chatbot-read-view-decoupling.md))

## Context

All tables in the schools schema have Row Level Security enabled. Without explicit
policies, every query from a backend service is rejected — regardless of whether the
client presents a valid service role key.

Two approaches are under consideration:

**Option A — Explicit `service_role` policies per table**  
Write a `CREATE POLICY` for each table granting `service_role` full read/write access
(`USING (true) WITH CHECK (true)`). Policies are visible in migrations, auditable, and
explicit about intent.

**Option B — Rely on Supabase client-level RLS bypass**  
The Supabase JS/HTTP client initialized with the service role key bypasses RLS at the
API layer without requiring any policy. n8n's built-in Supabase node uses this path if
configured with the service key. No migration required, but the bypass is implicit and
not visible in the schema.

The tradeoff: Option A is explicit and database-enforced; Option B is simpler but
depends on correct client configuration — a misconfigured client (e.g., using the anon
key by mistake) would silently fail with no schema-level safety net.

## Decision

Adopt **Option B (service-role bypass) for all writes**, with a narrow Option-A
carve-out for public read access:

- Pipeline writes (n8n) authenticate with `SUPABASE_SERVICE_KEY` and the chatbot
  connects via a direct superuser `DATABASE_URL` — both bypass RLS at the client
  layer, so no write policies are required.
- **Exception:** the chatbot reads school data through the `schools_chatbot` view
  (`security_invoker=on`), which requires the caller to hold read rights on the
  underlying tables. [ADR-0005](0005-chatbot-read-view-decoupling.md) therefore adds
  explicit public-read (`anon`, `authenticated`) `SELECT` policies on `schools` and
  `school_fees` only — justified because school directory data is public and
  non-sensitive.

## Consequences

- No `service_role` write-policy migration is needed; access depends on correct
  credential configuration (documented in `.env.example`).
- `schools` and `school_fees` are readable by `anon`/`authenticated` (public directory
  data). This is a deliberate relaxation of the original "anon blocked everywhere"
  stance.
- `scrape_queue`, `leads`, and `messages` remain closed to `anon` — no read or write
  policies, RLS enabled.
