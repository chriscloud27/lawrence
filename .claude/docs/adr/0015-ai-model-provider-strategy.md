# ADR-0015: AI model provider strategy — open the Anthropic-only constraint (open)

**tl;dr** — We reopen the "Anthropic only" constraint and move toward per-job model routing that
may include open-weight models (Qwen, DeepSeek, and peers), on the premise that the best model for a
concrete request is not the most expensive one; the routing table itself is not yet decided.

**Status:** proposed
**Date:** 2026-09-12
**Deciders:** Christian Weber

## Context

The original stack brief listed **"LLM Access: Anthropic API — non-negotiable."** That constraint is
hereby reopened. Two things changed:

1. **Cost became material.** At 10,000 conversations/month the LLM line is ~$230/month against ~$91
   of infrastructure — roughly 70% of total spend, and the only line that scales linearly with
   usage. Every other layer is effectively flat. See [ADR-0013](0013-production-stack-configuration.md)
   open question #3 for the derivation.
2. **The open-weight tier became genuinely competitive** on the specific job classes lawrence runs
   most of — classification, extraction, and structured scoring — rather than only on benchmarks.

### Stated premise

> **The best model on the market for a concrete workflow or AI request is not the most expensive
> one.**

This ADR treats that as a working premise, and it is a well-founded one: task–model fit beats
capability ranking. A model that tops general reasoning leaderboards is not thereby better at
extracting four numeric BANT dimensions from a paragraph of parent text — that job rewards
instruction-following and output-schema reliability, which small models do well and which frontier
pricing does not buy more of.

The premise has a boundary worth naming explicitly, because it is where the money actually is:
**lawrence's highest-volume job is also its most quality-sensitive.** The parent-facing conversation
carries the persona discipline in `.claude/rules/chatbot.md` — empathetic tone, one question per
turn, objection reframing, no visible qualification mechanics. A mediocre turn does not produce a
slightly worse log line; it loses the lead that the entire pipeline exists to capture. The premise
argues strongly for cheaper models on the surrounding jobs, and most weakly on this one.

### Three things that are routinely conflated

- **Open-weight ≠ self-hosted.** Qwen and DeepSeek models are served by commercial per-token APIs
  (Together, Fireworks, Groq, DeepInfra, OpenRouter) with no ops burden at all.
- **Open-weight ≠ cheaper by default.** The saving comes from the per-token rate; it can be erased
  if the endpoint lacks prompt caching, which is currently lawrence's single largest cost lever
  (cache reads at 0.1× base input).
- **Self-hosting is not available to us.** [ADR-0014](0014-kvm1-workload-allocation.md) option E
  records why: the KVM1 has 1 vCPU, 4 GB RAM, and no GPU. A dedicated GPU host is $200–1000/month
  and does not pay back below volumes far above 10K conversations/month.

## Decision Drivers

1. **Cost per qualified lead**, not cost per token — the metric that actually decides this.
2. **Quality on the parent-facing turn**, where errors are commercially expensive and invisible in
   logs.
3. **AI-developability** — the codebase's first-ranked criterion; a provider whose SDK and quirks
   are poorly represented in training data costs engineering time.
4. **Data residency.** The market is UK and Thailand, and `leads`/`messages` contain parent and
   child PII. This is a hard constraint, not a preference — see risks.
5. **Switching cost.** Whether a model swap is a config change or a code change.
6. **Feature parity** — prompt caching, reliable tool calling, and structured outputs are all load-
   bearing in the current design.

## Considered Options

**A. Keep Anthropic-only (status quo ante).** Simplest, one vendor, strongest tool-calling and
caching support, best AI-developability. Highest per-token cost, and pays frontier rates for jobs
that do not need frontier capability.

**B. Per-job routing across Anthropic + open-weight models via a serverless provider.** Anthropic
retained where quality is commercially load-bearing; open-weight models (Qwen, DeepSeek, or peers)
used for classification, extraction, enrichment, and possibly Stage-2 scoring. No GPU ops. Adds a
second vendor relationship and a quality-regression surface.

**C. Open-weight-only across all jobs.** Maximum cost reduction and no vendor lock-in. Puts the
parent-facing conversation — the product itself — on models not yet evaluated against the persona
spec. Not currently defensible without the evaluation harness described below.

**D. Self-host open weights.** Rejected on the hardware grounds in ADR-0014 option E.

### Candidate routing table (illustrative, not decided)

| Job | Volume | Quality sensitivity | Current | Candidate |
|---|---|---|---|---|
| Parent chat turn | Highest | **Highest** | Haiku 4.5 | Retain frontier; re-test last |
| BANT delta extraction | = turns | Medium | folded into chat call | Open-weight small |
| Stage-2 BANT refinement | ~30% | High | Sonnet 4.6 | Open-weight reasoning model |
| School enrichment (ingestion) | Thousands | Low | `gpt-4o-mini` per rules | Open-weight small, batched |
| v2 document extraction | Low | Medium | — | Open-weight vision / frontier |

Note that this table already resolves an existing inconsistency: `.claude/rules/ai-agents.md`
mandates `gpt-4o-mini` while `.claude/rules/chatbot.md` mandates `claude-haiku-4-5`. The project
already runs two providers; this ADR makes that deliberate instead of accidental.

## Decision

**None yet — this ADR is open.** What it establishes is the frame:

- The Anthropic-only constraint is **lifted as a constraint**. Anthropic remains a candidate per
  job, not a default for all jobs.
- The routing table above is a hypothesis to be tested, not a plan of record.

Two things should proceed now, because they are prerequisites under every option and are cheap:

1. **Introduce a provider abstraction seam.** Vercel AI SDK v6 already provides this — it has a
   first-party Anthropic provider and OpenAI-compatible providers covering Together, Fireworks,
   DeepSeek, and OpenRouter. Routing through one seam turns a future model swap into a config
   change. Doing this while still Anthropic-only costs almost nothing; retrofitting it later costs
   a refactor.
2. **Build the evaluation harness before swapping anything.** `.claude/rules/bant-scoring.md`
   already contains five worked trajectories with expected scores and routing tiers — that is a
   regression suite in prose form. Without it, "Qwen is good enough for Stage 2" is an opinion, and
   a quality regression in BANT scoring is invisible until an agency reports bad leads. Promptfoo
   (free, OSS) is sufficient.

## Consequences

**Positive:**
- Removes an unexamined constraint and replaces it with a per-job question that can be answered
  with evidence.
- The dominant cost line becomes addressable. Order-of-magnitude reductions on the non-conversational
  jobs are plausible; the exact figure depends on provider rates and caching support and must be
  measured, not assumed.
- The provider seam and the eval harness are both valuable independently of the outcome — the eval
  harness in particular closes a gap the stack audit flagged as a standing risk.
- Reduces single-vendor dependency for a product whose unit economics are LLM-dominated.

**Negative / risks:**
- **Data residency is the sharpest risk.** First-party DeepSeek and Qwen APIs route to China. For UK
  agencies handling data about children under UK GDPR, that is a compliance problem rather than a
  preference, and it is the kind of question an agency's legal review will ask directly. Mitigation:
  use Western-hosted open weights (Together, Fireworks, and peers serve these models from US/EU
  regions) — the weights are open, so the model choice and the hosting jurisdiction are separable.
  **Any evaluation must record which endpoint, in which region, not just which model.**
- **Prompt caching parity is not guaranteed.** Caching is currently worth roughly a third of the
  Anthropic bill. An endpoint without it can be more expensive at a lower headline rate. Compare
  effective cost per conversation, never per-token list price.
- **Tool calling and structured-output reliability vary more** across open-weight endpoints, and
  the BANT delta block depends on both.
- **AI-developability penalty.** Anthropic and OpenAI SDK patterns dominate training data; more
  obscure provider quirks mean more human debugging, against the first-ranked criterion.
- **Faster, less-announced deprecation** on serverless open-weight providers than on first-party
  frontier APIs. Pin model versions explicitly.
- More vendors, more keys, more failure modes for a two-person team.

## Open questions

1. **Which jobs actually tolerate a cheaper model?** Answerable only via the eval harness. Suggested
   order: ingestion enrichment first (lowest risk, highest volume), then Stage-2 scoring, then BANT
   delta extraction, and the parent-facing turn last if at all.
2. **What is the real effective cost per conversation** on each candidate endpoint, including cache
   behaviour and retry rates — not list price per token?
3. **Does any target agency impose a data-residency or sub-processor constraint** that eliminates
   candidate endpoints outright? This interacts with ADR-0013 open question #5 and may be decided
   commercially rather than technically. **ADR-0013 narrowed the database half** — a regional
   Supabase project handles it — so residency now lands almost entirely on this ADR's endpoint
   choice.
4. **Gateway or direct?** A single gateway (e.g. OpenRouter) simplifies routing and billing at the
   cost of another hop, another party in the data path, and less direct control over caching.
5. **Does the premise hold for the parent-facing turn specifically?** It is well supported for
   extraction and classification. For persona-driven conversation it is an open empirical question,
   and the one with the most revenue attached.

## References

- [ADR-0013](0013-production-stack-configuration.md) — production stack; open question #3 carries
  the ~$230/month LLM derivation this ADR responds to.
- [ADR-0014](0014-kvm1-workload-allocation.md) — option E records why self-hosting inference is not
  available on current hardware.
- [ADR-0012](0012-design-partner-stack-for-prototype.md) — free-tier prototype stack.
- `.claude/rules/bant-scoring.md` — the five worked trajectories that become the eval suite.
- `.claude/rules/chatbot.md` and `.claude/rules/ai-agents.md` — the two conflicting model defaults
  this ADR supersedes once resolved.
- Anthropic list pricing used for the baseline: Haiku 4.5 $1/$5 per MTok, Sonnet 4.6 $3/$15,
  Opus 5 $5/$25; cache reads 0.1× input, cache writes 1.25× (5-min TTL).
