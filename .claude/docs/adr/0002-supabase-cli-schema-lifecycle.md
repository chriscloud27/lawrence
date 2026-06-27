# ADR-0002: Supabase CLI as the schema lifecycle manager

**Status:** accepted  
**Date:** 2026-06-27

## Context

The project requires a repeatable, version-controlled process for schema authoring,
local validation, and promotion to production. Options considered:
- Manual DDL execution against a shared database
- Raw `psql` scripts managed outside any toolchain
- Supabase CLI with its built-in migration runner and shadow-database diff engine

The Supabase CLI provides a local Postgres instance (via Docker), a shadow database
for non-destructive diffing, and a migration history table (`supabase_migrations`)
that tracks applied migrations — equivalent to Flyway/Liquibase history tables.

## Decision

The Supabase CLI is the sole tool for schema lifecycle management:

- **Local environment:** `supabase start` provisions a local Postgres instance
  (port 54322) and applies all pending migrations on startup.
- **Schema authoring:** all DDL changes are written as sequential migration files
  in `supabase/migrations/` using the format `{UTC timestamp}_{description}.sql`.
- **Validation:** `supabase db diff` spins up a shadow database, applies migrations
  in order, and diffs against the live local instance. A clean diff (no output)
  confirms the local schema matches the migration history exactly.
- **Reset:** `supabase db reset` recreates the local database from scratch and
  replays all migrations — used to verify idempotency and recover from drift.
- **Promotion:** `supabase db push` applies pending migrations to the linked remote
  project (staging or production) in migration-order sequence.

## Consequences

- Schema drift is detectable at any time via `supabase db diff`
- Migrations must be append-only; applied migrations must never be edited
- All DDL must go through migration files — ad-hoc DDL executed directly against
  local or remote instances will cause drift and be caught on the next diff
- Docker Desktop is a prerequisite for local development
