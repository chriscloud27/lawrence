# AI Provider Seam

Every LLM call in this repo goes through `src/Chatbot/lib/ai/provider.ts`. The seam exists so that
"which model runs this job" is one reviewable line of data instead of a decision scattered across
call sites — and so that changing it is measurable. See [ADR-0015](../docs/adr/0015-ai-model-provider-strategy.md).

## Hard rules

- **No provider package is imported outside the seam.** `@ai-sdk/*`, `@anthropic-ai/sdk`, `openai`
  — none of them appear in a route handler, component, or agent file.
- **No model ID is written outside the seam.** Not in a component, not in a route handler, not in a
  constant at the top of an agent file. Ask for a job: `modelFor("parent_turn")`.
- **Every routing entry declares `endpointRegion`.** It is part of the type, not a comment. The
  market is UK agencies handling data about children, so where an endpoint serves from is a
  compliance answer, not a preference. First-party DeepSeek and Qwen APIs route to China; an
  endpoint that cannot state its region is not a candidate.
- **A routing change requires an eval run.** `npx promptfoo eval` at the repo root, with the result
  and the effective cost-per-conversation recorded in ADR-0015. Changing routing without one is
  precisely what the seam was built to prevent.
- **Every call is logged.** `logAiCall(costLogFrom(...))` — `generateForJob()` does it for you;
  a streaming call site must do it in `onFinish`. The metric that decides ADR-0015 is effective
  cost per conversation, and nothing else records it.
- **Never log prompt or completion text.** Parent messages are PII; the cost log carries counts only.

## Jobs

| Job | Model today | Provider | Note |
|---|---|---|---|
| `parent_turn` | `claude-haiku-4-5` | Anthropic | Highest volume and most quality-sensitive |
| `bant_delta` | `claude-haiku-4-5` | Anthropic | Same call as the turn today |
| `bant_refine` | `claude-sonnet-4-6` | Anthropic | Stage 2, 50–75 band only |
| `school_enrich` | `gpt-4o-mini` | OpenAI | Ingestion; the second provider ADR-0015 makes deliberate |
| `doc_extract` | — | — | v2 document upload; deliberately unrouted, `modelFor` throws |

Each is overridable by env (`AI_MODEL_PARENT_TURN`, …) so an experiment needs no code change. The
defaults in the seam are the values of record.

**Evaluation order is fixed by ADR-0015**: ingestion enrichment → Stage-2 scoring → BANT delta
extraction → the parent turn last, if at all.

## SDK version

`ai` is pinned to an **exact** version — `6.0.282`, no caret — with `@ai-sdk/anthropic` and
`@ai-sdk/openai` on their matching `3.x` line. v5→v6 was a breaking rewrite and models still emit
v3/v4 idioms confidently, so:

- **The v6 docs are authoritative over anything you recall.** Check `node_modules/ai` before writing
  a call you have not written in this repo before.
- `ai` v7 exists (first released 2026-06-25). Upgrading is a deliberate change with its own eval
  run, not a `npm update`.
- `claude-haiku-4-5` is a pre-4.6 model: thinking takes `budget_tokens`, and passing `effort` is a
  400. Do not pass `effort` to it.

## Prompt caching

Caching is the largest single cost lever in the ADR-0015 model, and the thing an open-weight
endpoint most often lacks — which is how an endpoint can cost more at a lower headline rate. Mark
the system prompt with `cacheableSystem()` and the school context block with `cacheableContext()`
so the loss of caching after a swap shows up as a measured change in the `[ai-cost]` log.

Anthropic will not cache a block under its minimum (2048 tokens on Haiku). A short prompt reporting
zero cache tokens is expected, not a bug.

## Prompts

System prompts live in `src/agents/prompts/` as `.txt` (`.claude/rules/ai-agents.md`), never inline.
`evals/prompt.js` reads those same files — an eval that grades a prompt the app does not use is
worth nothing.

## Evals

`promptfooconfig.yaml` at the repo root. The five worked trajectories in
`.claude/rules/bant-scoring.md` assert on **routing tier**, not exact integers: the rubric is
keyword-driven and two points of drift is not a regression, but crossing 50 or 75 is. Three further
assertions cover what a score cannot express — one question per turn, no qualification vocabulary
reaching the parent, an objection reframed rather than overcome.

To evaluate a candidate model, override the provider rather than editing the config:

```bash
npx promptfoo eval --providers anthropic:messages:<model>
```

Keys are read from `.env` at the repo root (a symlink to `.env.local`). **An `ANTHROPIC_API_KEY`
exported in your shell takes precedence over that file** — if a run fails on auth, check the shell
before the file.

## Gateways

No gateway (OpenRouter and similar). ADR-0015 open question #4 is undecided and a gateway adds a
party to the data path.
