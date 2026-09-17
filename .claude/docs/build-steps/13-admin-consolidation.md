# Step 13 — Fold Admin Into the Chatbot App

> Critical Change 03 in `.claude/docs/stack-audit.md`. Three apps, two React majors, and two
> Tailwind majors means every dependency bump is three PRs and every shared component gets written
> twice. For a two-person team that is the difference between shipping features and doing
> maintenance.
>
> **Run this before Step 14.** Step 14 needs an Admin surface for the `agent_config` form, and
> building that form in the Vite app would mean writing it twice.

## Assumes

- Steps 10–12 complete
- `src/Admin/` is Vite 5 + React 18 with seven screens under `src/Admin/src/screens/`
- `src/Chatbot/` is Next.js 16 + React 19 with Tailwind v4 `@theme` tokens in `app/globals.css`
- `src/Admin/src/styles/design-tokens.css` defines `--lw-*` as **raw hex** — this predates
  `.claude/rules/design.md` and violates it
- `src/Admin/src/context/ThemeContext.tsx` implements theme switching independently

## Task

Make Admin a route group in the Chatbot Next app: one deploy, one auth surface, one dependency
graph. Landing stays independent — it is a static export with different caching and a different
audience, and that separation is earning its keep.

### 1. Route group — `src/Chatbot/app/(admin)/`

Move the seven screens to routes. A route group keeps the URL clean and gives Admin its own layout
without affecting the parent-facing chat.

| Screen | Route |
|---|---|
| `Dashboard.tsx` | `app/(admin)/admin/page.tsx` |
| `ParentDetail.tsx` | `app/(admin)/admin/parents/[id]/page.tsx` |
| `SearchProfile.tsx` | `app/(admin)/admin/parents/[id]/profile/page.tsx` |
| `NextStep.tsx` | `app/(admin)/admin/parents/[id]/next-step/page.tsx` |
| `IntakeForm.tsx` | `app/(admin)/admin/forms/[id]/page.tsx` |
| `FormBuilder.tsx` | `app/(admin)/admin/forms/[id]/build/page.tsx` |
| `DocumentUpload.tsx` | `app/(admin)/admin/parents/[id]/documents/page.tsx` |

`app/(admin)/layout.tsx` holds the Admin chrome and the auth gate.

### 2. Server Components by default

Per `.claude/rules/chatbot.md`, add `"use client"` only where browser APIs or state are actually
required. The Vite screens are all client components by construction; most of the data fetching in
them should move to the server component and pass props down.

`FormBuilder` and `DocumentUpload` are genuinely interactive and stay client.

### 3. Retire the duplicate token layer

`src/Admin/src/styles/design-tokens.css` and the four screen-level `.css` files use raw hex, which
`.claude/rules/design.md` forbids. Do not port them.

Map every Admin style onto the existing `lw-*` Tailwind utilities in
`src/Chatbot/app/globals.css`. Two rules carry most of the work:

- **Score-band colours are diagnostic, not interactive.** `--lw-score-cold` / `-warm` /
  `-qualified` / `-hot` are correct here — Admin *is* the internal-user surface those tokens exist
  for. They must never become button backgrounds.
- **Score numbers are `font-mono`.** All other text is `font-sans`.

If a genuinely new semantic is needed, follow the process in `.claude/rules/design.md`: propose it
in `.claude/DESIGN.md` first, map it to a Tailwind family, then wire it into `@theme`. Never a
local hex.

### 4. Theme

Delete `ThemeContext.tsx`. The Chatbot app wires dark mode through the `dark` custom variant on
`[data-theme="dark"]` — one mechanism, not two.

### 5. Auth gate

Admin is counsellor-facing and must not be reachable by a parent. Gate `app/(admin)/layout.tsx`
with the existing Supabase session from `lib/supabase-server.ts`.

This is where the audit's Supabase argument pays off concretely: `agency_id` in the JWT makes
tenant isolation an RLS policy rather than a check every future query must remember. ADR-0013 has
settled this — Supabase stays, and `auth.uid()` is the multi-tenancy primitive. Do not add
application-level tenant filtering that duplicates the policy: two isolation mechanisms means the
weaker one eventually wins an argument nobody is watching.

### 6. Shared types

`src/Admin/src/types/lawrence.ts` and `src/Admin/src/utils/score.ts` duplicate concepts the Chatbot
needs. Move both to `src/Chatbot/types/` and `src/Chatbot/lib/` and delete the originals.

`getBandColor()` in `score.ts` returns raw hex for both themes. It must not survive in that form —
return token class names instead, and let CSS handle the theme.

### 7. Real rows, not `mock-data.ts`

Porting the screens onto the mock fixtures would leave the dashboard a picture of a dashboard.
The route group reads real `leads` and `messages` rows instead.

- **Factor out a cookie-bound server client.** `lib/supabase-server.ts` is an anon singleton with
  no session — it cannot see RLS-scoped rows. The pattern already exists inline in
  `app/auth/callback/route.ts` (`createServerClient` from `@supabase/ssr` + `cookies()`); lift it
  into `lib/supabase-server.ts` as a second export (`getSupabaseRequestClient`) and keep the anon
  singleton for the public schools directory.
- **`lib/leads.ts`** — `listLeads(filters)`, `getLead(id)`, `listMessages(leadId)`,
  `getCurrentAgency()`, modelled on `lib/schools.ts`. RLS does the tenant filtering; do **not** add
  an application-level `agency_id` filter on top (ADR-0016) — two isolation mechanisms means the
  weaker one eventually wins an argument nobody is watching.
- **Map `types/lawrence.ts` onto the real row shape.** The mock's `Parent` had `childName`,
  `yearGroup`, `preferredRegions`, `documents`, `criteria`, `activities`,
  `profileCompleteness` — none of which are columns. Fields with no column become empty states
  that say why, never invented values. The same applies to the mock dashboard's week-on-week
  trend deltas and "trending patterns": with no history table those were fiction and are not
  ported.
- Score bands stay four (35/50/75) and are a **display** concern. The three routing tiers in
  `.claude/rules/bant-scoring.md` (<50 / 50–75 / >75) decide what happens to a lead and live in
  `leads.classification`. Do not derive one from the other.

### 8. Remove the app

Delete `src/Admin/` once the routes render. Remove its `package.json`, `vite.config.ts`,
`tsconfig*.json`, `dist/`, and `*.tsbuildinfo`.

## Do Not

- Touch `src/Landing/`. Its Tailwind v3.4→v4 migration is a separate close call in the audit and is
  not part of this step.
- Port any raw hex value. Every colour resolves through an `lw-*` utility.
- Keep `dist/` or `*.tsbuildinfo` — build output does not belong in git.
- Add a second Supabase client. Use the shared one per `.claude/rules/chatbot.md`.
- Write to Supabase from an Admin page without routing through n8n, until Step 14 changes that rule
  deliberately. Today the chatbot is read-only from Supabase.

## Verify

- [ ] `npm run build` in `src/Chatbot` passes with no type errors
- [ ] All seven Admin routes render under `/admin`
- [ ] The dashboard lists the seeded leads with their real scores — no `mock-data.ts` anywhere
- [ ] A counsellor of the second seeded agency sees none of the first agency's leads
- [ ] `grep -rnE "#[0-9a-fA-F]{6}|rgba?\(" src/Chatbot/app src/Chatbot/components --include=*.tsx --include=*.css` returns only documented third-party brand-mark exceptions
- [ ] `grep -rnE "\b(blue|gray|slate|zinc|emerald|indigo)-[0-9]{2,3}\b" src/Chatbot/app/\(admin\)` returns nothing — no Tailwind default palette classes
- [ ] Score numbers render in `font-mono`; score-band colours appear on badges, never on buttons
- [ ] Toggling `[data-theme="dark"]` restyles every Admin screen; no `ThemeContext` import remains
- [ ] An unauthenticated request to `/admin` redirects to sign-in
- [ ] `src/Admin/` no longer exists; `git status` is clean of build output
- [ ] Only two apps remain: `src/Chatbot/` and `src/Landing/`
