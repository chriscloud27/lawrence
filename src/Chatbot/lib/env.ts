// Per .claude/rules/chatbot.md: never access process.env directly elsewhere —
// always go through this file.
//
// N8N_LINK_LEAD_WEBHOOK_URL is a server secret — only import it from server
// code (API routes), never a "use client" component. The NEXT_PUBLIC_* vars
// below are inlined at build time and safe client-side.
//
// n8n is ingestion-only after ADR-0018: the chat webhook is gone, the
// post-sign-in identity link (ADR-0008) stays.

export const N8N_LINK_LEAD_WEBHOOK_URL = process.env.N8N_LINK_LEAD_WEBHOOK_URL;

export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Upstash Redis — rate limiting (build step 11). Server secrets: never import
// these from a "use client" component. Absent in dev the limiter fails open;
// absent in production it fails closed (see lib/rate-limit.ts).
export const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
export const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// NODE_ENV routed through here too, so the "process.env only in lib/env.ts"
// rule in .claude/rules/chatbot.md holds as a literal grep, not just in spirit.
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

// --- AI provider seam (build step 12) ---------------------------------------
// Model IDs are overridable per job so a routing experiment is an env change,
// not a code change. Defaults live in lib/ai/provider.ts — the only file
// allowed to name a model (.claude/rules/ai-providers.md).
export const AI_MODEL_PARENT_TURN = process.env.AI_MODEL_PARENT_TURN;
export const AI_MODEL_BANT_DELTA = process.env.AI_MODEL_BANT_DELTA;
export const AI_MODEL_BANT_REFINE = process.env.AI_MODEL_BANT_REFINE;
export const AI_MODEL_SCHOOL_ENRICH = process.env.AI_MODEL_SCHOOL_ENRICH;

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Open-weight endpoints (Together, Fireworks, DeepSeek, …) are reached through
// the OpenAI-compatible provider. Wired, but no job routes here today.
// AI_COMPAT_REGION is not optional decoration: ADR-0015 requires a candidate
// endpoint to declare the region it serves from before it can be evaluated.
export const AI_COMPAT_BASE_URL = process.env.AI_COMPAT_BASE_URL;
export const AI_COMPAT_API_KEY = process.env.AI_COMPAT_API_KEY;
export const AI_COMPAT_REGION = process.env.AI_COMPAT_REGION;

// --- Write path (build step 14, ADR-0018) -----------------------------------
// The service-role key bypasses RLS. It is read here and used in exactly one
// place — lib/supabase-admin.ts, from Inngest functions and the chat route's
// config read. Never from a component, never from a "use client" file.
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Which tenant the public widget writes into. Single-tenant per deployment for
// the prototype; a host-based resolver is a v2 concern (ADR-0018).
export const AGENCY_SLUG = process.env.AGENCY_SLUG ?? "demo-agency";

// Hot-lead escalation. Resend replaces the n8n Gmail node — which, per
// ADR-0017, was wired to an unreachable branch and never sent anything.
export const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const RESEND_FROM = process.env.RESEND_FROM;
export const ADMISSIONS_EMAIL = process.env.ADMISSIONS_EMAIL;

// Inngest. Unset locally: `npx inngest-cli dev` needs no keys.
export const INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY;
export const INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY;

// Absolute base URL, used to build the deep link in the hot-lead email — a
// relative path is meaningless in an inbox.
export const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// The booking link the offer_calendar tool returns. Was a plaintext value in
// the n8n init-secrets SET node; an env var now.
export const CALENDLY_URL = process.env.CALENDLY_URL;
