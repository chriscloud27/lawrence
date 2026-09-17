// Server-only Supabase client for reading public directory data (schools_chatbot)
// over the REST API (PostgREST), not the direct Postgres DATABASE_URL connection
// (which requires IPv6, see .env.example).
//
// Uses the anon key, not the service role key: schools_chatbot only grants
// SELECT to anon/authenticated (see the view's migration) — this is public,
// read-only directory data, so anon is the correct, least-privileged key here.

import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
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

// Cookie-bound client for anything behind auth (the Admin route group).
//
// The singleton above carries no session, so every RLS policy that keys off
// auth.uid() sees NULL and returns nothing — correct for the public schools
// directory, useless for counsellor-facing reads. This one reads the Supabase
// auth cookies, so `leads_agency_select` and friends (ADR-0016) resolve to the
// signed-in counsellor's agency.
//
// Not a singleton: the cookie store is per-request.
export async function getSupabaseRequestClient() {
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured");
  }

  const cookieStore = await cookies();

  return createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        // Server Components cannot set cookies; middleware/route handlers can.
        // Swallowing here is the documented @supabase/ssr pattern — the session
        // refresh is retried on the next request that can write.
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* called from a Server Component — ignore */
        }
      },
    },
  });
}
