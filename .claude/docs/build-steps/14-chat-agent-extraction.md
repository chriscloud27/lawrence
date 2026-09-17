# Step 14 — Take the Chat Agent Out of n8n

> Critical Change 02 in `.claude/docs/stack-audit.md`. The largest step here, and the last, because
> it depends on all four before it. **Use plan mode for this one** — it touches n8n, a new route
> handler, Inngest, a Supabase migration, and an Admin form.
>
> This step supersedes part of ADR-0006. Write the superseding ADR before the code.

## Assumes

- Steps 10–13 complete. In particular:
  - Step 12 built `lib/ai/provider.ts` and the eval harness — **the agent must be written against
    the seam, never against a provider directly**
  - Step 13 gave Admin a Next.js surface for the config form
- `n8n/workflows/chat-agent.json` and `bant-prequalify.json` exist and are live
- `src/Chatbot/app/api/prequalify/route.ts` proxies to `N8N_BANT_WEBHOOK_URL` and is rate-limited
- ADR-0006 is `proposed` and currently mandates the opposite of this step

## Task

Move the parent-facing conversation into TypeScript. Keep n8n for ingestion.

**The requirement behind ADR-0006 is still valid** — non-developers owning the prompts and the
conversational flow. Do not solve it with a workflow engine. Solve it with a config table and a
form.

### 1. Supersede ADR-0006 first

Run `/adr-new`. The new ADR records: the chat agent moves to TypeScript, n8n is retained for
scheduled ingestion, and the non-developer prompt-ownership requirement is met by `agent_config`
plus an Admin form rather than by a workflow UI.

Mark ADR-0006 `superseded by [ADR-00XX]`. Per `CLAUDE.md`, that status line is the only permitted
edit to it.

State the three drivers plainly: n8n workflow JSON has no types, tests, meaningful diffs, or local
run; Community Edition has no env vars, which is why the project's own rules mandate plaintext
secrets in a SET node; and n8n webhooks cannot stream, which ADR-0006 itself concedes.

### 2. Config table — `supabase/migrations/`

```sql
-- agent_config: prompts and thresholds owned by counsellors, not developers
-- Versioned: a bad edit at 17:00 on a Friday must be revertable.
```

Columns: `id`, `agency_id`, `system_prompt`, `bant_thresholds` (jsonb), `routing_copy` (jsonb),
`version`, `created_by`, `created_at`, `is_active`.

Per `.claude/rules/database-migrations.md`: UTC timestamp filename, a `-- Down migration:` block,
and `ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;` immediately after creation. Read
`.claude/docs/data/db-tables.md` before touching anything adjacent to `leads` or `messages`.

Insert the current n8n SET-node values as version 1 — thresholds `BANT_HOT_THRESHOLD=75`,
`BANT_MEDIUM_THRESHOLD=50`, and the system prompt from `chat-agent.json`. **Copy the prompt and the
thresholds only. Do not copy the credential fields** from the SET node into Postgres; those become
Vercel env vars.

### 3. The agent — `src/Chatbot/app/api/chat/route.ts`

Streaming, via the AI SDK. Streaming is the capability ADR-0006 traded away and the reason the
product feels alive.

- Model comes from `modelFor("parent_turn")`. No model ID in this file.
- System prompt and thresholds are read from `agent_config`, not hardcoded.
- Keep the route thin per `.claude/rules/chatbot.md` — logic goes in `lib/`.
- Apply the Step 11 limiter, including the turn cap.

### 4. BANT scoring — `src/Chatbot/lib/bant/`

Port the two-stage engine from `bant-prequalify.json`, following `.claude/rules/bant-scoring.md`
exactly. Stage 1 is JavaScript keyword scoring (0–75); Stage 2 calls
`modelFor("bant_refine")` for the 50–75 band only.

Two constraints from the rules that are easy to lose in the port:

- **The BANT delta block is hidden from the parent.** Two outputs per turn: the conversational
  reply, and a structured delta the parent never sees. Validate the delta with Zod; on malformed
  JSON, log the raw response and throw — never silently skip.
- **Scoring must stay intake-method-agnostic** per ADR-0010. It runs on a `leads` row, which may
  come from the v2 form with no conversational turns at all. Do not build
  "the AI agent's follow-up turn" into the scoring signature.

### 5. Durable side effects — Inngest

Everything that must survive a failed request moves to Inngest steps, not the request path:

| Side effect | Replaces |
|---|---|
| Hot-lead email to admissions | n8n Gmail node on a personal test account |
| Supabase lead/message writes | n8n Supabase node |
| Scheduled re-scoring | n8n cron |

Use Resend for the email, per the audit — the Gmail node has no deliverability story, no domain
authentication, and no audit trail. Templates live in the repo via React Email.

**This changes a standing rule.** `.claude/rules/chatbot.md` says all Supabase writes go through
n8n. Update that rule in the same PR: writes now go through Inngest steps; the chatbot request path
stays read-only.

### 6. Admin config form

A form over `agent_config` in the Step 13 route group: edit the system prompt, thresholds, and
routing copy; save creates a new version rather than mutating the active row; a revert button
activates a previous version.

Roughly 200 lines. It is what ADR-0006 actually wanted, with an audit trail n8n never had.

### 7. Retire the chat workflows

Delete `n8n/workflows/chat-agent.json` and `bant-prequalify.json`. Remove the
`/api/prequalify` proxy and its `N8N_BANT_WEBHOOK_URL` env var.

**Keep `scrape-doris-school.json`.** Scheduled scraping is what n8n is good at — batch,
non-realtime, glue-heavy, nobody's latency budget. ADR-0014 allocates that work to the KVM1 and
this step does not disturb it.

## Do Not

- Import a provider package here. Everything goes through `lib/ai/provider.ts` from Step 12.
- Hardcode a threshold. `75` and `50` live in `agent_config`, not in TypeScript.
- Mention the score, the qualification process, or the threshold to the parent — ever. See the
  persona rules in `.claude/rules/chatbot.md`.
- Delete `scrape-doris-school.json` or any n8n credential. Ingestion stays.
- Copy SET-node credential values into Postgres, a committed file, or this conversation. They
  become Vercel env vars, entered by the user.
- Edit ADR-0006 beyond its status line.
- Ship without running the Step 12 evals. This step rewrites the scoring engine; the five
  trajectories are the only thing standing between a port bug and an agency receiving bad leads.

## Verify

- [ ] `npm run build` in `src/Chatbot` passes
- [ ] `npx promptfoo eval` — all five trajectories land in the same routing tier as before the port
- [ ] The three persona assertions still pass
- [ ] `/api/chat` streams tokens to the client; the first token arrives before the full response
- [ ] The BANT delta block never appears in any parent-visible payload
- [ ] A malformed delta logs the raw response and throws — no silent skip
- [ ] Editing the system prompt in Admin changes the next turn with no redeploy; revert restores it
- [ ] `agent_config` has RLS enabled; an agency cannot read another agency's row
- [ ] The migration has a `-- Down migration:` block and `supabase db reset` replays cleanly
- [ ] Hot lead at 75+ sends via Resend from an authenticated domain, as an Inngest step with retries
- [ ] `grep -rn "N8N_BANT_WEBHOOK_URL" src/ .env.example` returns nothing
- [ ] `n8n/workflows/` retains `scrape-doris-school.json`
- [ ] ADR-0006 status reads `superseded by [ADR-00XX]`; the new ADR exists
- [ ] `.claude/rules/chatbot.md` no longer claims all Supabase writes go through n8n
- [ ] `git diff` contains no credential, project ref, or connection string
