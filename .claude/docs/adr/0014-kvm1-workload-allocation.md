# ADR-0014: Allocate scraping, backups, and uptime monitoring to the Hostinger KVM1

**tl;dr** — We put the scraping worker, a nightly Supabase `pg_dump`, and Uptime Kuma on the
existing KVM1 alongside n8n, to use capacity we already pay for, accepting that the box stays
without an added access-control layer and that CPU is a hard single-core ceiling.

**Status:** accepted
**Date:** 2026-09-12
**Deciders:** Christian Weber

## Context

lawrence runs one Hostinger KVM1 (1 vCPU, 4 GB RAM, 50 GB disk, 4 TB/month bandwidth, Ubuntu 24.04
via the `Ubuntu 24.04 with n8n` template, Boston US region). It currently runs n8n only.

Seven days of metrics from the Hostinger API show the machine is almost entirely idle:

| Metric | 7-day reading |
|---|---|
| CPU | Flat 1.1–1.2%, single peak 4.74% |
| RAM | Flat 1.51–1.60 GB of 4 GB, no growth |
| Disk | 27.7 GB of 51 GB, varying ±20 MB across the week |
| Bandwidth | ~1.5 GB/month of 4 TB (<0.1%) |
| Uptime | 53.6 days continuous |

Two readings matter for allocation. **Disk is flat, not growing** — so the 27.7 GB is the template's
baked-in Docker images and layers, not accumulating n8n execution history; pruning execution data is
prevention, not cleanup. And **bandwidth is effectively untouched**, which is the machine's most
under-used asset.

[ADR-0012](0012-design-partner-stack-for-prototype.md) commits the prototype to free tiers, which
makes already-paid-for capacity the cheapest place to put any workload that fits. It also flags
Supabase Free's lack of point-in-time recovery as a risk requiring mitigation.

## Decision Drivers

1. **Marginal cost is zero** for anything that fits inside the existing subscription.
2. **1 vCPU is the binding constraint** — not RAM (61% free), not disk (46% free), not bandwidth
   (>99.9% free). The 1% CPU reading is an idle n8n, not headroom under load.
3. **Region is Boston (US); the market is UK and Thailand.** Boston→Bangkok is ~230 ms. Acceptable
   for batch work, unacceptable for anything parent-facing.
4. **Serverless is a poor host for long-running browser automation** — timeouts, cold starts, and
   shared-IP reputation all work against Playwright on Vercel.
5. **Operational simplicity** — this is a prototype-stage box maintained by a two-person team.

## Considered Options

**A. Leave it running n8n only.** Rejected — wastes capacity already paid for, and leaves ADR-0012's
backup risk unmitigated while a suitable backup target sits idle.

**B. Add scraping, backups, and uptime monitoring (chosen).** All three are batch or near-idle
workloads that fit within one core if serialized, and each exploits an asset the box already has:
bandwidth and a stable IP for scraping, disk for backups, always-on for monitoring.

**C. Also move the Next.js app here.** Rejected — Vercel hosts it better and free at this stage, and
Boston latency is wrong for UK/Thailand parents.

**D. Also self-host Supabase here.** Rejected — roughly eight containers against 1 vCPU / 4 GB. Not
viable at this size, and it would put the database and its own backup on the same disk.

**E. Also run local LLM inference here.** Rejected — no GPU, 1 vCPU, 4 GB RAM. Even a small
quantized model would be unusably slow. Recorded explicitly because it is a natural assumption when
[ADR-0015](0015-ai-model-provider-strategy.md) opens the question of open-weight models.

## Decision

Run three additional workloads on the KVM1 alongside n8n:

1. **Scraping worker** — headless Chromium for school data ingestion. **Exactly one concurrent
   browser instance**, with additional jobs queued. This is the CPU ceiling from driver #2, not a
   starting point to tune upward.
2. **Nightly `pg_dump` of Supabase** — mitigates the absence of PITR on Supabase Free, which
   ADR-0012 names as a prerequisite rather than an optional extra.
3. **Uptime Kuma** — ~100 MB RAM, negligible CPU; replaces the need for a hosted uptime vendor.

Supporting changes:
- Add **2 GB swap**, so a Chromium memory spike cannot OOM-kill n8n.
- Set `EXECUTIONS_DATA_PRUNE=true` and `EXECUTIONS_DATA_MAX_AGE=168` on n8n — prevention against
  future disk growth, not a fix for current usage.
- Reclaim template disk with `docker image prune -a` / `docker builder prune` after confirming
  usage with `docker system df`.

**No additional access-control layer will be added.** No firewall group, no reverse-proxy auth
hardening, no fail2ban. The n8n instance on this box is not treated as a high-security-access
surface at prototype stage, and the operational cost of maintaining that layer is judged not to be
worth it before there is a paying customer.

## Consequences

**Positive:**
- Three needed capabilities at zero marginal infrastructure cost, consistent with ADR-0012.
- ADR-0012's backup prerequisite is satisfied with a real target rather than a plan.
- Scraping gets a host that suits it — stable IP, no execution time limit, bandwidth that is
  >99.9% unused.
- Adding the uptime monitor removes a vendor from the eventual production stack comparison in
  [ADR-0013](0013-production-stack-configuration.md).

**Negative / risks:**
- **One core is the whole budget.** Scraping, n8n, and the backup job contend for it. If a scrape
  and a scheduled workflow overlap, n8n's UI becomes unresponsive. Serializing scraping to one
  browser is a mitigation, not a fix — the real fix is a larger plan, which is out of scope here.
- **The nightly `pg_dump` puts production lead data on this box.** That is a materially different
  content class from prototype workflow JSON: `leads` and `messages` contain parent and child PII.
  The no-security-layer decision above was taken about n8n access, and it now also covers a disk
  holding PII backups. **Recommended narrow mitigation: encrypt the dump at rest** (`age` or `gpg`
  on the output file). This is a one-line change to the backup script, not an access-control layer,
  and so does not reopen the decision above.
- Secrets remain plaintext in n8n SET nodes per `.claude/rules/n8n-workflows.md`, on a box with no
  firewall group attached. Accepted for prototype stage.
- Boston region means this box can never host anything parent-facing without a latency penalty for
  the actual market.

**Revisit when:** the first agency commits to payment — the same trigger as ADR-0012. At that point
the box holds real customer PII, and both the security posture and the single-core ceiling should be
re-decided rather than inherited.

## References

- Hostinger API metrics, 2026-09-05 → 2026-09-12. Host identifiers omitted per
  `.claude/rules/secrets.md`.
- [ADR-0012](0012-design-partner-stack-for-prototype.md) — free-tier prototype stack; names the
  backup prerequisite this ADR satisfies.
- [ADR-0013](0013-production-stack-configuration.md) — open production stack decision.
- [ADR-0015](0015-ai-model-provider-strategy.md) — model strategy; option E above is its
  self-hosting constraint.
- [ADR-0004](0004-self-hosted-free-software-mvp.md) — self-hosted/free software for MVP.
- `.claude/rules/n8n-workflows.md` — SET-node secrets pattern and backup commands.
