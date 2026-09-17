# ADR-0012: Run the prototype on the "Design Partner" stack configuration

**Status:** accepted
**Date:** 2026-09-12

## Context

A full stack audit (see References) scored every layer of lawrence against six ranked criteria —
AI-developability, reliability, cost efficiency, scalability, developer experience, and operational
overhead — and produced five bundled stack configurations rather than a single recommendation,
because the right bundle depends on revenue stage rather than on architecture.

The five bundles and their cost at 10,000 conversations/month:

| Bundle | Positioning | ~$/mo @ 10K |
|---|---|---|
| Design Partner | Free tiers only, pre-revenue | $31 @ 1K |
| Self-Hosted Power | Cheapest line item, highest ops burden | $222 |
| Hybrid Pragmatist | Managed where failure is expensive (audit's recommendation) | $321 |
| Zero-Ops | Nothing to patch; no VPS at all | $333 |
| Full Vercel | One vendor, one invoice | $340 |

lawrence is pre-revenue. No agency has committed to payment, the v1 conversational flow has not
been validated against real parents, and the intake-method question (ADR-0010) is still open at the
product level. Under those conditions, every dollar of recurring infrastructure spend buys
capability the product cannot yet use, and every managed-service migration is work done against
requirements that have not been observed.

Two facts made the choice concrete rather than merely frugal:

1. **The existing Hostinger KVM1 is already paid for and almost entirely idle.** Seven days of
   metrics show CPU flat at 1.1–1.2% (peak 4.74%), RAM flat at ~1.55 GB of 4 GB, disk flat at
   27.7 GB of 51 GB, and roughly 1.5 GB/month of the 4 TB bandwidth allowance consumed. The
   prototype's orchestration and ingestion already run there at no marginal cost.
2. **Vercel's Hobby tier is only defensible while nobody is paying us.** Its terms prohibit
   commercial use. Today that is a legitimate fit; the day an agency pays, it becomes a compliance
   problem, and that day is the trigger to revisit this ADR — not a gradual cost curve.

## Decision

Run the prototype on the **Design Partner** bundle:

- **App hosting:** Vercel Hobby — legitimate *only* while pre-revenue.
- **Database:** Supabase Free tier. Accept the 500 MB ceiling, the 7-day inactivity pause, and the
  absence of point-in-time recovery.
- **Orchestration & ingestion:** n8n Community Edition on the existing Hostinger KVM1.
- **LLM:** Anthropic API, pay-as-you-go.
- **Everything else** (PostHog, Sentry, Resend, Upstash, BetterStack) on free tiers.

This decision is **explicitly provisional and time-boxed by a business event, not a date.** It is
approved for the prototype phase only.

**Re-evaluation trigger:** the first agency committing to payment. At that point ADR-0013 must be
resolved and this ADR superseded — Vercel Hobby's commercial-use prohibition makes the trigger a
hard boundary rather than a judgement call.

## Consequences

**Easier:**
- Recurring infrastructure spend stays at roughly the cost of the VPS already owned (~$5–8/mo)
  plus metered Anthropic usage, so runway is spent on finding design partners rather than on idle
  capacity.
- No migration work is performed against unvalidated requirements. The audit's structural findings
  (orchestration, rate limiting, frontend consolidation) remain actionable independently of which
  bundle is eventually chosen — they are code-level, not vendor-level.
- The VPS's unused headroom absorbs prototype-stage ingestion, scraping, and monitoring without a
  second invoice.

**Harder:**
- **Supabase Free has no point-in-time recovery and pauses after 7 days of inactivity.** A prototype
  losing its `leads` table mid-pilot is a credibility event with a design partner, not just a data
  loss. A nightly `pg_dump` to the VPS is the mitigation and should be treated as a prerequisite of
  this decision, not an optional extra.
- The 500 MB database ceiling and Hobby-tier function limits are real, and the product will hit
  them without warning rather than degrading gracefully.
- Staying on n8n for the prototype defers — but does not resolve — the orchestration finding: the
  chat agent is currently the least AI-developable component in the stack, and prompt changes still
  require a human clicking in the n8n UI.
- Secrets remain in plaintext inside n8n SET nodes for the duration of the prototype
  (see `.claude/rules/n8n-workflows.md`). This is accepted only because the VPS is single-tenant
  and pre-production; it is not acceptable past the re-evaluation trigger.

**Trade-off accepted:** near-zero burn and zero migration work now, in exchange for no disaster
recovery, hard free-tier ceilings, and a known compliance cliff at first revenue.

## References

- Stack audit scorecard (2026-09-12): https://claude.ai/code/artifact/eb08a2b5-4e3d-4084-936d-0a2994875c6f
- [ADR-0004](0004-self-hosted-free-software-mvp.md) — self-hosted/free software for MVP; this ADR
  is the concrete stack-level expression of that principle, and shares its re-evaluation logic.
- [ADR-0013](0013-production-stack-configuration.md) — the open decision this ADR defers to.
- [ADR-0006](0006-chatbot-n8n-orchestration.md) — n8n orchestration, retained for the prototype.
- Hostinger KVM1 utilization: 1 vCPU / 4 GB / 50 GB / 4 TB, `Ubuntu 24.04 with n8n` template,
  Boston (US) region. Host identifiers deliberately omitted per `.claude/rules/secrets.md`.
