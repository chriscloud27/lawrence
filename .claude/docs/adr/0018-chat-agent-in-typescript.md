# ADR-0018: The parent-facing chat agent runs in TypeScript; n8n keeps ingestion

**tl;dr** — The conversation moves back into `src/Chatbot/app/api/chat/route.ts`, streaming,
against the ADR-0015 provider seam. n8n is retained for scheduled scraping and auth linking. The
requirement that put the agent in n8n — non-developers owning the prompts and the conversational
flow — is met by an `agent_config` table and an Admin form, which is what that requirement actually
asked for and which n8n never gave it: versions, an author, and a revert.

**Status:** accepted
**Date:** 2026-09-16
**Deciders:** Christian Weber
**Supersedes:** [ADR-0006](0006-chatbot-n8n-orchestration.md)

## Context

ADR-0006 moved the agent out of TypeScript and into `chat-agent.json` in July. It was explicit
about the trade: latency and streaming were "not priorities", quick setup and a presentable demo
were, and the team wanted non-developers to own the prompts.

Two months of running it produced three findings that were not available in July.

### 1. Nothing has ever emailed the admissions team

Traced in full in [ADR-0017](0017-bant-routing-thresholds.md). The only Gmail node in
`bant-prequalify.json` hangs off a `Switch` branch that arithmetic proves unreachable: the Stage-1
scorer's ceiling is 67 and the branch gate is `> 75`. The live hot path terminates at a
`respondToWebhook` that answers the browser and tells nobody.

The escalation that the entire two-stage qualification design exists to produce has never fired,
in any conversation, since the workflow was written.

### 2. The Stage-1 scorer reads negations as maximum signal

Also ADR-0017. Each dimension is an `else if` chain ordered strongest-match-first, doing substring
matching with no negation handling, so `"my decision"` matches inside `"not my decision"`:

| Parent says | Scores | Should score |
|---|---|---|
| `"not my decision"` | authority 22 | 0–5 |
| `"we cannot afford premium"` | budget 22 | 0–5 |
| `"I'm looking for a state school, my wife decides"` | authority 22 | 0–5 |

`"I am looking"` scores 3 and `"I'm looking"` scores 22.

### 3. Stage 2 scores the advisor's reply, not the parent's

Found while planning this step. `re-scoreJS` opens:

```javascript
const aiReply = $json.reply.toLowerCase();
```

Every Stage-2 refinement bonus — budget on `premium|invest|afford`, timeline on
`september|exam|deadline`, the entire Need dimension — is matched against **the assistant's own
words**. A warm advisor who says "September is soon, and entrance exams can feel opaque" awards the
parent timeline +10 and need 20 for saying nothing at all.

### What the three have in common

None of them is an n8n defect. They are ordinary bugs. What matters is that all three survived
months of live use in a medium with **no types, no tests, no meaningful diff, and no local run** —
and that the second and third are invisible in the n8n canvas, because the canvas renders a box
labelled "re-scoreJS" and not the line inside it.

That is the actual argument, and it is stronger than the one ADR-0006 weighed. ADR-0006 traded
streaming for prompt-ownership. The trade it did not price was the loss of every mechanism that
makes a bug findable.

### The two constraints ADR-0006 conceded

- **No streaming.** ADR-0006 says so itself: "n8n webhooks are request/response by default and do
  not emit SSE cleanly, so streaming is exactly the capability in tension with moving orchestration
  to n8n."
- **No environment variables.** n8n Community Edition has none, which is why
  `.claude/rules/n8n-workflows.md` mandates a plaintext `init-secrets` SET node and warns that
  workflow exports must be kept private because of it. The project's secrets policy and its n8n
  policy are in direct tension, and the n8n one wins by necessity.

### The requirement is still valid

Non-developers owning the prompts and the conversational flow was a real requirement and remains
one. This ADR does not dispute it. It disputes that a workflow engine is how to satisfy it.

## Decision

**Move the parent-facing conversation into TypeScript. Keep n8n for ingestion.**

### 1. The agent

`src/Chatbot/app/api/chat/route.ts` — `streamText` from the AI SDK, model from
`modelFor("parent_turn")`. No provider package import and no model ID in the file
([ADR-0015](0015-ai-model-provider-strategy.md), `.claude/rules/ai-providers.md`). The
`search_schools` and `offer_calendar` tools return as AI SDK tools over the existing
`lib/schools.ts`, rather than as an n8n `toolHttpRequest` node holding a Supabase service key.

Streaming returns. It is a UX affordance and nothing more — ADR-0006 was right about that — but it
is the affordance that makes the product feel alive, and it costs nothing to have back.

### 2. BANT scoring — `src/Chatbot/lib/bant/`

The two-stage design stands. Stage 1 stays keyword matching and Stage 2 stays a model call; what
changes is that both are now TypeScript — typed, unit-tested, and covered by
`promptfooconfig.yaml`.

Both fixes from the findings above land here:

- Stage 1 checks the **negation branch first** in every chain and anchors on word boundaries, so
  `"not my decision"` cannot fall into the `my decision` branch above it and `"I'm looking"` scores
  the same as `"I am looking"`. The 23/22/22 constants are unchanged, so ADR-0017's ceiling of 67
  and its gate at 25 remain exactly as decided.
- Stage 2 scores **the parent's messages**. The advisor's replies are not scoring input.

Scoring signatures take a conversation and a previous breakdown, never a request or a route type:
per [ADR-0010](0010-configurable-intake-method.md) the same engine must run on a form-sourced
`leads` row with no conversational turns at all.

### 3. Prompt ownership — `agent_config` plus a form

A versioned table, one active row per agency, holding the system prompt, the BANT thresholds, and
the routing copy. An Admin form edits it; **saving inserts a new version rather than mutating the
active row**, and a revert button activates a previous one. RLS scopes it by agency through
`current_agency_ids()` ([ADR-0016](0016-agency-tenancy-model.md)), with insert restricted to the
`owner` role.

This is what ADR-0006 wanted. A counsellor changes the prompt without a developer and without a
deploy — the same property n8n offered — and gains three that n8n did not: a version history, a
named author, and a revert that takes one click at 17:00 on a Friday.

### 4. Durable side effects — Inngest

Everything that must survive a failed request becomes an Inngest step rather than request-path
work: the `leads` upsert, the `messages` insert, and the hot-lead notification. Each retries
independently, so a Supabase blip re-runs a write without re-running the model.

The notification goes out through **Resend** with a React Email template in the repo, replacing a
Gmail node bound to a personal test account. Deliverability, domain authentication, and an audit
trail are the reasons; that the Gmail node also never fired is the occasion.

Escalation is idempotent via `leads.escalated_at` — a retried step must not send a second email.

**This supersedes a standing rule.** `.claude/rules/chatbot.md` said all Supabase writes go through
n8n. Writes now go through Inngest steps holding the service-role key. The chatbot **request path
stays read-only**, which was the substance of the original rule.

### 5. What stays in n8n

`scrape-doris-school.json` — scheduled scraping is what n8n is genuinely good at: batch,
non-realtime, glue-heavy, nobody's latency budget. [ADR-0014](0014-kvm1-workload-allocation.md)
allocates it to the KVM1 and this ADR does not disturb it.

`link-lead.json` — the post-sign-in identity link ([ADR-0008](0008-lead-identity-linking.md)),
still called by `/api/lead/link`.

`chat-agent.json` and `bant-prequalify.json` are deleted. The durable record is git history —
`git show a46e12d:n8n/workflows/chat-agent.json` — not a second committed copy: a workflow export
carries the `init-secrets` SET-node values in plaintext, which is exactly what
`.claude/rules/n8n-workflows.md` says must not sit in the repo. A working copy is left untracked
under `.claude/docs/archive/n8n/` for convenience during the cutover.

## Consequences

**Easier**

- A scoring bug is now a failing test rather than a field report. The three findings above were
  each found by reading, not by tooling; in TypeScript the second and third are unit tests.
- `npx promptfoo eval` grades the engine the app actually runs. Before this, the eval harness built
  in step 12 graded prompts that lived beside a scorer implemented somewhere else entirely.
- Secrets leave the workflow JSON. The Supabase service key and the Calendly link move to
  environment variables, which resolves the standing conflict between `.claude/rules/secrets.md`
  and `.claude/rules/n8n-workflows.md` for this path.
- Streaming, prompt caching (`cacheableSystem`), and the `[ai-cost]` log all become available to
  the highest-volume call in the product — which is the call ADR-0015 most needs cost data on.

**Harder**

- A prompt change is now a database write rather than a canvas edit. Mitigated by the form, and
  the form is better; but a counsellor who liked seeing the graph loses the graph.
- Two runtimes to run locally instead of one: `npm run dev` plus `npx inngest-cli dev`.
- Three new dependencies (`inngest`, `resend`, `@react-email/components`) and two new accounts.
- The cutover is one-way for the chat path. The archived JSON is the only rollback.

**Accepted trade-offs**

- Inngest is a hosted dependency in production, which ADR-0004's self-hosted-free-software
  preference does not love. Its free tier covers the pilot and the alternative — durable retries
  written by hand — is worse code for the same behaviour. Revisit if the pilot outgrows the tier.
- `agent_config` is read by the chat route with the service key, because the parent is anonymous
  and must not be able to read another agency's prompt. The route therefore resolves its own tenant
  from `AGENCY_SLUG` rather than from the request. Single-tenant-per-deployment, and a
  host-based resolver is a v2 concern.

## Related

- [ADR-0006](0006-chatbot-n8n-orchestration.md) — superseded by this
- [ADR-0015](0015-ai-model-provider-strategy.md) — the seam every call here goes through
- [ADR-0016](0016-agency-tenancy-model.md) — `current_agency_ids()`, which `agent_config` reuses
- [ADR-0017](0017-bant-routing-thresholds.md) — findings 1 and 2, and the thresholds seeded here
- `.claude/docs/build-steps/14-chat-agent-extraction.md` — the step this implements
