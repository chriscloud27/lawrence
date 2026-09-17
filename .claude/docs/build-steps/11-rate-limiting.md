# Step 11 — Rate-Limit the Public Endpoints

> Critical Change 01 in `.claude/docs/stack-audit.md` — the highest-severity gap in the stack, and
> the one that costs money while it is open. A public, unauthenticated endpoint that calls a paid
> LLM on every request has no ceiling. No spend cap protects you: by the time an alert fires, the
> money is gone.

## Assumes

- Step 10 complete — docs describe the real stack
- `src/Chatbot/app/api/prequalify/route.ts` exists and proxies to `N8N_BANT_WEBHOOK_URL`
- `src/Chatbot/lib/env.ts` is the only place `process.env` is read (per `.claude/rules/chatbot.md`)
- `src/Chatbot/lib/session.ts` exists and issues a session identifier

## Task

Put a ceiling on every unauthenticated route before the first agency pilot.

### 1. Dependencies

```bash
cd src/Chatbot && npm install @upstash/ratelimit @upstash/redis
```

Free tier is sufficient at every volume in the audit's cost model.

### 2. Env vars — `src/Chatbot/lib/env.ts` and `.env.example`

Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as server-only exports, in the same
block as the existing `N8N_*` secrets, with the same comment discipline.

Add both to `.env.example` **with placeholder values only** — per `.claude/rules/secrets.md`, never
a real value, and never a real project ref. The user fills `.env.local` manually.

### 3. Limiter — `src/Chatbot/lib/rate-limit.ts`

One module, two named limiters, both sliding-window:

| Limiter | Key | Budget | Protects |
|---|---|---|---|
| `ipLimiter` | client IP | 20 requests / 60s | Burst abuse from one source |
| `sessionLimiter` | `sessionId` from the request body | 30 requests / 24h | Sustained drain across a rotating IP |

Export a single `checkLimits({ ip, sessionId })` helper returning
`{ ok: boolean; retryAfter?: number; limiter?: "ip" | "session" }` so route handlers stay thin per
`.claude/rules/chatbot.md`.

Guard the module so that when the Upstash env vars are absent it fails **open in development and
closed in production** — a missing token must never silently disable the ceiling on a deployed app.

### 4. Per-conversation turn cap

The BANT flow converges in six to eight turns; twenty is already anomalous. This is a separate
ceiling from the rate limiter and catches the case the limiter cannot see — a single well-paced
session that never stops.

Enforce a hard cap of **25 turns per `sessionId`** in `checkLimits`. Past the cap, return a normal
conversational close rather than an error: the parent should see the assistant wrapping up and
offering the resource tier, never a 429. A hostile client gets the 429; a real parent gets an
ending.

### 5. Apply to all three public routes

- `app/api/prequalify/route.ts` — the LLM path, highest priority
- `app/api/schools/search/route.ts` — database load, no LLM cost
- `app/api/lead/link/route.ts` — writes lead identity; abuse here is a data-integrity problem

Read the IP from the `x-forwarded-for` header (Vercel sets it); fall back to a constant only in
development. Return `429` with a `Retry-After` header on rejection.

### 6. Budget alert

Set a monthly spend alert in the Anthropic console at 150% of the audit's modelled figure for the
current tier (`.claude/docs/stack-audit.md` → Monthly cost). This is a console action, not code —
record it as done in the PR description.

## Do Not

- Rate-limit in `middleware.ts` alone — it does not see the request body, so `sessionId` limiting
  and the turn cap are impossible there.
- Put the Upstash credentials in an n8n SET node. These are Next.js server env vars and n8n never
  sees them.
- Add authentication to the chat endpoint. It is public by design — parents are anonymous until
  they convert. The ceiling is the control, not a login.
- Log the full request body on rejection. Parent messages are PII.

## Verify

- [ ] `npm run build` in `src/Chatbot` passes with no type errors
- [ ] 21 rapid requests from one IP to `/api/prequalify` → the 21st returns `429` with `Retry-After`
- [ ] A request with no `sessionId` is rejected, not silently allowed through the session limiter
- [ ] With Upstash env vars unset and `NODE_ENV=production`, requests are refused — not allowed
- [ ] Turn 26 on one `sessionId` returns a conversational close with HTTP 200, not a 429
- [ ] `grep -rn "process.env" src/Chatbot --include=*.ts --include=*.tsx | grep -v lib/env.ts` returns nothing
- [ ] `.env.example` documents both Upstash vars with placeholder values; `git diff` contains no real credential
- [ ] Anthropic budget alert configured and noted in the PR description
