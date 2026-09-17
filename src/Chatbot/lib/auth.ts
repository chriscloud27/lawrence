// No `server-only` import: that package is not a dependency here, and it would
// be belt-and-braces anyway — this module reaches `next/headers` through
// supabase-server, which already fails the build if pulled into a client
// component.

import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseRequestClient } from "@/lib/supabase-server";

/**
 * Data Access Layer session check.
 *
 * The auth gate in `app/(admin)/layout.tsx` is NOT a security boundary on its
 * own: Next.js renders a layout and its page concurrently, so a page's data
 * fetch starts before the layout's `redirect()` resolves. Against the hosted
 * project that surfaced as `permission denied for table leads` logged on every
 * unauthenticated GET /admin — the query really had run, and only the missing
 * grant stopped it.
 *
 * So the check lives next to the data instead, which is what the Next.js
 * authentication guide recommends (node_modules/next/dist/docs/01-app/
 * 02-guides/authentication.md, "Creating a Data Access Layer"). RLS is still
 * what scopes rows to an agency (ADR-0016); this only stops an anonymous
 * request from reaching the query at all.
 *
 * `cache()` memoises per render pass, so several call sites in one page cost
 * one `getUser()`.
 */
export const requireUser = cache(async () => {
  const supabase = await getSupabaseRequestClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");
  return user;
});
