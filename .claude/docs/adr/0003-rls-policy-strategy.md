# ADR-0003: RLS policy strategy for backend pipeline access

**Status:** proposed  
**Date:** 2026-06-27

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

*To be decided after verifying n8n credential configuration.*

- If n8n uses the service role key and the client-level bypass works end-to-end → accept Option B, document the credential requirement.
- If bypass is unreliable or anon key access is needed → accept Option A, write explicit policies in a new migration.

## Consequences

- Option A: one migration file (`20260627_rls_service_role_policies.sql`) with four `CREATE POLICY` statements; append-only, auditable
- Option B: no migration needed; risk of silent access failure if key is misconfigured
- Either way: `anon` role must remain blocked on all pipeline tables
