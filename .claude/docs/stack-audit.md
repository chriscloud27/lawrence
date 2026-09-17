# Lawrence Stack Audit

**Date:** 2026-09-12 · **Revised:** 2026-09-12 (post ADR-0012…0015; ops-overhead column, rejected-category review, ADR-0013 closed)
**Audited against:** repo HEAD `fb2776b`
**Presentation copy:** https://claude.ai/code/artifact/eb08a2b5-4e3d-4084-936d-0a2994875c6f
**Status:** current. This file is the source of truth; the artifact is generated from it.

A layer-by-layer verdict on the 2026 stack for a white-label parent intake and BANT
qualification product — scored on AI-developability, reliability, cost, scalability, DX, and
operational overhead, in that order.

---

## How to read this document

This audit was produced before ADRs 0012–0015 existed. Those ADRs **settled some of its open
questions and reopened others.** Every row below carries its current state, not its original
state. Where an ADR changed a verdict, the row says so.

| ADR | Status | What it changed in this audit |
|---|---|---|
| [ADR-0012](adr/0012-design-partner-stack-for-prototype.md) | accepted | Design Partner is the **adopted** prototype bundle, not merely an option. The audit's recommended bundle (Hybrid Pragmatist) is deferred to the production decision. |
| [ADR-0013](adr/0013-production-stack-configuration.md) | **accepted** | **Resolved 2026-09-12 as Option B, Hybrid Pragmatist** — this audit's recommendation. The earlier Full Vercel leaning is rejected. Supabase moves from "contested" to settled across the Database, Auth, and Leave-alone rows. |
| [ADR-0014](adr/0014-kvm1-workload-allocation.md) | accepted | The VPS row is no longer "n8n only". Uptime monitoring is solved in-house. The secrets gap is explicitly accepted for the prototype. |
| [ADR-0015](adr/0015-ai-model-provider-strategy.md) | proposed / **open** | **LLM access moves from Keep to Close call.** Anthropic-only is lifted as a constraint. Two new prerequisites appear in Critical Changes. |

---

## Correction: the 10K cost figures in ADR-0012 and ADR-0013 do not add up

The original audit modelled Anthropic spend at **$182/mo at 10K conversations**. Re-derived with
prompt-cache write premiums (1.25× on the 5-minute TTL) and the Sonnet-tier Stage-2 BANT pass
included, the figure is **$230/mo**.

ADR-0013's option table absorbed that correction incorrectly. It kept each bundle's *total* from
ADR-0012 (which was computed with the old $182 LLM line) and back-derived the infrastructure column
as `total − 230`. The correct operation is `infra + 48`. Three rows coincidentally still balance;
the Self-Hosted row does not (`$40 + $230 = $270`, not the stated `$222`).

**Corrected bundle totals at 10K conversations/month:**

| Bundle | Infra $/mo | LLM $/mo | Total (corrected) | ADR-0013 states |
|---|---|---|---|---|
| Full Vercel | $158 | $230 | **$388** | ~$340 |
| Zero-Ops | $151 | $230 | **$381** | ~$333 |
| Hybrid Pragmatist | $139 | $230 | **$369** | ~$321 |
| Self-Hosted Power | $40 | $230 | **$270** | ~$222 |

**Relative ranking is unchanged** — the LLM line is identical across all four bundles, so no
bundle comparison turns on this. What changes is the absolute number used in any pricing or
runway conversation, which is ~$48/mo (~15%) higher than recorded. ADR-0013's table should be
corrected in place.

---

## Three things in the original brief that did not match the repo

These were the audit's founding corrections and they still hold.

| Claim | Reality |
|---|---|
| **Framework** — "React (Vite scaffold), considering Next.js migration" | `src/Chatbot` and `src/Landing` are already Next.js 16 on React 19. Only `src/Admin` is still Vite + React 18. The migration question concerns one app, not the product. |
| **ORM** — CLAUDE.md claims Drizzle + better-sqlite3 | Neither Prisma nor Drizzle is installed anywhere. `src/Chatbot/package.json` ships only `@supabase/supabase-js`. |
| **AI layer** — CLAUDE.md claims the Anthropic SDK | No `@anthropic-ai/sdk`, no `ai`, no Zod in the Chatbot app. The entire AI layer lives outside TypeScript, inside n8n workflow JSON. That single fact drives most of this review. |

> **Standing action:** CLAUDE.md and `.claude/rules/chatbot.md` describe a stack the code does not
> have. Every Claude Code session starts from that description, so the error compounds. See
> Critical Change 05.

---

## Scorecard

Verdict key: ✅ Keep · 🔄 Replace · ⚠️ Close call (tiebreaker named) · 🆕 changed by an ADR

**AI-dev fit** (1–5): can Claude Code scaffold, diff, test, and debug this layer unaided?
**Ops** (1–5): 5 = nothing to operate · 4 = managed, but upgrades and limits are yours to watch ·
3 = self-hosted but low-churn · 2 = you patch it · 1 = you patch it *and* it has no safe change path.

### Core application

| Layer | Current pick | Verdict | Alternative | 0 / 1K / 10K | AI-dev fit | Ops | Trade-off notes |
|---|---|---|---|---|---|---|---|
| Framework | Next.js 16 (Chatbot + Admin route group) + Next.js 16 static export (Landing) | ✅ Settled | Done — Admin folded in by build step 13 | $0 / $0 / $0 | 5 | 4 | Was three frontends across two React majors and two Tailwind majors. Now two apps on one React and one Tailwind. Landing stays separate — it is a static export with different caching and a different audience, and that separation is earning its keep. |
| Language | TypeScript (strict) | ✅ Keep | — | $0 / $0 / $0 | 5 | 5 | Strict mode is the single highest-leverage AI-developability setting available — it converts hallucinated API shapes into compile errors instead of runtime incidents. |
| Styling / UI | Tailwind + shadcn/ui | ⚠️ Close call | Keep both; unify on Tailwind v4 everywhere | $0 / $0 / $0 | 5 | 4 | Chatbot is on v4 with `@theme` tokens; Landing is on v3.4 with a PostCSS config. The design rules assume v4 `lw-*` utilities exist — on Landing they do not. **Tiebreaker:** the design system is already written against v4, so v4 wins and Landing migrates. |
| Database | Supabase Postgres + RLS | ✅ Keep | — | $0 / $25 / $35 | 5 | 4 | Neon is the only serious contender and it loses here: Auth, Storage (v2 document upload), and RLS-native multi-tenancy all come off one `auth.uid()` primitive. Go Pro at first paying agency — Free pauses after 7 days idle and has no PITR. Managed, but pooler mode, Postgres major upgrades, and the pause-on-idle rule are yours to track. **Settled by ADR-0013 as Option B.** |
| Vector search | pgvector in Supabase | ⚠️ Close call | Postgres FTS + structured filters; defer vectors | $0 / $0 / $0 | 4 | 4 | "Find schools matching curriculum + budget + location" is a structured query, not a semantic one. At a few thousand schools, `tsvector` plus WHERE clauses beats embeddings on precision and costs nothing to maintain. **Tiebreaker:** adopt pgvector only when matching on free-text parent narrative rather than school attributes. |
| ORM | Prisma *or* Drizzle — neither installed | ⚠️ Close call | Drizzle, for app-owned tables only | $0 / $0 / $0 | 4 | 4 | Prisma has the larger training corpus (a genuine 5 on AI-dev fit); Drizzle wins on everything else. **Tiebreaker:** no codegen step in CI and no Rust query engine in the serverless bundle. Use Drizzle for `leads`/`messages`, and `supabase-js` only for Auth, Storage, and Realtime — do not let both write the same tables. |
| Validation | Zod | ✅ Keep | Upgrade v3 → v4 | $0 / $0 / $0 | 5 | 5 | Landing pins `zod@^3.25`; Chatbot has none. Zod is also how structured BANT output comes back from tool calls safely — install it in the Chatbot app before writing the agent. |

### Platform & hosting

| Layer | Current pick | Verdict | Alternative | 0 / 1K / 10K | AI-dev fit | Ops | Trade-off notes |
|---|---|---|---|---|---|---|---|
| App hosting | Vercel Hobby | 🔄 Replace | Vercel Pro at first paying customer | $0 / $20 / $30 | 5 | 5 | Hobby's terms prohibit commercial use. The moment an agency pays, the deployment is out of compliance and one enforcement email from an outage in front of customers. A licensing fact, not a performance one — $20 buys legitimacy, not speed. **ADR-0012 makes this the explicit re-evaluation trigger.** |
| Marketing site | GitHub Pages | ⚠️ Close call | Move onto the same Vercel account | $0 / $0 / $0 | 5 | 5 | Landing is a Next app with MDX, next-intl, and a Notion asset sync — all of which work better on Vercel, at zero marginal cost once on Pro. **Tiebreaker:** keep Pages only to let the marketing site survive a Vercel billing or outage incident independently. |
| Auth | Supabase Auth *or* NextAuth v5 | 🔄 Replace | Supabase Auth, decided | $0 / $0 / $0 | 4 | 4 | Auth.js v5 has been in a long beta and the public corpus is saturated with v4 patterns that silently break — the worst possible profile for AI-assisted work. Supabase Auth also makes RLS trivial: put `agency_id` in the JWT and multi-tenant isolation becomes a policy, not application code. Auth.js would score 2 on Ops: it is a library you operate, not a service with an SLA. **Settled by ADR-0013 as Option B.** |
| VPS / compute 🆕 | Hostinger KVM1 — n8n, **scraping worker, nightly `pg_dump`, Uptime Kuma** | ✅ Keep | — | $5 / $8 / $8 | 3 | **2** | **Changed by ADR-0014.** No longer an n8n-only box. 1 vCPU is the binding constraint, not RAM (61% free) or bandwidth (>99.9% free) — scraping is capped at exactly one concurrent Chromium, and that is a ceiling, not a starting point. Boston region means this box can never host anything parent-facing for a UK/Thailand market (~230 ms to Bangkok). The second-lowest Ops score in the stack: OS patching, Docker, disk, and verifying that the backup actually restores. |
| Payments | Stripe Billing | ✅ Keep | Defer until customer #3 | $0 / usage / usage | 5 | 4 | Right answer, possibly wrong time. B2B agency deals at this stage get invoiced, not self-served. Building the subscription lifecycle before the pricing model is known is speculative work — but when it is needed, nothing else comes close. Webhook handling and failed-payment states are real ops once live. |

### AI layer

| Layer | Current pick | Verdict | Alternative | 0 / 1K / 10K | AI-dev fit | Ops | Trade-off notes |
|---|---|---|---|---|---|---|---|
| LLM access 🆕 | Anthropic API | ⚠️ **Close call** (was ✅ Keep) | Per-job routing across Anthropic + open-weight endpoints | $10 / $23 / $230 | 5 | 5 | **Changed by ADR-0015.** Anthropic-only is lifted as a constraint; Anthropic is now a candidate per job rather than a default for all jobs. **Tiebreaker: effective cost per conversation, not list price per token.** An open-weight endpoint without prompt caching can be more expensive at a lower headline rate — caching is worth roughly a third of the current bill. Second tiebreaker, and a hard one: first-party DeepSeek and Qwen APIs route to China, and the market is UK agencies handling data about children. Weights are open, so model choice and hosting jurisdiction are separable — but any evaluation must record *which endpoint, in which region*. |
| Orchestration | n8n Community, self-hosted | ✅ Settled — chat agent replaced (ADR-0018), ingestion kept | TypeScript agent in Next + Inngest for durable work | included above | 2 | **1** | The lowest score in the stack on both axes at once, in a stack whose top criterion is AI-dev fit. Claude Code cannot meaningfully author, diff, test, or debug workflow JSON. Community Edition has no env vars, which is why the project's own rules mandate plaintext secrets in a SET node. And it cannot stream. See Critical Change 01. **ADR-0012 defers this for the prototype without resolving it.** |
| AI SDK | Vercel AI SDK v6 | ✅ Keep | Or raw `@anthropic-ai/sdk` | $0 / $0 / $0 | 4 | 5 | Gives streaming, tool loops, and `useChat` for free. Docked a point for a real hazard: v5→v6 was a breaking rewrite and models still emit v3/v4 idioms confidently. Pin the exact version and keep the v6 docs in context when generating agent code. **Promoted by ADR-0015** — its provider abstraction is now a prerequisite, not a convenience. |
| Tool calling | Native tool calls + MCP | ⚠️ Close call | Native only in the request path; MCP stays a dev-time tool | $0 / $0 / $0 | 4 | 5 | MCP is excellent for giving *your* agents access to systems. Putting an MCP hop inside a parent-facing request adds a process boundary and a failure mode to buy indirection that three tools do not need. **Tiebreaker:** adopt MCP in production when a third party needs to plug tools in — i.e. when agencies bring their own CRM. |
| Voice / audio | ElevenLabs | 🔄 Replace | Defer to v2; then Whisper or Deepgram for STT | $0 / $0 / $0 | 3 | 5 | Category mismatch: ElevenLabs is text-to-speech, and what ADR-0010 actually needs is speech-to-text for parent voice notes on the v2 intake form. It is also not in the v1 spec, which the project's own scope-guard principle makes deferred. Per-character pricing scales badly against a chat product. |

### Observability & ops

| Layer | Current pick | Verdict | Alternative | 0 / 1K / 10K | AI-dev fit | Ops | Trade-off notes |
|---|---|---|---|---|---|---|---|
| Analytics | PostHog | ✅ Keep | — | $0 / $0 / $0 | 4 | 5 | 1M events free covers 10K conversations comfortably. Session replay on the chat widget is the fastest way to learn why parents abandon mid-qualification — the product question that matters most. |
| Error tracking | Sentry | ✅ Keep | — | $0 / $0 / $26 | 5 | 5 | Free tier is fine through 1K. Set a low sample rate on the chat route or a single bad deploy will eat the quota in an afternoon. |
| Uptime monitoring 🆕 | **Uptime Kuma on the KVM1** | ✅ Keep | BetterStack free tier | $0 / $0 / $0 | 4 | **3** | **Changed by ADR-0014.** Previously listed as a missing layer with BetterStack as the fix. Self-hosting it costs ~100 MB RAM on a box that is 61% idle and removes a vendor from the production comparison. Caveat: a monitor on the same host it monitors cannot report that host being down — point it at Vercel and Supabase, and let an external free check watch the KVM itself. The layer that exists to reduce ops is itself self-hosted; BetterStack free would score 5. |
| Background jobs | Inngest | ✅ Keep | Supabase `pg_cron` + Edge Functions if minimising vendors | $0 / $0 / $20 | 4 | 5 | This absorbs the durable half of n8n: CRM writeback, email handoff, scheduled re-scoring. Steps are typed TypeScript functions with retries — reviewable in a PR, testable locally, generatable by Claude Code. **Tiebreaker vs pg_cron:** Inngest for step-level retries and replay; pg_cron if adding zero vendors matters more than debuggability. |
| Transactional email | Resend | ✅ Keep | Replaces the n8n Gmail node | $0 / $0 / $20 | 5 | 5 | The hot-lead handoff currently goes out via a Gmail node on a personal test account. That has no deliverability story, no domain authentication, and no audit trail. Resend plus React Email fixes all three and templates live in the repo. |
| Internal API | oRPC / tRPC | ⚠️ Close call | Server Actions + Route Handlers + Zod | $0 / $0 / $0 | 4 | 5 | Inside one Next app there is already end-to-end type safety without a router layer. **Tiebreaker:** adopt oRPC the day the chat widget ships as a standalone embeddable calling the API cross-origin — a real client/server split, worth the abstraction. Not before. |

### Dev tooling

| Layer | Current pick | Verdict | Alternative | 0 / 1K / 10K | AI-dev fit | Ops | Trade-off notes |
|---|---|---|---|---|---|---|---|
| Primary dev tool | Claude Code | ✅ Keep | — | sub | 5 | 5 | The `.claude/rules/` and ADR discipline is doing real work. The stale claims in CLAUDE.md are the cost of that approach — reconcile docs against `package.json` whenever deps change. |
| UI prototyping | v0 | ✅ Keep | — | $0 / $20 / $20 | 4 | 5 | v0 emits Tailwind default palette classes, which the design rules explicitly forbid. Treat its output as a layout sketch and run every component through the `lw-*` token pass before it lands. |

### What the Ops column shows that the rest of the audit did not

The three lowest Ops scores in the stack — **n8n (1), the KVM1 (2), Uptime Kuma (3)** — are the same
physical box. Every other layer scores 4 or 5. Operational overhead is not distributed across the
stack; it is entirely concentrated in one Hostinger VPS in Boston.

That reframes two decisions:

- **Critical Change 02 is worth more than its severity rank suggests.** Taking the chat agent out of
  n8n removes the only 1 in the stack, and it removes the plaintext-secrets workaround with it.
- **ADR-0014's defence of the KVM1 is economic, not operational.** "Already paid for, 61% idle" is a
  cost argument. It does not answer the ops-load question, and this column is where that shows. The
  answer is still to keep the box — scheduled scraping genuinely belongs there, and the Zero-Ops
  bundle costs $12/mo more to avoid it — but it should be kept knowingly, not by default.

After Critical Change 02 the box holds scraping, `pg_dump`, and Kuma: still a 2, but with no secrets
on it and no parent-facing request path through it. That is the version worth keeping.

---

## Critical changes

Ordered by severity. 01–03 are unchanged from the original audit and are explicitly **not blocked**
on ADR-0013 per that ADR's own Decision section. 04–05 are new, added by ADR-0015 and by the
docs-drift finding.

Each has a build step. **Execution order is not severity order** — see the table.

| Change | Build step | Execution order | Why here |
|---|---|---|---|
| 05 — Reconcile docs | [`10-docs-reconcile.md`](build-steps/10-docs-reconcile.md) | **1st** | Cheapest, and every later step is generated by a session that loads CLAUDE.md first |
| 01 — Rate limiting | [`11-rate-limiting.md`](build-steps/11-rate-limiting.md) | **2nd** | Highest severity, smallest diff, no dependencies |
| 04 — Provider seam + evals | [`12-provider-seam-and-evals.md`](build-steps/12-provider-seam-and-evals.md) | **3rd** | Must precede 02, or the agent is written against a provider directly and then refactored |
| 06 — Agency tenancy | [`15-tenancy-and-persistence.md`](build-steps/15-tenancy-and-persistence.md) | **4th** | Runs here despite its filename: 03 and 02 both assume a tenant exists, and retrofitting RLS later touches every query (ADR-0016) |
| 03 — Admin consolidation | [`13-admin-consolidation.md`](build-steps/13-admin-consolidation.md) | **5th** ✅ done | Must precede 02, or the `agent_config` form gets built twice |
| 02 — Chat agent out of n8n | [`14-chat-agent-extraction.md`](build-steps/14-chat-agent-extraction.md) | **6th** ✅ done | Depends on all five. Settled by [ADR-0018](adr/0018-chat-agent-in-typescript.md) |
| 07 — Local end-to-end runbook | [`16-local-e2e.md`](build-steps/16-local-e2e.md) | **7th** | Not a code step: the smoke test that turns six green checklists into one working product |

### 01 — Rate-limit the chat endpoint before anything else

`nothing` → **Upstash Redis + `@upstash/ratelimit`**, per-IP and per-session

The biggest hole in the stack, and it was not on the original list at all. A public,
unauthenticated endpoint that calls a paid LLM on every request is a direct line from a bored
teenager to the Anthropic bill. No spend cap protects against this — by the time an alert fires,
the money is gone.

Free tier, one middleware, about thirty lines. Pair it with a hard per-conversation turn cap (the
BANT flow converges in six to eight turns; twenty is already anomalous) and a monthly Anthropic
budget alert. Do this before the first agency pilot, not after the first surprise invoice.

### 02 — Take the chat agent out of n8n

n8n `chat-agent.json` → **AI SDK v6 agent in a Next route handler** + **Inngest** for durable side effects

> **Done.** Settled by [ADR-0018](adr/0018-chat-agent-in-typescript.md), which supersedes ADR-0006.
> `/api/chat` streams from the provider seam; scoring is `src/Chatbot/lib/bant/` with tests; writes
> and the admissions email are Inngest steps; `agent_config` plus an Admin form carries the
> prompt-ownership requirement. `chat-agent.json` and `bant-prequalify.json` are deleted and
> archived under `.claude/docs/archive/n8n/`; `scrape-doris-school.json` and `link-lead.json` stay.
>
> Doing the work turned up a third defect the audit had not seen: `re-scoreJS` scored **the
> advisor's reply**, not the parent's, so every Stage-2 bonus fired on vocabulary the assistant
> itself had just used. Together with the two in ADR-0017 — an escalation branch that was
> unreachable by arithmetic, and a scorer that read `"not my decision"` as maximum authority — that
> is three bugs that survived months of live use in a medium with nowhere to put a test. That, more
> than the DX argument below, is the case.

The top selection criterion is that Claude Code can scaffold, debug, and maintain a component with
minimal human intervention. n8n is the one layer where that is categorically false — workflow JSON
has no types, no tests, no meaningful diffs, and no local run. Every prompt change is a click in a
UI that then has to be exported and committed by hand.

The ops story is worse than the DX story. Community Edition has no environment variables, which is
why the project's own rules mandate every secret sit in plaintext in a SET node, in a file the
rules then forbid publishing. That is a security posture built to work around a licensing limit.
ADR-0006 also concedes that n8n webhooks cannot stream — so the architecture trades away the chat
UX that makes the product feel alive.

**The requirement behind ADR-0006 is still valid** — non-developers owning the prompts and
conversational flow. Do not solve it with a workflow engine. Put the system prompt, BANT rubric
thresholds, and routing copy in a Supabase `agent_config` table, and give the Admin dashboard a
form over it. Roughly 200 lines, versioned, with an audit trail — and it survives a counsellor
editing a prompt at 5pm on a Friday.

**Keep n8n for ingestion.** Scheduled school scraping is exactly what n8n is good at: batch,
non-realtime, glue-heavy, nobody's latency budget. Split the verdict rather than ripping out the
tool.

### 03 — Collapse three frontends into two

Landing (Next 16 / TW3) + Chatbot (Next 16 / TW4) + Admin (Vite / React 18) → **Landing (static)** + **App (Chatbot + Admin)**

Three apps, two React majors, and two Tailwind majors means every dependency bump is three PRs and
every shared component gets written twice. For a team this size that is the difference between
shipping features and doing maintenance.

The Admin dashboard is the clearest case: React 18 and Vite while everything else is React 19 and
Next 16, and it needs the same Supabase session, the same design tokens, and the same lead types as
the chatbot. Make it a route group in the Chatbot app. Landing stays independent — a static export
with different caching and a different audience, and that separation is earning its keep.

**Done (build step 13).** `src/Admin/` is deleted. The seven screens are routes under
`src/Chatbot/app/(admin)/`, behind an auth **and agency-membership** gate, reading real `leads` and
`messages` rows through the RLS policies from ADR-0016 — `mock-data.ts` is gone with the app. The
duplicate hex token layer (`src/Admin/src/styles/design-tokens.css` plus six screen stylesheets,
~2,500 lines) is not ported: every colour now resolves through an `lw-*` utility.

Two things the consolidation exposed rather than caused:

- **`agencies.accent_family` is stored but unread.** White-labelling is a `globals.css` edit per
  `.claude/rules/design.md`, so the column describes an intent the runtime does not act on. Either
  the column earns a runtime path or the rule owns the decision alone — leaving both is how they
  drift apart.
- **The Admin display bands (35/50/75, four of them) are not the routing tiers** (<50 / 50–75 />75,
  three of them). Both are legitimate and they are now separate functions, but the n8n workflow
  currently applies a *third* set (35/50) to routing. See the open threshold question.

### 04 🆕 — Introduce the provider seam and the eval harness together

*Added by ADR-0015.*

`direct provider call` → **one `lib/ai/provider.ts` seam** + **Promptfoo suite from the BANT trajectories**

These are one change, not two, and the ordering matters: **the eval harness must exist before the
first model swap, not after.** Without it, "Qwen is good enough for Stage 2" is an opinion, and a
quality regression in BANT scoring is invisible until an agency reports bad leads — which is the
most expensive possible way to discover it.

The harness is cheaper than it sounds. `.claude/rules/bant-scoring.md` already contains five worked
trajectories with expected scores and routing tiers. That is a regression suite in prose form;
typing it into Promptfoo is transcription, not design work.

The seam is cheaper still. AI SDK v6 already has a first-party Anthropic provider and
OpenAI-compatible providers covering Together, Fireworks, DeepSeek, and OpenRouter. Routing every
call through one module turns a future model swap into a config change. Doing it while still
Anthropic-only costs almost nothing; retrofitting it later costs a refactor.

Suggested evaluation order, lowest risk first: ingestion enrichment → Stage-2 scoring → BANT delta
extraction → the parent-facing turn last, if at all.

### 05 🆕 — Reconcile CLAUDE.md against `package.json`

*Added by the Reality Check above.*

This is an AI-developability defect, not a documentation chore. CLAUDE.md and
`.claude/rules/chatbot.md` describe Drizzle, better-sqlite3, and the Anthropic SDK. None are
installed. Every Claude Code session in this repo loads that description as ground truth before it
reads a single file, so the error does not sit still — it propagates into generated code, and the
cost recurs per session.

Two specific fixes beyond the dependency list:

- `.claude/rules/ai-agents.md` mandates `gpt-4o-mini` while `.claude/rules/chatbot.md` mandates
  `claude-haiku-4-5`. The project already runs two providers by accident. ADR-0015 makes it
  deliberate; the rules files should say so.
- `CLAUDE.md` Key Files points at `src/Chatbot/db/` for "Drizzle schema + local SQLite helpers".
  Either the directory is created with the dependency, or the line goes.

---

## Leave alone

Already the right call. The stack's remaining risk is concentrated in the Critical Changes, not
here.

| Layer | Why it stays |
|---|---|
| Supabase Postgres + RLS | Auth, storage, and multi-tenancy on one primitive. Nothing beats it at this size. **Confirmed by ADR-0013**, which rejected the Neon + Auth.js alternative. |
| TypeScript strict | The cheapest guardrail against generated code that looks right. |
| Tailwind + shadcn/ui | Huge corpus, copy-in components, and the token layer already sits on top. |
| Zod | Also the safest path to structured BANT output from tool calls. |
| Sentry | Boring, correct, free at current volume. Just sample the chat route. |
| PostHog | Session replay on abandoned conversations is worth the integration alone. |
| Resend | Templates in the repo, deliverability handled, replaces the Gmail node. |
| Inngest | The durable-work half of n8n, in TypeScript that can actually be reviewed. |
| Stripe Billing | Right tool. Just do not build it until the third paying agency. |
| Claude Code + v0 | Working well. Reconcile CLAUDE.md against `package.json` periodically. |
| GitHub Pages for Landing | Fine as-is. Consolidating onto Vercel is convenience, not correctness. |
| KVM1 for batch work 🆕 | ADR-0014 settled this. Already paid for, 99.9% of bandwidth unused, right host for long-running browser automation. |

**No longer on this list:** *Anthropic API*. It was listed as locked and correct; ADR-0015 reopens
it as a per-job question. It remains the strongest candidate for the parent-facing turn.

---

## Categories considered and not adopted

The scorecard evaluates layers the project already has. This section covers the platform categories
a reader can reasonably ask about and not find above — recorded so that "why not Firebase?" has an
answer on the page rather than in someone's head.

**The headline: Supabase *is* the backend-as-a-service in this stack.** Auth, storage, realtime, and
row-level authorisation off one identity primitive is the Firebase value proposition; Supabase
delivers it over Postgres. The BaaS question was answered, in its relational form — it was just never
written down as a comparison.

| Candidate | Where it genuinely wins | Why not here | Would revisit if |
|---|---|---|---|
| **Firebase / Firestore** | Fastest greenfield MVP, mobile-first SDKs, realtime sync, minimal DevOps | Document store against a relational domain. `leads` ↔ `messages` ↔ `schools` are joins, the chatbot reads through the `schools_chatbot` view ([ADR-0005](adr/0005-chatbot-read-view-decoupling.md)), and BANT reporting is aggregate queries. Security Rules can express per-agency isolation but are a separate language with heavy v1/v2 corpus drift — weaker on criterion #1 than RLS. Adopting it invalidates ADR-0003 and ADR-0005 outright. | The product pivoted to a mobile-first realtime experience, or the data model stopped needing joins. Neither is on any roadmap. |
| **AWS Amplify** | Deep AWS integration, enterprise IAM, unlimited ceiling | Its entire advantage is ecosystem leverage, and there is no AWS ecosystem here to lever. Buys enterprise control a two-person team cannot spend, at a learning curve that is a live cost against criterion #1 and a 2 on Ops before a line ships. | An agency's procurement requires their AWS account, or enterprise compliance review becomes a sales gate. |
| **Convex** | Excellent TypeScript DX, reactive queries, genuinely good AI-legibility | Real contender on criteria #1 and #5 — the honest rejection is corpus size and switching cost, not capability. Its transactional function model would have to re-express RLS as code, which is Option A's problem under a nicer API. | Building greenfield today with no Postgres commitments. |
| **Appwrite / PocketBase** | Self-hostable BaaS, no vendor | Adds a second thing to operate on a box already scoring 2, to replace a managed service scoring 4. Moves in exactly the wrong direction on the column above. | Never, on current constraints. Self-hosted Supabase was already rejected by ADR-0014 option D on 1 vCPU. |
| **Vercel as the backend** (Neon + Auth.js) | One invoice, tightest framework/platform coupling | This is ADR-0013 Option A, and it is the only candidate here that got a full evaluation. Rejected — see that ADR. | Auth.js v5 exits beta *and* a residency or pricing shift changes the comparison. |

> **The generic advice does not transfer.** The common three-way framing — Vercel for frontend-heavy
> Next.js, Firebase for rapid MVP, Amplify for AWS-native enterprise — is a reasonable map for a
> greenfield decision. Lawrence is fifteen ADRs past greenfield, on Next.js 16 with a Postgres domain
> model and an RLS multi-tenancy strategy. The framing's one transferable point is that **Vercel has
> no native backend**, which is exactly why this stack pairs it with one, and exactly why the pairing
> chosen matters more than the hosting choice.

---

## Missing layers

Gaps the current stack does not cover.

| Gap | Why it matters | Fix | State |
|---|---|---|---|
| Abuse & rate limiting | A public endpoint that bills per call, with no ceiling. The highest-severity gap in the stack. | Upstash · free | **Open** — Critical Change 01 |
| Prompt evals | The BANT rubric already contains five worked trajectories with expected scores. Without a harness, every prompt edit is an unmeasured change to the core scoring product. | Promptfoo · free | **Open, escalated** — ADR-0015 makes this a prerequisite, not a nice-to-have |
| Provider abstraction 🆕 | ADR-0015 lifted the single-provider constraint. Without a seam, acting on it is a refactor instead of a config change. | AI SDK v6 · free | **Open** — Critical Change 04 |
| LLM cost observability | Tokens, latency, and cost per conversation. At 10K the LLM is ~62% of the bill and the least instrumented part of the system. ADR-0015 raises the stakes: comparing providers requires measuring effective cost per conversation, which nothing currently records. | Helicone · free tier | **Open** |
| Secrets management | Plaintext inside n8n workflow exports. Leaving n8n solves most of it; Vercel env vars plus a shared vault covers the rest. | Vercel env · free | **Accepted for prototype** — ADR-0012 and ADR-0014 both record this explicitly; not acceptable past the payment trigger |
| Uptime monitoring | Nobody currently finds out the widget is down before an agency does. | Uptime Kuma on the KVM1 | **Solved** — ADR-0014 |
| Backup / disaster recovery 🆕 | Supabase Free has no PITR and pauses after 7 days idle. A prototype losing its `leads` table mid-pilot is a credibility event with a design partner. | Nightly `pg_dump` to the KVM1 | **Solved with a caveat** — ADR-0014. The dump puts parent and child PII on a box with no firewall group; encrypt it at rest (`age`/`gpg`) |
| Per-agency config | ADR-0010's `intake_method`, accent colour, thresholds, and routing. Built as a Postgres table, not a feature-flag vendor — there is exactly one dimension of variation and it is per-tenant, not per-release. | Postgres · $0 | **Settled — [ADR-0016](adr/0016-agency-tenancy-model.md)** (`agencies.intake_method`, `agencies.accent_family`; thresholds and routing follow in step 14's `agent_config`) |

---

## Monthly cost

Corrected for the $230 LLM line. Bundle: Hybrid Pragmatist.

| Line | Dev / 0 users | 1K conversations | 10K conversations |
|---|---|---|---|
| Vercel | $0 hobby | $20 pro | $30 |
| Supabase | $0 free | $25 pro | $35 |
| VPS (n8n, scraping, backups, Kuma) | $5 | $8 | $8 |
| Inngest | $0 | $0 | $20 |
| Resend | $0 | $0 | $20 |
| Sentry | $0 | $0 | $26 |
| PostHog / Upstash / Uptime Kuma | $0 | $0 | $0 |
| **Infrastructure subtotal** | **$5** | **$53** | **$139** |
| Anthropic (Haiku 4.5 + caching, Sonnet Stage 2) | $10 | $23 | $230 |
| **All-in** | **$15** | **$76** | **$369** |

### The $100-at-10K target does not survive contact with the token bill

Infrastructure holds — $139 at 10K, and under $100 staying on Sentry free and running jobs on
`pg_cron`. The LLM does not. Eight turns per conversation at ~2.5K context and ~250 output tokens,
plus a Sonnet-tier Stage-2 pass on the 50–75 band, puts Anthropic at ~$230/month with caching on,
and that scales linearly with conversations while infra barely moves.

Model it as cost of goods sold against lead volume, not as an infrastructure line. At a plausible
€2–5 per qualified lead, $230 buys 10,000 conversations and the unit economics are fine. The number
to watch is **cost per qualified lead** — which is why the observability gap above matters, and
why ADR-0015 names that metric as the one that actually decides the provider question.

---

## Bundled configurations

Costs corrected per the section above. Positioning is unchanged.

| Bundle | Positioning | Composition | $/mo @ 10K | State |
|---|---|---|---|---|
| **Design Partner** | Spend nothing until three agencies use it daily — free tiers only, and Vercel Hobby is legitimate because nobody is paying yet | Vercel Hobby · Supabase Free · n8n + scraping + backups + Kuma on the existing KVM1 · Anthropic pay-as-you-go · free tiers throughout | **$31 @ 1K** | ✅ **Adopted** — [ADR-0012](adr/0012-design-partner-stack-for-prototype.md), accepted. Provisional; trigger is the first agency committing to payment |
| **Hybrid Pragmatist** | Managed where failure is expensive, self-hosted where the work is boring — the agent lives in TypeScript, the scrapers stay on the KVM | Next 16 (app + admin) · Vercel Pro · Supabase Pro · Drizzle · AI SDK v6 · Inngest · Resend · Upstash · PostHog · Sentry · KVM1 for ingestion | **$369** | ✅ **Adopted for production** — [ADR-0013](adr/0013-production-stack-configuration.md), accepted. Takes effect at ADR-0012's payment trigger |
| **Full Vercel** | One vendor, one dashboard, one invoice — at the cost of the RLS-native multi-tenancy already designed around | Next 16 · Vercel Pro + Blob + AI Gateway · Neon Postgres · Auth.js v5 · Inngest · Resend | **$388** | ❌ **Rejected** — ADR-0013. Costs $19/mo more than the bundle it loses to, and "one vendor" counts Auth.js as a vendor when it is a library you operate |
| **Zero-Ops** | Nothing to patch at 2am — no VPS, every scraper rewritten as an Inngest cron function | Hybrid minus the VPS · ingestion on Inngest scheduled functions · Playwright on Vercel | **$381** | Considered. ADR-0014 moves against it by putting three workloads on the KVM |
| **Self-Hosted Power** | Cheapest line item, most expensive hour — everything on the Hostinger box behind Coolify | Coolify · self-hosted Supabase · n8n CE · Next in Docker · Umami instead of PostHog | **$270** | Considered. ADR-0014 option D rejects self-hosted Supabase on 1 vCPU / 4 GB |

---

## Open decisions this audit cannot close

### 1. ~~Full Vercel vs Hybrid Pragmatist~~ — closed

**Resolved 2026-09-12 by [ADR-0013](adr/0013-production-stack-configuration.md): Hybrid
Pragmatist.** The branch-prototype experiment this section previously proposed was not run, and
should not be — it costs a week to answer a question the price table and the ADR chain already
answer.

Three findings closed it. Full Vercel is **$19/mo more expensive** than the bundle it loses to, so
the single-vendor premium is paid in both directions. "One vendor" is a miscount: Vercel + Neon +
Auth.js is two vendors plus a library you operate without an SLA, against Vercel + Supabase, which
is two vendors covering the same surface with auth under someone else's pager. And the residency
question below now argues the same way — a regional Supabase project is a provisioning task, while
tenant isolation carried in application code makes a regional split a rewrite.

The Supabase-shaped assumptions the prototype was accruing are now an asset rather than a migration
liability.

### 2. Which jobs tolerate a cheaper model

ADR-0015, open. Answerable only via the eval harness in Critical Change 04. The premise —
that the best model for a concrete request is not the most expensive one — is well founded for
extraction and classification, and is an open empirical question for persona-driven conversation.

The boundary worth naming: **lawrence's highest-volume job is also its most quality-sensitive.** A
mediocre parent-facing turn does not produce a slightly worse log line; it loses the lead the entire
pipeline exists to capture.

### 3. Data residency

Both ADR-0013 (question #4) and ADR-0015 (question #3) carry this, and it may be decided
commercially rather than technically. A European or Thai agency requiring EU/APAC residency
eliminates candidate LLM endpoints outright.

For the database half, ADR-0013 has narrowed it rather than answered it: under Hybrid Pragmatist the
fix is a second Supabase project in the required region and RLS policies that travel with the
schema. That is provisioning work with a known shape, not an architecture change — which is part of
why the ADR resolved the way it did. **The open half is the LLM path**, where residency is a
filter on the candidate list rather than a deployment option.

### 4. When to leave the KVM1 🆕

Not previously listed. The Ops column makes it visible: the three lowest-maintenance-score layers in
the stack are all on one box, and [ADR-0014](adr/0014-kvm1-workload-allocation.md) justifies keeping
it on cost rather than on ops load.

The decision is correct today — Zero-Ops costs $12/mo more and makes long-running browser automation
worse. What is undecided is the exit trigger. Two candidates: the first agency compliance review that
asks who patches it, or the point where scraping needs more than one concurrent Chromium, since
1 vCPU is already the binding constraint.

---

## References

- [ADR-0012](adr/0012-design-partner-stack-for-prototype.md) — adopted prototype bundle
- [ADR-0013](adr/0013-production-stack-configuration.md) — production stack: Hybrid Pragmatist, accepted
- [ADR-0014](adr/0014-kvm1-workload-allocation.md) — KVM1 workload allocation
- [ADR-0015](adr/0015-ai-model-provider-strategy.md) — AI model provider strategy, open
- [ADR-0003](adr/0003-rls-policy-strategy.md) · [ADR-0005](adr/0005-chatbot-read-view-decoupling.md) · [ADR-0006](adr/0006-chatbot-n8n-orchestration.md) · [ADR-0010](adr/0010-configurable-intake-method.md)
- `.claude/rules/bant-scoring.md` — the five worked trajectories that become the eval suite

Costs are list price. They exclude Stripe fees and the Claude Code subscription. Host identifiers
are omitted per `.claude/rules/secrets.md`.
