"use client";

// Counsellor sign-in, two doors into the same auth system:
//
//   * Email + password — what the local seeded counsellors use
//     (scripts/seed-local-counsellors.sh).
//   * Google — what a real counsellor created through the Supabase dashboard's
//     Google provider has. Such an account has NO password, so the form above
//     can never sign it in; without this button the hosted project is
//     unreachable. Same `/auth/callback` route the parent widget uses
//     (ADR-0008), with `next` carried through so it lands on /admin.
//
// Uses the shared browser client — no second Supabase client instance
// (.claude/rules/chatbot.md). It writes the session cookies the cookie-bound
// server client then reads.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_LABEL, INPUT } from "@/components/admin/ui";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "no-agency"
      ? "That account is signed in but belongs to no agency. Ask an owner to add you."
      : null,
  );
  const [pending, setPending] = useState(false);

  const signInWithGoogle = () => {
    setPending(true);
    setError(null);
    getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      // redirectTo lives under `options` — same shape as ChatWidget.tsx.
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }

    // refresh() so the server layout re-runs with the new cookies before push.
    router.refresh();
    router.push(next);
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-[400px] rounded-lw-lg border border-lw-border bg-lw-bg p-lw-xl"
    >
      <h1 className="mb-lw-lg text-xl font-bold text-lw-text">Sign in</h1>

      <div className="mb-lw-lg">
        <label className={FIELD_LABEL} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          className={INPUT}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="mb-lw-lg">
        <label className={FIELD_LABEL} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          className={INPUT}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="mb-lw-md text-[13px] text-lw-error">{error}</p>}

      <button type="submit" className={`${BTN_PRIMARY} w-full`} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div className="my-lw-lg flex items-center gap-lw-md">
        <span className="h-px flex-1 bg-lw-border" />
        <span className="text-[13px] text-lw-text-muted">or</span>
        <span className="h-px flex-1 bg-lw-border" />
      </div>

      {/* A Google-provider account has no password, so the form above cannot
          sign it in at all — this is the only working door for one. */}
      <button
        type="button"
        onClick={signInWithGoogle}
        className={`${BTN_SECONDARY} w-full`}
        disabled={pending}
      >
        Continue with Google
      </button>
    </form>
  );
}
