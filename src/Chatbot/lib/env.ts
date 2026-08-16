// Per .claude/rules/chatbot.md: never access process.env directly elsewhere —
// always go through this file.
//
// N8N_BANT_WEBHOOK_URL / N8N_LINK_LEAD_WEBHOOK_URL are server secrets — only
// import them from server code (API routes), never a "use client" component.
// The NEXT_PUBLIC_* vars below are inlined at build time and safe client-side.

export const N8N_BANT_WEBHOOK_URL = process.env.N8N_BANT_WEBHOOK_URL;
export const N8N_LINK_LEAD_WEBHOOK_URL = process.env.N8N_LINK_LEAD_WEBHOOK_URL;

export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
