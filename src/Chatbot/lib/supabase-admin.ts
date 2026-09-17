// Service-role Supabase client — the only client in this app that bypasses RLS.
//
// Used by exactly two callers, and the constraint is deliberate:
//
//   * Inngest functions (inngest/functions/*) — the write path. ADR-0018 moved
//     lead and message writes off n8n and into retried background steps; those
//     steps run with no user session, so RLS has no auth.uid() to key off.
//   * The chat route's agent_config read — the parent is anonymous, and the
//     active prompt for one agency must not be readable by another's visitors,
//     so the table grants nothing to anon.
//
// Never import this from a component, a "use client" file, or a counsellor-
// facing Admin page. Admin writes go through getSupabaseRequestClient() so RLS
// enforces the owner-only policies (ADR-0016) rather than trusting the route.
//
// Not a singleton across requests by accident: the client is stateless and
// session-free, so one module-level instance is correct and cheap.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

let admin: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured — the write path cannot run"
    );
  }
  if (!admin) {
    admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
