# Chatbot Rules

## Overview
Next.js 16 app (`src/Chatbot/`) — frontend for querying data stored in Supabase via n8n pipelines.
Uses Anthropic SDK for AI responses, Drizzle ORM + better-sqlite3 for local state, shadcn/ui + Tailwind for UI.

## Model Selection
- Default to `claude-haiku-4-5` for fast, cheap chat turns
- Use `claude-sonnet-4-6` only when reasoning over complex query results requires it
- Always declare the model as a named constant at the top of the file — never inline in the API call

## Drizzle / SQLite
- Schema lives in `src/Chatbot/db/` — one file per logical domain
- Run `npm run seed` to populate local dev data; do not commit the generated `.db` file
- Migrations: use `drizzle-kit generate` → commit the SQL → apply on startup or via seed script
- Never write raw SQL strings outside of Drizzle query builders

## Supabase Integration
- Read from Supabase via the shared Supabase client — do not create a second client instance
- All Supabase calls are read-only from the chatbot; writes go through n8n pipelines only
- Use environment variable `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

## Next.js Conventions
- This version (16.x) has breaking changes — read `node_modules/next/dist/docs/` before editing routing or server actions
- Use App Router (`src/Chatbot/app/`) — no Pages Router
- Server Components by default; add `"use client"` only when browser APIs or state are required
- API routes live in `app/api/` — keep them thin, delegate logic to `lib/`

## Environment Variables
- Document all required vars in `.env.example` at repo root
- Never access `process.env` directly in components — wrap in `src/Chatbot/lib/env.ts`

## Structure
- `app/` — routes and layouts
- `components/` — shared UI components (shadcn-based)
- `lib/` — business logic, Supabase client, Anthropic client
- `db/` — Drizzle schema and local SQLite helpers
- `scripts/` — one-off scripts (seed, migrations); not imported by app code
