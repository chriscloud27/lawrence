---
name: run-chatbot
description: Build, run, and drive the Chatbot Next.js app (src/Chatbot). Use when asked to start the chatbot, run it, take a screenshot of its UI, verify the BANT pre-qualification chat widget, or check the marketing homepage renders.
---

Next.js 16 (Turbopack, App Router) app with no test suite — verification is
"launch the dev server and drive it in a real browser." Drive it with the
`browser-automation` skill (`~/.claude/skills/browser-automation/browser.mjs`
— a `chromium-cli`-style headless-browser runner backed by patchright/Playwright)
using the `driver.mjs` committed next to this file.

This skill lives at the repo root, but the app itself is at `src/Chatbot/` —
`npm`/build/dev commands below assume `cd src/Chatbot` first (as shown), while
this skill's own files (`driver.mjs`) are referenced relative to the repo root.
`browser-automation`'s path is a user-level skill outside the repo.

## Prerequisites

Already installed in this repo (`npm install` under `src/Chatbot/` if `node_modules`
is missing). No system packages needed — no Electron/xvfb, the driver runs
against a plain Next.js dev server.

The browser harness needs the `browser-automation` skill available (it resolves
patchright from an installed extension, a dev checkout, or a global install —
see that skill's own SKILL.md). If it's not present, adapt
[examples/playwright.md in the `run` skill] and call `chromium.launch()` directly.

## Setup

```bash
cd src/Chatbot
npm install   # only if node_modules is missing
```

**Known local-env issue:** if `.env.local` has a malformed
`NEXT_PUBLIC_SUPABASE_URL` (not a full `https://...` URL), `ChatWidget`'s
Google sign-in effect (`lib/supabase-browser.ts:17`, `createBrowserClient`)
throws **uncaught**, which blanks the *entire* page client-side (React tree
unmounts, no error boundary) — not just the sign-in button. This has nothing
to do with the rest of the app; it reproduces even on a bare placeholder page.
For a clean local run without touching `.env.local` (per `.claude/rules/secrets.md`,
never read/edit that file), override both vars empty for the process:

```bash
NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run dev
```

This disables the optional ADR-0008 Google sign-in button only — the rest of
the app (marketing homepage, BANT chat, `/api/prequalify`) is unaffected.

## Build

```bash
npm run build
```

Verified output: `Compiled successfully`, TypeScript passes, generates
`○ /` (static) and `ƒ /api/prequalify`, `ƒ /api/lead/link`, `ƒ /api/schools/search`,
`ƒ /auth/callback`, `ƒ /schools` (dynamic).

## Run (agent path)

```bash
cd src/Chatbot
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill   # free the port if a stale server is running
NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= nohup npm run dev > /tmp/chatbot-dev.log 2>&1 &
disown
timeout 40 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done' && echo READY
```

Then drive it — either the smoke flow in `driver.mjs` (opens the chat widget,
clicks Start, answers the first BANT pre-qual question, screenshots the result):

```bash
node ~/.claude/skills/browser-automation/browser.mjs http://localhost:3000/ \
  --script ../../.claude/skills/run-chatbot/driver.mjs
```

(path is relative to `src/Chatbot/`, the cwd from the previous step — from repo
root instead, use `.claude/skills/run-chatbot/driver.mjs`)

Expect `"ok": true` and a screenshot at `/tmp/chatbot-smoke.png` (override
with `CHATBOT_SCREENSHOT=/other/path`). Or drive it ad hoc with `--snapshot`
/ `--eval` / `--screenshot` per that skill's own docs — e.g. to check just the
marketing homepage renders:

```bash
node ~/.claude/skills/browser-automation/browser.mjs http://localhost:3000/ --snapshot
```

Stop the server when done:

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
```

## Run (human path)

```bash
npm run dev   # → http://localhost:3000, Ctrl-C to stop
```

## Test

No test suite configured (`package.json` only has `dev`/`build`/`start`/`lint`).
Use the driver above as the verification step, plus:

```bash
npm run lint
npx tsc --noEmit
```

## Gotchas

- **Use `http://localhost:3000`, not `http://127.0.0.1:3000`.** Next 16's dev
  server blocks cross-origin requests to dev-only resources (`/_next/static/chunks/...`,
  the HMR websocket) from origins not in `allowedDevOrigins`, and `127.0.0.1`
  doesn't match the default-allowed `localhost` origin. The initial HTML still
  loads (200, real content in `curl`), but every JS chunk 403s, so React never
  hydrates and no button clicks do anything — while `console errors` in some
  harnesses report `0` because the failures are network-level, not JS
  exceptions. If you must use `127.0.0.1`, add `allowedDevOrigins: ["127.0.0.1"]`
  to `next.config.ts` and restart the server (revert afterwards — it's not
  needed for normal `localhost` use).
- **A malformed `NEXT_PUBLIC_SUPABASE_URL` silently blanks the whole page**,
  not just the sign-in feature — see Setup above. If a driven run reports a
  blank page / "page couldn't load" with the initial HTML otherwise present,
  check `/tmp/chatbot-dev.log` for `Uncaught Error: Invalid supabaseUrl` before
  assuming the harness itself is broken.
- **First navigation after a fresh `npm run dev` can occasionally return a
  bare browser error page** (`bodyChars` ~70, no console/network errors
  logged) even though `curl` gets a full 200 response. A second, identical
  invocation of the driver against the same URL succeeds — this looks like
  browser-launch flakiness in the harness, not an app issue. Retry once
  before diagging further.

## Troubleshooting

- **`EADDRINUSE` on port 3000**: a previous dev server is still running.
  `lsof -ti:3000 -sTCP:LISTEN | xargs -r kill` before relaunching.
- **`requests failed` full of `HTTP 403 .../_next/static/chunks/...`**: see
  the `127.0.0.1` gotcha above — switch to `localhost`.
- **Driver returns `"step": "open-chat-button-not-found"`**: the page didn't
  hydrate. Check `/tmp/chatbot-dev.log` for a build/compile error first, then
  the Supabase-crash gotcha above.
