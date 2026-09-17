# Step 12 — Provider Seam and Eval Harness

> Critical Change 04 in `.claude/docs/stack-audit.md`, from ADR-0015. **These are one change, not
> two**, and the ordering inside the step matters: the eval harness must exist before the first
> model swap, not after. Without it, "Qwen is good enough for Stage 2" is an opinion, and a quality
> regression in BANT scoring stays invisible until an agency reports bad leads.
>
> **Run this before Step 14.** Step 14 writes the chat agent. If the seam does not exist first, the
> agent gets written against Anthropic directly and then needs a refactor.

## Assumes

- Step 10 complete — `.claude/rules/ai-agents.md` and `chatbot.md` carry the ADR-0015 routing note
- Step 11 complete — the public endpoints have a ceiling
- ADR-0015 is `proposed`; the routing table in it is a hypothesis, not a plan of record
- `.claude/rules/bant-scoring.md` contains five worked trajectories with expected scores and tiers

## Task

Build the two prerequisites that every ADR-0015 option depends on. Neither changes which model runs
today — this step makes the question answerable, not answered.

### 1. Dependencies

```bash
cd src/Chatbot && npm install ai @ai-sdk/anthropic zod
```

**Pin `ai` to an exact version, no caret.** v5→v6 was a breaking rewrite and models still emit
v3/v4 idioms confidently — the audit docks the AI SDK a point for exactly this. Record the pinned
version in `.claude/rules/ai-providers.md` (below) so future sessions know which docs apply.

### 2. The seam — `src/Chatbot/lib/ai/provider.ts`

One module. Every LLM call in the codebase goes through it; nothing else imports a provider package
directly.

```typescript
export type AiJob =
  | "parent_turn"        // highest volume, highest quality sensitivity
  | "bant_delta"         // structured extraction, folded into the turn today
  | "bant_refine"        // Stage-2, 50–75 band only
  | "school_enrich"      // ingestion, batched, lowest risk
  | "doc_extract";       // v2 document upload

export function modelFor(job: AiJob): LanguageModel
```

Requirements:

- The job→model map is **data, not branching logic** — one exported `const` record, so a swap is a
  one-line edit and a diff a reviewer can read.
- Every entry records `{ provider, model, endpointRegion }`. ADR-0015 is explicit that an
  evaluation must capture *which endpoint, in which region*, not just which model — carry that in
  the type so it cannot be omitted.
- Model IDs come from env via `lib/env.ts`, with the current values as defaults. Never inline a
  model string at a call site.
- Open-weight endpoints (Together, Fireworks, DeepSeek, OpenRouter) are reached through the AI
  SDK's OpenAI-compatible provider. Add the wiring but leave every job pointing at Anthropic — this
  step changes no routing.

Current defaults, per `.claude/rules/chatbot.md` and the audit:

| Job | Model | Note |
|---|---|---|
| `parent_turn` | `claude-haiku-4-5` | Pre-4.6 model: thinking needs `budget_tokens`, and `effort` is rejected |
| `bant_delta` | `claude-haiku-4-5` | Same call as the turn today |
| `bant_refine` | `claude-sonnet-4-6` | 50–75 band only |
| `school_enrich` | `gpt-4o-mini` | Per `.claude/rules/ai-agents.md`; the accidental second provider ADR-0015 makes deliberate |
| `doc_extract` | — | v2, unrouted |

### 3. Prompt caching

Caching is worth roughly a third of the Anthropic bill and is the single largest cost lever in the
model. It is also the thing an open-weight endpoint most often lacks — which is why an endpoint can
be more expensive at a lower headline rate.

Mark the system prompt and the school context block as cacheable in the seam, so a provider swap
reveals the loss of caching as a measured cost change rather than a silent one.

### 4. Cost instrumentation

Log `{ job, provider, model, endpointRegion, inputTokens, outputTokens, cacheReadTokens,
cacheWriteTokens, latencyMs, sessionId }` per call, per `.claude/rules/ai-agents.md`.

The metric that decides ADR-0015 is **effective cost per conversation**, not list price per token.
Nothing currently records it. Without this, the provider comparison cannot be run at all.

### 5. Eval harness — `evals/`

Install Promptfoo (free, OSS) at the repo root, not inside `src/Chatbot`.

Transcribe the five worked trajectories from `.claude/rules/bant-scoring.md` into test cases. This
is transcription, not design — the expected scores, dimension breakdowns, and routing tiers are
already written:

| Scenario | Pre-qual | Refined | Expected route |
|---|---|---|---|
| Relocating to HK, premium school, urgent | 72 | 82 | Hot lead |
| Exploring IGCSE, no timeline, budget unclear | 28 | 28 | Standard resources |
| A-level tuition, 6-week timeline, good budget, joint decision | 60 | 78 | Hot lead |
| Spouse leads, weak budget signal, exploratory | 47 | 47 | Standard resources |
| UK boarding school, premium budget, urgent | 68 | 90 | Hot lead |

Assert on **routing tier and score band**, not exact integers. The rubric is keyword-driven and a
two-point drift is not a regression; crossing 50 or 75 is.

Add at least three assertions the score cannot express, drawn from the persona rules in
`.claude/rules/chatbot.md`:

- At most one question per turn
- No mention of scoring, qualification, or thresholds
- An objection is reframed as information, not overcome

### 6. Rule file — `.claude/rules/ai-providers.md`

The seam only holds if future sessions route through it. Write the rule:

- Every LLM call goes through `lib/ai/provider.ts`; no direct provider import at a call site
- No model ID inline in a component, route handler, or agent file
- A routing change requires an eval run against `evals/` and a note in ADR-0015
- Record the pinned `ai` SDK version and that v6 docs are authoritative over recalled patterns
- Data residency: any candidate endpoint must record its serving region. First-party DeepSeek and
  Qwen APIs route to China; the market is UK agencies handling data about children, which makes
  this a compliance question rather than a preference

Reference the new rule from `CLAUDE.md`.

## Do Not

- Change which model any job uses. This step builds the mechanism; ADR-0015 open question #1 decides
  the routing, and only after evals run.
- Evaluate the parent-facing turn first. ADR-0015 sets the order: ingestion enrichment → Stage-2
  scoring → BANT delta extraction → parent turn last, if at all. The turn is the highest-volume job
  *and* the most quality-sensitive one.
- Pass `effort` to `claude-haiku-4-5` — it is a pre-4.6 model and will 400. Thinking there needs
  `budget_tokens`.
- Add a gateway (OpenRouter) in this step. ADR-0015 open question #4 has not been decided, and a
  gateway adds a party to the data path.
- Commit any API key. Keys go in `.env.local`; `.env.example` gets placeholders.

## Verify

- [ ] `npm run build` in `src/Chatbot` passes
- [ ] `ai` is pinned to an exact version in `package.json` — no `^`
- [ ] `grep -rn "@ai-sdk/\|@anthropic-ai/sdk\|openai" src/Chatbot --include=*.ts --include=*.tsx | grep -v "lib/ai/provider.ts"` returns nothing
- [ ] `grep -rn "claude-\|gpt-4" src/Chatbot --include=*.ts --include=*.tsx | grep -v "lib/ai/"` returns nothing
- [ ] `modelFor()` returns an Anthropic model for `parent_turn`, `bant_delta`, `bant_refine` — routing is unchanged by this step
- [ ] Every routing-table entry carries a non-empty `endpointRegion`
- [ ] `npx promptfoo eval` runs all five trajectories and reports pass/fail per routing tier
- [ ] The three persona assertions are present and fail when deliberately given a two-question reply
- [ ] One call emits a cost log line containing cache read and cache write token counts
- [ ] `.claude/rules/ai-providers.md` exists and is referenced from `CLAUDE.md`
- [ ] `git diff` contains no API key, project ref, or connection string
