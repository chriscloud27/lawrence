# ADR-0017: BANT routing thresholds — one Stage-1 gate at 25, Stage-2 routing at 50/75

**tl;dr** — The Stage-1 hot branch has never been reachable: the scorer's ceiling is 67 and the gate
is `> 75`, so no lead has ever escalated to a human out of pre-qualification. We remove the Stage-1
hot gate entirely rather than lower it, because Need is 25% of the final score and is never knowable
at Stage 1. Stage 1 keeps a single gate — **25** — that decides only whether the AI conversation
continues. Final routing stays at **50 / 75** on the full 0–100 score.

**Status:** accepted
**Date:** 2026-09-15
**Deciders:** Christian Weber

## Context

Three different threshold sets were live in the repo at once:

| Where | Stage-1 gates | Effect |
|---|---|---|
| `n8n/workflows/bant-prequalify.json` (committed), `.claude/rules/bant-scoring.md`, `evals/assert-tier.js` | `50` / `75` | `<50` resources, `50–75` Stage 2, `>75` hot |
| The workflow actually applied in n8n | `35` / `50` | `<35` resources, `35–50` Stage 2, `>50` hot |
| `src/Chatbot/lib/score.ts` display bands | `35` / `50` / `75` | four badge colours in Admin |

The third is not a conflict — those are display bands for a counsellor scanning a list, and they are
deliberately finer-grained than the routing tiers. The first two are a real conflict, and the
workflow carrying the first set is also internally inconsistent: `pre-qualifyJS` labels its `tier`
field using `MEDIUM`/`HOT` while the `Switch` branches on `LOW`/`MEDIUM`, and `Switch2-tier2`
hardcodes `50`/`75` instead of reading the SET node.

### The finding that decides it

Stage 1 scores three dimensions — timeline, budget, authority — and the scorer's own constants cap
each one below 25:

| Dimension | Strongest keyword match |
|---|---|
| timeline | 23 |
| budget | 22 |
| authority | 22 |
| **ceiling** | **67** |

The committed Stage-1 hot gate is `score > BANT_MEDIUM_THRESHOLD`, i.e. `> 75`. **A perfect
Stage-1 lead scores 67.** The `75+booking+inform` branch is dead code and always has been: in the
committed configuration no lead can reach a human out of pre-qualification, and every lead lands in
either the resources tier or Stage 2.

This reframes the applied `35/50` workflow. It was not an arbitrary tuning experiment — it was
somebody noticing that nothing ever routed hot and lowering the gates until something did.

`.claude/rules/bant-scoring.md` compounds the error by describing Stage 1 as "0–75 pts", which is
the nominal three-dimension maximum, not the achievable one.

## Decision

### 1. Remove the Stage-1 hot gate rather than lower it

Not a preference — it follows from the arithmetic. Stage 2 adds the **Need** dimension (0–25), a
full quarter of the final score, and Stage-1 refinement bonuses on top. Ask what Stage-1 score would
justify skipping Stage 2:

- To be hot (`>75`) on Stage 1 alone: impossible, ceiling is 67.
- To be hot given an *average* Need score (12): requires Stage 1 `> 63` — a 4-point window.
- To be hot given a *strong* Need score (20): requires Stage 1 `> 55`.

Every reachable Stage-1 hot gate is therefore a bet that Need will come back high. Checking that bet
costs two conversational turns and a fraction of a cent, which is what Stage 2 *is*. And a lead
escalated without a Need score hands the counsellor a hot lead with no idea what the call is about —
the single most useful thing on the sheet.

The speed-to-lead objection does not apply: Stage 2 runs inside a live chat the parent is already
in, not as a callback queue. Nobody is waiting.

### 2. Stage 1 keeps one gate, at 25

With no hot branch, the Stage-1 threshold no longer decides anything about counsellor time — the
Stage-2 floor of 50 does that. It decides only whether the AI conversation continues. That is a
pennies-per-conversation decision against a lost-family decision, and the asymmetry says be
generous.

`25` is roughly a third of the achievable range, and sits where it should against real inputs:

Scores below are **measured**, by running the workflow's own `pre-qualifyJS` against each input,
not estimated:

| Parent input | Stage-1 score | Gate 50 | Gate 35 | Gate 25 |
|---|---|---|---|---|
| `"hello"` — no signal | 9 | resources | resources | resources |
| `"just exploring, state school, consulting with family"` | 25 | resources | resources | **Stage 2** |
| `"I decide on this"` | 28 | resources | resources | **Stage 2** |
| `"looking at a premium boarding school"` | 28 | resources | resources | **Stage 2** |
| `"we need a place in September"` | 29 | resources | resources | **Stage 2** |
| `"we need a place in September, considering private"` | 40 | resources | **Stage 2** | **Stage 2** |
| `"urgent premium boarding place, my decision"` | 67 | **Stage 2** | **Stage 2** | **Stage 2** |

The single-strong-signal band — 28 to 29 — is what decides this. A parent who names a September
deadline, or says plainly that they are the decision-maker, or asks about premium boarding, and says
nothing else, lands there. Under the committed gate of 50 **and** under the applied gate of 35, all
three are sent a PDF and the conversation stops. That is the expensive error. The gate has to sit
below 28 to avoid it, and 25 is the highest round number that does.

Scores accumulate across turns (`Math.max` against `previousBreakdown`), so the resources tier is a
"not yet", not a verdict. That makes a low gate safer still.

### 3. Final routing is unchanged: 50 / 75

| Refined score (0–100) | Route |
|---|---|
| `< 50` | Standard resources, no escalation |
| `50 – 75` | Booking link, self-serve |
| `> 75` | Hot: booking link **and** notify admissions |

These are the only thresholds applied to a score that has all four dimensions. They are already what
`evals/assert-tier.js` asserts on, what the demo seed's `classification` values assume, and what
`.claude/rules/bant-scoring.md` documents for Stage 2 — so keeping them means the eval harness, the
fixtures, and the rubric stay mutually consistent with no edits.

## Consequences

- `BANT_LOW_THRESHOLD` becomes `25`. `BANT_MEDIUM_THRESHOLD` and `BANT_HOT_THRESHOLD` stop gating
  Stage 1 and are used only by the Stage-2 switch.
- The Stage-1 `Switch` keeps its three branches in the committed file, but the third is now
  *provably* inert rather than accidentally so: with `LOW = 25` and `MEDIUM = 75`, branch 1 covers
  `25 ≤ score ≤ 75`, which is the entire reachable range above the gate (ceiling 67). Deleting the
  branch is left to the graph rework described below, so that the threshold change stays a
  two-line, reviewable diff.
- **More leads enter Stage 2**, which is the intended direction and the only cost increase. Bounded
  by the per-session turn cap (build step 11) and unchanged counsellor load, since escalation is
  still gated at 75 on the refined score.
- `pre-qualifyJS` must label `tier` with the same threshold the `Switch` branches on. Today it does
  not, so the `tier` in the webhook response can disagree with the branch taken — and that `tier`
  is what `src/Chatbot/lib/session.ts` stores and the widget renders.
- `.claude/rules/bant-scoring.md` is corrected: Stage 1 is **0–67 achievable** (0–75 nominal).
- **The applied n8n workflow must be changed by hand** — editing the committed JSON does not touch
  the running instance. Until it is re-imported or hand-edited, the repo and the live behaviour
  still differ.
- Build step 14 moves these values into `agent_config`, at which point this ADR describes the seed
  values for that table rather than SET-node contents.

### Also found while measuring: the scorer reads negations as maximum signal

The table above was produced by running `pre-qualifyJS` directly. Doing so turned up a defect that
limits how much any threshold can be worth.

Each dimension is an `else if` chain ordered strongest-match-first, matching **substrings** with no
negation handling. So a phrase that denies a signal hits the positive branch first:

| Parent says | Dimension | Scores | Should score |
|---|---|---|---|
| `"not my decision"` | authority | **22** | 0–5 |
| `"my partner is leading, not my decision"` | authority | **22** | 0–5 |
| `"we cannot afford premium"` | budget | **22** | 0–5 |
| `"I'm looking for a state school, my wife decides"` | authority | **22** | 0–5 |

`/i decide|i'm looking|i want|my decision|i lead/` runs before
`/spouse decides|partner is leading|not my decision/`, and `"my decision"` is a substring of
`"not my decision"`. Same shape for budget: `/premium|…/` runs before `/cannot afford|…/`.

`i'm looking` is the worst of them — a neutral opener scored as maximum decision authority. It is
also inconsistent: `"I am looking"` scores 3, `"I'm looking"` scores 22.

The combined phrase `"not my decision and we cannot afford premium"` — a parent disqualifying
themselves on two dimensions at once — scores **47**, comfortably into Stage 2 under any gate
considered here.

**This is not fixed by this ADR** and it is not caused by it: the bug predates every threshold
discussed. It is recorded because it bounds the value of the exercise — a threshold is only as
good as the score it is applied to, and this scorer inflates. Two consequences:

- It argues *for* this ADR's central decision rather than against it. A scorer this crude must not
  be allowed to put a parent in front of a counsellor on its own.
- The fix is to invert each chain (check negations first) and anchor the patterns on word
  boundaries. That is a change of scoring behaviour, so it needs its own eval run against the five
  worked trajectories in `.claude/rules/bant-scoring.md` — and it is better done once, in
  TypeScript, at build step 14 than twice.

### Discovered while tracing the graph: nothing ever emails the admissions team

Following the connections out of the dead branch turned up a second, worse defect. The committed
workflow's only Gmail node, `inform-agent`, is reachable **only** from `Switch` output 2 — the
unreachable Stage-1 hot branch:

```
Switch --[2]--> offer-booking-link, inform-agent, upsert-lead, build-messages-hottier   (dead)

insert-messages-midtier --> Switch2-tier2 --[2]--> Respond - Refined Hot Lead            (live)
```

The live Stage-2 hot path terminates at a `respondToWebhook` node that returns
`escalated: true` and the booking link to the browser. No email is sent. No counsellor is told.
**The escalation that the whole two-stage design exists to produce has never fired.**

The four hot-tier nodes hanging off the dead branch are also redundant for persistence:
`upsert-lead-midtier` and `insert-messages-midtier` both run *before* `Switch2-tier2`, so by the
time a lead reaches the refined-hot output its row and transcript are already written with the
refined score.

This ADR does not rewire the graph — the running instance differs from the committed file, hand-
edited n8n JSON cannot be tested here, and build step 14 replaces this workflow with TypeScript.
It is recorded so step 14 ports the **intended** behaviour rather than the shipped behaviour:

- the refined-hot path must notify the admissions team, not only answer the browser;
- exactly one response per request (the dead branch fanned three nodes into one
  `Respond to Webhook`, which races);
- hot-tier persistence is redundant and should not be reimplemented.

## Alternatives considered

**Keep the applied `35/50`.** Rejected: `>50` escalates to a human on three keyword-matched
dimensions with no Need signal, which is the expensive false positive, and it is ~75th percentile of
the achievable range, so it fires often.

**Lower the Stage-1 hot gate to 55–63.** Rejected: see Decision 1. Every reachable value is a bet on
an unmeasured dimension, and the window is narrow enough to be arbitrary.

**Raise the scorer's per-dimension maxima to 25 so the nominal 75 is reachable.** Rejected as a
change of rubric rather than of routing. It would also invalidate the five worked trajectories in
`.claude/rules/bant-scoring.md` and require a fresh eval run. Worth revisiting when the scorer moves
into TypeScript at step 14.

## Related

- [ADR-0006](0006-chatbot-n8n-orchestration.md) — the n8n orchestration this configures
- [ADR-0015](0015-ai-model-provider-strategy.md) — Stage-2 model routing (`bant_refine`)
- `.claude/rules/bant-scoring.md` — the rubric these thresholds are applied to
- `promptfooconfig.yaml` + `evals/assert-tier.js` — assert on the 50/75 final tiers
