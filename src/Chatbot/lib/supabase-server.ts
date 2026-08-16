// Server-only Supabase client for reading public directory data (schools_chatbot)
// over the REST API (PostgREST), not the direct Postgres DATABASE_URL connection
// (which requires IPv6, see .env.example).
//
// Uses the anon key, not the service role key: schools_chatbot only grants
// SELECT to anon/authenticated (see the view's migration) — this is public,
// read-only directory data, so anon is the correct, least-privileged key here.

import { createClient } from "@supabase/supabase-js";
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from "@/lib/env";

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseServerClient() {
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured");
  }
  if (!client) {
    client = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
