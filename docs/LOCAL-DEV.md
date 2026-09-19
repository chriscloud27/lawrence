# Running Lawrence locally

Everything in this file runs on your machine against a **local** Supabase stack. Nothing here
touches the hosted project, and nothing here deploys.

You are done when the nine checks in [the smoke test](#the-smoke-test) pass: a parent chats, tokens
stream, BANT scores, the lead and transcript persist, a counsellor sees the row in Admin, and a
counsellor at another agency does not.

---

## 1. Prerequisites

| What | Why | Note |
|---|---|---|
| A Docker engine | The Supabase local stack is Docker-backed | Docker Desktop or Rancher Desktop. **Start it yourself** — `supabase start` will not start it for you, and its failure message talks about a missing socket, not a missing app |
| Node.js 22 | What this is built and verified on | No `engines` field is declared, so older majors are untested. `npm test` uses `node --test` with the `tsx` loader |
| `supabase` CLI | Migrations, the local stack, seeds | `brew install supabase/tap/supabase`. Verified on 2.117.0 |

---

## 2. Environment

There is **one** `.env.local`, at the repo root. `src/Chatbot/.env.local` is a symlink to it, and
`.env.example` documents every key with placeholder values only. Per
[`.claude/rules/secrets.md`](../.claude/rules/secrets.md) you fill `.env.local` by hand; never
commit it, never print it.

Keys this build added:

| Key | Source | Added by step |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Upstash console → Redis → REST API | 11 |
| `ANTHROPIC_API_KEY` | Anthropic console — set a monthly budget alert at the same time | 12 |
| `RESEND_API_KEY`, `RESEND_FROM`, `ADMISSIONS_EMAIL` | Resend dashboard | 14 |
| `CALENDLY_URL` | Your booking link; the `offer_calendar` tool returns it | 14 |
| `AGENCY_SLUG` | Which tenant the public widget writes into — `demo-agency` locally | 14 |

### The local-stack override

The repo-root `.env.local` points Supabase at the **hosted** project — that is what the ingestion
scripts and `supabase db push` expect. Local dev needs the opposite, so the Chatbot carries a
second, git-ignored file:

```
src/Chatbot/.env.development.local
```

Next.js loads `.env.development.local` **before** `.env.local`, so its keys win in `npm run dev`
while everything it does not mention (your `ANTHROPIC_API_KEY`, the Upstash pair) still comes from
`.env.local`. It holds:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from `supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<from `supabase status`>
AGENCY_SLUG=demo-agency
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CALENDLY_URL=<your booking link>
```

The two Supabase values are the fixed, published local-stack development keys — identical in every
`supabase start`, not secrets. Read them with `supabase status -o json` rather than pasting them
from anywhere else.

> **Without this file the app talks to the hosted project**, where the `agent_config` migration is
> not yet applied, and `/api/chat` answers 500 on the first turn.

### One trap worth knowing

`process.env` beats every dotenv file. If `ANTHROPIC_API_KEY` is exported in the shell that starts
the dev server, it shadows the real key in `.env.local` and every model call fails with
`authentication_error: x-api-key header is required` — which reads like a broken key, not a
shadowed one. Check the shell before the file:

```bash
echo ${ANTHROPIC_API_KEY:+set in shell, length ${#ANTHROPIC_API_KEY}}
env -u ANTHROPIC_API_KEY npm run dev   # if it is
```

---

## 3. The processes

Start the Docker engine first, then each of these in its own terminal:

```bash
# 1 — Postgres + Auth + Studio (Docker-backed)
supabase start

# 2 — replay every migration, then seed_demo_agency.sql
supabase db reset

# 3 — the two local counsellors. `db reset` wipes auth.users, so this runs after it.
./scripts/seed-local-counsellors.sh

# 4 — durable steps: scoring, the leads upsert, the messages insert, the hot-lead email
npx inngest-cli@latest dev -u http://127.0.0.1:3000/api/inngest

# 5 — the app
cd src/Chatbot && npm run dev
```

Steps 2–5 in one command, from `src/Chatbot`:

```bash
npm run dev:reset
```

Useful URLs once all five are up:

| | |
|---|---|
| App | http://localhost:3000 |
| Admin | http://localhost:3000/admin |
| Supabase Studio | http://127.0.0.1:54323 |
| Mailpit (local auth mail) | http://127.0.0.1:54324 |
| Inngest dev UI | http://localhost:8288 |

### Optional: school data

The `search_schools` tool reads the `schools_chatbot` view, which is empty on a fresh reset. To
load the five Bangkok schools from saved Doris pages:

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_KEY=$(supabase status -o json | python3 -c 'import json,sys;print(json.load(sys.stdin)["SERVICE_ROLE_KEY"])') \
node scripts/upsert-schools.mjs --yes
```

They land as `scrape_status = 'needs_review'` — correctly, since JSON-LD alone cannot fill
`curricula`, `strengths` or `sen_support` — and the view filters on `= 'ok'`, so the agent still
sees nothing. For a local run where you want the tool to return rows, promote them and know that
you are looking at incomplete records:

```sql
UPDATE schools SET scrape_status = 'ok' WHERE scrape_status = 'needs_review';
```

---

## 4. Seeded identities

`supabase db reset` seeds two agencies with six and two leads. `seed-local-counsellors.sh` creates
one owner for each and links the memberships.

| Agency | Counsellor | Leads |
|---|---|---|
| `demo-agency` — Demo Education Consultants | `counsellor@demo-agency.test` | 6 seeded, plus everything your chat writes |
| `rival-agency` — Rival Admissions Advisory | `counsellor@rival-agency.test` | 2 seeded |

Both use the password in `scripts/seed-local-counsellors.sh` (override with
`SEED_COUNSELLOR_PASSWORD`). It is a throwaway for a container on your laptop.

**The second identity is not decoration.** It is the only way to run check 5, and check 5 is the
only one that proves RLS rather than assuming it.

---

## 5. Known local limitations

Stated, not worked around.

- **Resend without a verified domain** delivers only to your own account address. With no
  `RESEND_API_KEY` at all, the `notify-admissions` step fails loudly as a `NonRetriableError` and
  releases its `escalated_at` claim — which is the designed behaviour, not a bug: a hot lead is
  never silently dropped. Do not stub the step out to make a checklist green.
- **The Inngest dev server keeps no durable history.** Retries are visible while it runs; restart
  it and the run history is gone.
- **Google OAuth** needs two things that live outside this repo. `supabase/config.toml` enables the
  provider and reads `GCP_OAUTH_CLIENT_ID` / `GCP_OAUTH_CLIENT_SECRET` from the repo-root `.env`
  (a symlink to `.env.local`) — if either is missing, `/auth/v1/authorize` answers
  `400 Unsupported provider: provider is not enabled`. The Google Cloud OAuth client must also list
  the **local** callback as an authorized redirect URI:

  ```
  http://127.0.0.1:54321/auth/v1/callback
  ```

  Note that `localhost` and `127.0.0.1` are different origins to the auth server. `site_url` is
  `http://127.0.0.1:3000` while the app is served from `localhost:3000`, so both are wildcarded in
  `additional_redirect_urls`. Config changes need `supabase stop && supabase start` — a reset alone
  does not reload `config.toml`.
- **The hosted project is a migration behind.** `20260916181457_create_agent_config` is local-only
  until someone runs `supabase db push`.

---

## Setting up Google sign-in

Both sign-in paths use Google: the parent's post-conversation identity link (ADR-0008,
`ChatWidget.tsx`) and the counsellor's Admin sign-in (`SignInForm.tsx`). Both call
`signInWithOAuth({ provider: "google" })` with `redirectTo: window.location.origin + "/auth/callback"`.

The flow has three hops, and each one has to be told about the next:

```
browser  →  Supabase /auth/v1/authorize   (needs the provider enabled)
         →  Google consent screen          (needs the redirect URI registered)
         →  Supabase /auth/v1/callback     (exchanges the code)
         →  your app /auth/callback        (needs to be in the redirect allow-list)
```

### 1. Google Cloud — pick the project

<https://console.cloud.google.com/> → project picker → the project that owns your OAuth client.
If you are starting fresh, create one; the name is cosmetic.

### 2. Configure the consent screen

**APIs & Services → OAuth consent screen** (newer consoles: **Google Auth Platform → Branding**).

- **User type / audience: External.** Internal requires a Google Workspace organisation.
- Fill in app name and support email. Nothing else is required for testing.
- **Scopes:** Supabase requests `email profile` only. You do not need to add sensitive or
  restricted scopes, which means you do not need verification.
- **Test users:** while the app is in *Testing*, only listed test users can sign in. Add every
  Google account you intend to sign in with — including your own. This is the most common cause of
  `access_denied` after an otherwise correct setup.

### 3. Create (or edit) the OAuth client

**APIs & Services → Credentials → Create credentials → OAuth client ID** (newer consoles:
**Google Auth Platform → Clients**).

- **Application type: Web application.**
- **Authorized redirect URIs** — this is the one that matters:

  ```
  http://127.0.0.1:54321/auth/v1/callback
  ```

  Add the hosted one too, so the same client works in both environments:

  ```
  https://<your-project-ref>.supabase.co/auth/v1/callback
  ```

  Three things to get right:

  - It is the **Supabase** callback, not your app's. Google returns to Supabase, which exchanges the
    code and only then forwards to `http://localhost:3000/auth/callback`. Registering your app's URL
    instead is the classic mistake and produces `redirect_uri_mismatch`.
  - **`127.0.0.1`, not `localhost`.** Supabase derives this from its API URL, and Google matches the
    string exactly — the two hostnames are not interchangeable here. Check what your stack actually
    sends with the curl in step 5.
  - **`http`, not `https`.** Google permits plain http for loopback addresses; it will reject it for
    any other host.

- **Authorized JavaScript origins:** leave empty. This is a server-side code exchange, so no
  browser-side token request happens. Add `http://localhost:3000` only if the console insists.

Copy the client ID and secret.

### 4. Put the credentials in `.env.local`

At the repo root, matching the names `supabase/config.toml` already references:

```
GCP_OAUTH_CLIENT_ID=<the client id>
GCP_OAUTH_CLIENT_SECRET=<the client secret>
```

The CLI reads these through `env()` substitution from the root `.env` symlink — they are never
written into `config.toml` itself (`.claude/rules/secrets.md`).

### 5. Restart the stack and verify

`supabase db reset` does **not** reload `config.toml`. A full restart does:

```bash
supabase stop && supabase start
```

Then check the provider without opening a browser:

```bash
curl -s -o /dev/null -w '%{http_code}\n%{redirect_url}\n' \
  "http://127.0.0.1:54321/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback"
```

- `400` with `Unsupported provider: provider is not enabled` — the credentials did not resolve.
  Check the two variable names in `.env.local`, then restart again.
- `302` to `accounts.google.com` — the provider is live. Read the `redirect_uri` parameter in that
  URL: **it must match, character for character, what you registered in step 3.**

Google can take a few minutes to propagate a new redirect URI. If step 3 looks right and you still
get `redirect_uri_mismatch`, wait and retry before changing anything.

### 6. Give the new user an agency

A Google sign-in creates a **new** `auth.users` row with no `agency_members` row. `requireUser()`
lets it through, `getCurrentAgency()` returns `null`, and RLS returns zero rows — so `/admin` loads
and is simply empty. That is not a broken gate; it is a counsellor who belongs to no agency.

Link the account after its first sign-in:

```sql
INSERT INTO agency_members (agency_id, user_id, role)
SELECT a.id, u.id, 'owner'
FROM agencies a, auth.users u
WHERE a.slug = 'demo-agency' AND u.email = '<your google address>'
ON CONFLICT (agency_id, user_id) DO NOTHING;
```

The seeded `counsellor@demo-agency.test` / `counsellor@rival-agency.test` accounts already have
memberships and need none of this — for the smoke test, they remain the faster path.

---

## The smoke test

Nine end-to-end checks, in order, from a clean `supabase db reset`. None of them passes by a unit
test. Record pass/fail per check — not a summary sentence.

1. **Streaming.** Open `/` and chat as a parent. The first token renders before the full reply.
2. **Two-stage scoring.** Talk your way into the 50–75 band. Stage 2 fires. The parent never sees a
   number, a threshold, a band name, or the word "qualification" — check the rendered text *and*
   the network payload.
3. **Persistence.** `select id, score, classification, agency_id, source from leads` → one row,
   correct band, correct agency, `source = 'chatbot'`. `messages` holds the whole transcript in
   order, both roles.
4. **Counsellor read.** Sign in as the `demo-agency` counsellor, open `/admin`. The lead is in the
   list with its real score, `font-mono`, with a score-band badge.
5. **Isolation.** Sign in as the `rival-agency` counsellor. The lead is **not** visible.
6. **Config ownership.** Edit the system prompt under Admin → Assistant. The next turn reflects it
   with no redeploy. "Make this live" on the previous version reverts it.
7. **Evals.** `npx promptfoo eval` at the repo root — every trajectory lands in its expected
   routing tier and the persona assertions pass.
8. **Ceilings.** 21 rapid requests to `/api/chat` from one IP → the 21st is `429` with
   `Retry-After`. Turn 26 on one `sessionId` returns a conversational close at HTTP 200.
9. **Auth gate.** An unauthenticated request to `/admin` redirects to `/sign-in`.

Checks 8 and 1–3 spend real model tokens. To exercise the IP ceiling without them, seed the session's
turn counter past the cap first — past the cap the route answers with fixed copy and never calls a
model:

```bash
curl -s "$UPSTASH_REDIS_REST_URL/set/lw:turns:<sessionId>/25/EX/600" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

Note that the session limiter (30 per 24 h) and the IP limiter (20 per 60 s) are different
ceilings. Probing one will eventually trip the other; use a fresh `sessionId` and let the 60-second
IP window drain between runs.

---

## Where things live

| | |
|---|---|
| The agent | `src/Chatbot/app/api/chat/route.ts` |
| Scoring | `src/Chatbot/lib/bant/` — `keywords.ts` Stage 1, `delta.ts` Stage 2 |
| Writes | `src/Chatbot/inngest/functions/score-and-persist.ts` |
| Model routing | `src/Chatbot/lib/ai/provider.ts` — the only file allowed to name a model |
| Prompts | `src/agents/prompts/*.txt`, staged into `src/Chatbot/.prompts/` at `predev`/`prebuild` |
| Schema spec | `.claude/docs/data/db-tables.md` |

Background and the decision trail: [`docs/prototype.md`](prototype.md) and
[`.claude/docs/adr/`](../.claude/docs/adr/).
