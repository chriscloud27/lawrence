# ADR-0013: Production stack configuration

**tl;dr** — We chose the Hybrid Pragmatist bundle (Vercel Pro + Supabase Pro + Inngest + Resend,
with the KVM1 kept for scheduled ingestion) to keep multi-tenant isolation in RLS rather than in
application code, accepting a second vendor relationship and continued VPS patching duty.

**Status:** accepted
**Date:** 2026-09-12 · **Decided:** 2026-09-12
**Deciders:** Christian Weber

## Context

[ADR-0012](0012-design-partner-stack-for-prototype.md) puts lawrence on the free-tier "Design
Partner" bundle for the prototype and names its own re-evaluation trigger: **the first agency
committing to payment.** That trigger is a hard boundary, not a gradual cost curve — Vercel's Hobby
tier prohibits commercial use, so the prototype configuration stops being legitimate the day revenue
starts.

This ADR was opened to hold that decision with the options already analysed, so the choice could be
made under time pressure without re-doing the work. It was resolved on 2026-09-12, ahead of the
trigger — see **Decision**.

### Options under consideration

Costs are at 10,000 conversations/month and include metered Anthropic usage; see the Open Questions
section for a correction to the LLM figure used in the original audit.

| Option | Positioning | Infra $/mo | LLM $/mo | Total | Outcome |
|---|---|---|---|---|---|
| **A. Full Vercel** | One vendor, one dashboard, one invoice | ~$158 | ~$230 | **~$388** | ❌ Rejected |
| **B. Hybrid Pragmatist** | Managed where failure is expensive, self-hosted where the work is boring | ~$139 | ~$230 | **~$369** | ✅ **Chosen** |
| **C. Zero-Ops** | Nothing to patch at 2am; no VPS at all | ~$151 | ~$230 | **~$381** | ❌ Rejected |
| **D. Self-Hosted Power** | Cheapest line item, most expensive hour | ~$40 | ~$230 | **~$270** | ❌ Rejected |

> **Corrected 2026-09-12.** The first version of this table held each bundle's *total* from
> ADR-0012 — which was computed with the superseded $182 LLM line — and back-derived the infra
> column as `total − 230`. The correct operation is `infra + 48`. Three rows coincidentally still
> balanced; option D did not (`$40 + $230 = $270`, not `$222`). Totals above are the corrected
> ones. **Relative ranking is unchanged**, since the LLM line is identical across all four options
> — but the absolute figures are ~$48/mo higher than ADR-0012 records, which matters for pricing
> and runway conversations. ADR-0012 is `accepted` and is not edited; see
> `.claude/docs/stack-audit.md` for the derivation.

**A. Full Vercel** — Next.js on Vercel Pro, Vercel Blob for storage, AI Gateway, Neon Postgres,
Auth.js v5, Inngest, Resend. Single vendor relationship, single billing surface, tightest
integration between framework and platform.

**B. Hybrid Pragmatist** — Next.js on Vercel Pro, Supabase Pro (Postgres + Auth + Storage + RLS),
Drizzle, AI SDK v6 calling Anthropic directly, Inngest for durable work, Resend, Upstash rate
limiting; n8n retained on the existing Hostinger KVM1 for scheduled ingestion only.

**C. Zero-Ops** — Option B with the VPS eliminated: scrapers rewritten as Inngest scheduled
functions with Playwright running on Vercel. Removes all patching and backup duty at the cost of a
migration and worse ergonomics for long-running browser automation.

**D. Self-Hosted Power** — Coolify on Hostinger, self-hosted Supabase, n8n CE, Next.js in Docker,
Umami instead of PostHog. Lowest recurring spend, highest operational burden, and the worst fit for
the AI-developability criterion that ranks first in the audit.

### Decision drivers

Ranked, following the audit's criteria order:

1. **Multi-tenant isolation must be hard to get wrong.** Tenants are competing agencies; an
   isolation failure shows one agency another's leads. This is the highest-consequence dimension in
   the comparison and it outranks cost.
2. **AI-developability.** The codebase is maintained primarily through Claude Code; a layer whose
   public corpus teaches patterns that silently break is a recurring defect source.
3. **Operator load for two people** — one support relationship and one invoice is a real benefit,
   not a vanity metric.
4. **Cost at 10K conversations.**
5. **Residency optionality**, since it may be forced commercially at any time.

### The case that was made for Option A, and why it did not hold

**Option A (Full Vercel) was the initial leaning**, on driver 3: one vendor, one support
relationship, one invoice, and no cross-vendor debugging when something breaks at the boundary
between platform and database.

Three things undercut it.

**The vendor count is wrong.** Option A is Vercel + Neon + Auth.js v5. Neon is a separate company
reached through a marketplace listing, and Auth.js is not a vendor at all — it is a library the team
operates, with no SLA and no one to call. Option B is Vercel + Supabase: two vendors covering the
same surface, with authentication under someone else's pager. The single-vendor benefit holds on the
billing surface and not on operational responsibility, which is the half driver 3 was actually
about.

**It is the more expensive option.** $388 vs $369 at 10K conversations. Option A asks the project to
pay $19/mo *and* give up `auth.uid()`. A premium for consolidation is a defensible trade; a premium
for less consolidation than advertised is not.

**On driver 1 it is strictly worse.** Option A replaces Supabase with Neon + Auth.js v5. That removes `auth.uid()` — the single primitive
that [ADR-0003](0003-rls-policy-strategy.md) builds the RLS policy strategy on and that
[ADR-0005](0005-chatbot-read-view-decoupling.md) assumes when the chatbot reads through
`schools_chatbot` while owning `leads` and `messages`. Under Option A, multi-tenant isolation stops
being a database policy and becomes application code that every future query must remember to
apply. For a white-label product where tenants are competing agencies looking at each other's
leads if isolation fails, that is the highest-consequence change in the whole comparison.

Option A also inherits the audit's Auth.js v5 finding: a long beta whose public corpus is saturated
with v4 patterns that break silently — the worst possible profile for a codebase maintained
primarily through AI-assisted development, which is criterion #1.

Options C and D are rejected on narrower grounds. **C (Zero-Ops)** costs $12/mo more than B to
remove a VPS that ADR-0014 has since given three useful workloads, and it moves long-running browser
automation onto a platform poorly suited to it. **D (Self-Hosted Power)** is cheapest per month and
worst on driver 2; ADR-0014 already rejected self-hosted Supabase on 1 vCPU / 4 GB.

## Decision

**Option B — Hybrid Pragmatist.**

Next.js 16 on Vercel Pro (app + admin as one deploy), Supabase Pro for Postgres, Auth, Storage and
RLS, Drizzle for app-owned tables, AI SDK v6 behind the `lib/ai/provider.ts` seam, Inngest for
durable work, Resend for transactional mail, Upstash for rate limiting, PostHog and Sentry for
observability, and the Hostinger KVM1 retained for scheduled ingestion, nightly `pg_dump`, and
Uptime Kuma per [ADR-0014](0014-kvm1-workload-allocation.md).

`auth.uid()` stays the multi-tenancy primitive. [ADR-0003](0003-rls-policy-strategy.md) and
[ADR-0005](0005-chatbot-read-view-decoupling.md) stand unmodified, and the Supabase-shaped
assumptions the prototype has been accruing become an asset rather than a migration liability.

**Resolved ahead of the trigger, deliberately.** ADR-0012's trigger is the first agency committing
to payment. Deciding at that moment would mean deciding under commercial pressure while the
accumulated migration cost is at its maximum. Deciding now costs nothing and stops the accrual
argument entirely.

**Relationship to ADR-0012.** ADR-0012 remains `accepted` and in force: the prototype runs on the
Design Partner bundle until its own trigger fires. This ADR defines the configuration that takes
effect *at* that trigger. ADR-0012's status changes to `superseded by [ADR-0013]` when the trigger
fires, not before — it has not been edited here.

**What changes at the trigger, in order:** Vercel Hobby → Pro (a licensing obligation, same week as
the commitment, not a performance upgrade); Supabase Free → Pro (Free pauses after 7 days idle and
has no PITR); then Sentry and Inngest paid tiers when volume actually requires them, not in advance.

**Not blocked on this ADR, and unchanged by it** — code-level findings that applied to every option:
rate limiting on the public chat endpoint, consolidating `src/Admin` into the Chatbot app, and
moving the chat agent out of n8n. See build steps 10–14.

## Consequences

**Positive:**
- Multi-tenant isolation stays a database policy. A new query is safe by default rather than safe if
  the author remembered a `WHERE agency_id = …` clause.
- ADR-0003, ADR-0005, and ADR-0010's per-agency `intake_method` all keep their assumed substrate; no
  ADR is invalidated and no migration is created.
- Residency, if forced commercially, is a second regional Supabase project — provisioning work with
  a known shape, rather than an architecture change.
- Vendor commitments (annual discounts, startup credits) can now be negotiated against a known
  target configuration.
- $19/mo cheaper at 10K than the rejected option.

**Negative / accepted costs:**
- **Two vendor relationships instead of one.** Cross-boundary debugging between Vercel and Supabase
  is a real cost and this ADR accepts it. It is smaller than advertised — Option A had the same
  boundary with Neon — but it is not zero.
- **Supabase becomes a single point of failure across three concerns** — database, auth, and
  storage. A Supabase incident is a full product outage, not a degraded one. This is the genuine
  price of the one-primitive benefit and there is no mitigation short of the split Option A proposed.
- **The KVM1's operating burden is retained**, and with it OS patching, Docker upkeep, and the duty
  to verify that the nightly dump actually restores. The stack audit's Ops column scores this box as
  the lowest-maintenance-score cluster in the stack; keeping it is now a knowing choice rather than
  an inherited one. See open question 3.
- **Vendor lock-in to Supabase deepens with every RLS policy written.** Acceptable, because the
  alternative was lock-in to a self-operated auth library with no support path.

**Risks:**
- Supabase pricing or terms change materially before the trigger fires. Mitigation: the decision is
  revisited if that happens; nothing here is irreversible before Pro is provisioned.
- Auth.js v5 exits beta and Neon ships a compelling RLS story, making Option A stronger than
  assessed. Mitigation: re-open as a new ADR rather than editing this one. The cost inversion
  ($388 vs $369) would still have to reverse for the comparison to change.

## Open questions

1. ~~**Does the single-vendor benefit of Option A outweigh losing `auth.uid()` RLS?**~~
   **Resolved 2026-09-12: no.** The branch-prototype experiment proposed here was not run and should
   not be — it costs roughly a week to answer a question the cost table and the vendor-count
   correction already answer. Recorded because "we chose not to run the experiment" is itself a
   decision.
2. ~~**Is Auth.js v5 out of beta by the trigger date?**~~ **Moot.** Even at GA, Option A remains
   more expensive and still removes `auth.uid()`. Beta status was an aggravating factor, not the
   deciding one.
3. **When does the KVM1 stop being worth operating?** 🆕 Open. ADR-0014 justifies the box on cost;
   the audit's Ops column shows it carries the three lowest-maintenance-score layers in the stack.
   Two candidate exit triggers: the first agency compliance review that asks who patches it, or the
   point where scraping needs more than one concurrent Chromium, since 1 vCPU is already the binding
   constraint.
4. ~~**LLM cost correction.**~~ **Resolved 2026-09-12.** Anthropic spend at 10K conversations is
   **~$230/mo**, not the ~$182/mo of the original audit — re-derived with prompt-cache write
   premiums (1.25× for the 5-minute TTL) and a Sonnet-tier Stage-2 BANT scoring pass included. The
   option table above now carries the corrected totals (see the note beneath it); relative ranking
   is unchanged.
5. **Does any agency impose a data-residency requirement?** Open, and likely decided commercially
   rather than technically. **Narrowed by this decision:** under Option B the database answer is a
   second Supabase project in the required region, carrying its RLS policies with the schema —
   provisioning work, not an architecture change. That narrowing was itself a driver. The part that
   stays open is the LLM path, where residency filters the candidate endpoint list outright; see
   [ADR-0015](0015-ai-model-provider-strategy.md) question #3.

## References

- [Stack audit](../stack-audit.md) — `.claude/docs/stack-audit.md`, the source of truth for the
  scorecard, cost model, and bundle comparison. Presentation copy:
  https://claude.ai/code/artifact/eb08a2b5-4e3d-4084-936d-0a2994875c6f
- [ADR-0012](0012-design-partner-stack-for-prototype.md) — the provisional prototype stack this ADR
  supersedes *at ADR-0012's own trigger*, not on acceptance of this one.
- [ADR-0003](0003-rls-policy-strategy.md) — RLS policy strategy; the dependency Option A would have
  broken and this decision preserves.
- [ADR-0005](0005-chatbot-read-view-decoupling.md) — read-view decoupling; assumes Supabase.
- [ADR-0004](0004-self-hosted-free-software-mvp.md) — self-hosted/free for MVP; Option D is its
  maximal continuation.
