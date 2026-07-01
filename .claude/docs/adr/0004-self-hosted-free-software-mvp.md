# ADR-0004: Use self-hosted and free software versions for MVP phase

**Status:** proposed
**Date:** 2026-06-28

## Context

lawrence is in prototype/MVP phase with limited budget and unclear production requirements. We need to validate the core data ingestion concept (scrape → validate → enrich → store) before committing to expensive SaaS platforms or managed services. Using self-hosted and open-source tooling allows us to defer infrastructure decisions and avoid vendor lock-in.

## Decision

Adopt self-hosted and free/open-source software for the MVP phase:
- **n8n** self-hosted (no cloud/env features, no n8n Cloud)
- **PostgreSQL/Supabase** self-managed (Docker container for local, Supabase managed PostgreSQL for staging)
- **OpenAI API** for enrichment (pay-per-call, monitor usage closely)
- No premium SaaS tiers (Vercel, n8n Cloud, managed services)

This minimizes recurring infrastructure costs and keeps operational overhead low during validation.

## Consequences

**Easier:**
- Lower infrastructure costs during prototype phase
- Full control over data and deployment
- No vendor lock-in before product/market fit is validated
- Easy to migrate to managed services later (migration is an architecture decision, not an incident)

**Harder:**
- No cloud-native features (auto-scaling, built-in monitoring, managed backups)
- n8n maintenance, database backups, and uptime are our responsibility
- Must monitor OpenAI API usage to avoid surprise bills
- Scaling beyond self-hosted requires re-architecture (e.g., to n8n Cloud or Temporal)

**Trade-off accepted:** Operational burden now for cost savings and flexibility during MVP validation.
