# ADR-0001: Adopt Architecture Decision Record System

**Status:** accepted
**Date:** 2026-06-26

## Context

The project currently uses a flat `decisions.md` file with a basic template. As the Azure migration involves significant architectural choices (IaC tooling, Kubernetes patterns, storage strategy, identity management), decisions need to be:

- Traceable and immutable (ADRs capture context at decision time)
- Sequential and numbered (easy to reference in commits and docs)
- Accessible to both agentic (Claude) and human contributors
- Following established conventions (MaCh2.Cloud ADR standard)

A proper ADR system makes it clear when a decision is significant enough to warrant a record, provides a consistent format, and enables future team members to understand the "why" behind architectural choices.

## Decision

Adopt the Architecture Decision Record (ADR) system, following the MaCh2.Cloud standard (based on joelparkerhenderson/architecture-decision-record).

ADRs will live in `.claude/docs/adr/` with sequential four-digit prefixes (0001, 0002, ...) and lowercase dash-separated titles. The template defines three sections: Context, Decision, Consequences. Status values are proposed, accepted, deprecated, or superseded.

Claude Code (and human contributors) will generate new ADRs by copying `0000-template.md`, incrementing the number, and filling in the three sections.

## Consequences

**Easier:**
- New contributors understand decision rationale without asking
- Architecture discussions become documented artifacts
- Claude can auto-generate correctly numbered, structured ADRs
- Decision chains are visible (ADR-N supersedes ADR-M)

**Harder:**
- Must decide which decisions warrant an ADR (but guidelines are clear in `CLAUDE.md`)
- All ADRs are immutable — corrections require new ADRs, not edits

**Follow-up ADRs likely needed:**
- ADR-0002: Choose IaC tooling (Terraform vs OpenTofu)
- ADR-0003: Kubernetes networking model (CNI choice for AKS)
- ADR-0004: Secrets management strategy (Vault vs Key Vault)
