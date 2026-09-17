# Step 16 — Local End-to-End Runbook

> Not a feature step. This is the runbook that turns six green checklists into one working
> product, and the definition of "the prototype is done" agreed for this build:
> **everything runs on the developer's machine against Supabase — chat streams from TypeScript,
> BANT scores, leads and messages persist, a counsellor sees the row in Admin, a counsellor at
> another agency does not.**
>
> Deployment (Vercel, KVM1, Uptime Kuma, nightly `pg_dump`) is deliberately **out of scope** and
> follows as its own step once this one is green.

## Assumes

- Steps 10–15 complete, each with its own Verify checklist passed
- `src/Admin/` no longer exists; the only apps are `src/Chatbot/` and `src/Landing/`
- `n8n/workflows/` retains `scrape-doris-school.json` and `link-lead.json`; the two chat workflows
  are deleted
- Docker Desktop is running (the Supabase local stack needs it)

## Task

### 1. Write `docs/LOCAL-DEV.md`

One file a new contributor can follow start to finish. Five sections:

**Prerequisites** — Docker Desktop, Node ≥ 20, `supabase` CLI via Homebrew. Note the Docker step
explicitly: the local Supabase stack does not start it for you.

**Environment** — one `.env.local` at the repo root; `src/Chatbot/.env.local` is a symlink to it
(`.env.example` header says so). List the keys this build added and where each comes from:

| Key | Source | Step |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Upstash console → Redis → REST API | 11 |
| `ANTHROPIC_API_KEY` | Anthropic console; set a monthly budget alert at the same time | 12 |
| `RESEND_API_KEY` | Resend dashboard | 14 |

Per `.claude/rules/secrets.md`: `.env.example` gets **placeholder values only** and the developer
fills `.env.local` by hand. Do not print, echo, or commit any of these.

**The four processes** — each in its own terminal:

```
supabase start                      # Postgres + Auth + Studio, Docker-backed
supabase db reset                   # replay all migrations + seed_demo_agency.sql
npx inngest-cli@latest dev          # durable steps, step 14
cd src/Chatbot && npm run dev       # the app
```

**Seeded identities** — the two agencies and their counsellors from Step 15, with how to sign in as
each. The second one is not decoration: it is the only way to run check 5 below.

**Known local limitations**, stated rather than worked around:

- **Resend without a verified domain** only delivers to your own account address. Use its test
  recipient and say so in the doc; do not fake a send or stub the step out.
- **Inngest dev server** has no durable storage across restarts — retries are visible, history is
  not.
- **Google OAuth** redirects to `NEXT_PUBLIC_URL`; the Supabase local project needs
  `http://localhost:3000/auth/callback` in its allowed redirect list.

### 2. Add a reset script

`npm run dev:reset` in `src/Chatbot/package.json` → `supabase db reset && npm run dev`. Every check
below starts from a clean replay; a half-migrated database produces failures that look like code
bugs and burn an afternoon.

### 3. Run the smoke test and record the result

The nine checks below, in order, from a clean `supabase db reset`. Record pass/fail per check in
the PR description — not a summary sentence.

## Verify — the smoke test

This is the whole step. Every item is end-to-end; none of them passes by a unit test.

- [ ] **1. Streaming.** Open `/`, start the chat as a parent. The first token renders before the
      full reply. If the reply appears all at once, `/api/chat` is buffering and Step 14's central
      claim is unmet.
- [ ] **2. Two-stage scoring.** Answer through pre-qual into the 50–75 band. Stage 2 fires and asks
      2–3 follow-ups. The parent never sees a number, a threshold, a band name, or the word
      "qualification" — check the rendered text *and* the network payload.
- [ ] **3. Persistence.** `select id, score, classification, agency_id, source from leads` → one
      row, correct band, correct agency, `source = 'chatbot'`. `messages` holds the full transcript
      in order, with both roles.
- [ ] **4. Counsellor read.** Sign in as the `demo-agency` counsellor, open `/admin`. That lead
      appears in the list with its real score, rendered `font-mono`, with a score-band badge.
- [ ] **5. Isolation.** Sign in as the `rival-agency` counsellor. The lead is **not** visible.
      This is the only check that proves RLS rather than assuming it. A pass here is the difference
      between multi-tenant and single-tenant-with-extra-columns.
- [ ] **6. Config ownership.** Edit the system prompt in the Admin `agent_config` form. The next
      turn reflects the change with no redeploy. Revert restores the previous version. This is the
      ADR-0006 requirement that survived the n8n cutover.
- [ ] **7. Evals.** `npx promptfoo eval` — all five trajectories from `.claude/rules/bant-scoring.md`
      land in the same routing tier as before the port, and the three persona assertions pass.
- [ ] **8. Ceilings.** 21 rapid requests to `/api/chat` from one IP → the 21st is `429` with
      `Retry-After`. Turn 26 on a single `sessionId` returns a conversational close at HTTP 200,
      not an error.
- [ ] **9. Auth gate.** An unauthenticated request to `/admin` redirects to sign-in.

Plus:

- [ ] `docs/LOCAL-DEV.md` exists and a clean clone can be brought to check 1 by following it alone
- [ ] `npm run build` passes in `src/Chatbot` and `src/Landing`
- [ ] `git status` is clean of build output, `.env.local`, and `supabase/.temp/`
- [ ] `git diff` across the whole build contains no credential, project ref, or connection string

## Do Not

- Deploy anything. Vercel, KVM1, and DNS are the next step, not this one.
- Stub, mock, or skip a check to make the list green. A failed check is information; a faked one is
  a bug with a clean report.
- Weaken an RLS policy to make check 5 easier to set up.
- Commit `.env.local`, a real token, or the seeded users' credentials.
