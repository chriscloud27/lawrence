# Lawrence Operational Infrastructure Plan

## Overview

This plan maps free/open-source tooling onto the four playbook stages (Stage 1: wedge validation → Stage 2: lean MVP → Stage 3: distribution scale → Stage 4: portfolio/concentration decision) for the Lawrence data-ingestion platform. It complements the existing strategy artefacts (TL;DR, Roadmap, Architecture) by answering "how do we actually run this?"

The foundation is already in place: n8n (self-hosted, Community Edition), Supabase/PostgreSQL, Anthropic SDK, Google Workspace (Gmail, Sheets), Next.js chatbot. This plan identifies which new tools to introduce when, where they integrate, and why. Default posture: minimal viable infrastructure at each stage, no premature SaaS adoption, no tool bloat.

---

## Layer 1: Functional Domain Coverage

Nine operational domains and their tooling:

| Domain | Recommended Tool(s) | Why This One | Integration Point |
|--------|--------------------|----|-------------|
| **a) Strategy & Decision Tracking** | ADR system (existing) | Git-native, numbered, status-flow governed by CLAUDE.md — already running, zero migration cost | `.claude/docs/adr/` directory; `adr-new` skill |
| **b) Project Management & Task Tracking** | GitHub Issues (Stage 1); Plane self-hosted (Stage 2+) | Stage 1: free, already implicit in git workflow. Stage 2: Plane (MIT/AGPL, self-hosted) replaces Sheets task logs, enables kanban + search when multi-person work arrives | GitHub API via n8n HTTP Request; Plane API for escalation routing |
| **c) Documentation & Knowledge Base** | Markdown-in-repo (Stage 1); Docusaurus (Stage 2+ if external-facing) | Stage 1: lean, git-tracked, no new infrastructure. Stage 2: Docusaurus (free, static, deployable to Pages) only if customer-facing docs needed — project-context.md flags "who are first clients?" as open | `.claude/docs/` source; GitHub Pages deployment |
| **d) Agentic Software Engineering** | Claude Code + MCP filesystem/GitHub (existing) | Already the engine for code gen, PR review, refactoring. No new tool needed Stages 1–2. Stage 3: consider headless Claude Code via CLI (`claude -p`) in GitHub Actions for PR reviews — free within existing Claude Code usage | MCP servers for file/git access; GitHub Actions webhooks |
| **e) Testing & QA Automation** | Vitest (Stage 1–2 unit tests); Playwright (Stage 2–3 e2e) | Vitest: chatbot already references Next.js test conventions; zero config for TypeScript. Playwright: e2e testing once chatbot UI stabilizes; runs in CI, catches regressions in qualification flow | `npm run test` in CI; `npx playwright test` in GitHub Actions |
| **f) Cloud Architecture & Infrastructure** | Docker + docker-compose (Stage 1–2); Coolify (Stage 3 if multi-instance) | Stage 1–2: hand-rolled docker-compose + Supabase CLI sufficient per ADR-0004 (MVP phase). Stage 3: Coolify (self-hosted PaaS, AGPL, free) unifies n8n + chatbot + Postgres deployment — avoids ops drift when scaling horizontally | Docker volume mounts for n8n data (`n8n_data`); Coolify deploys entire stack via git webhook |
| **g) Sales & Marketing Automation** | Gmail + Sheets (Stage 1–2); Listmonk (Stage 3 nurture) | Stage 1–2: existing `inform-agent` Gmail node + Sheets logging capture lead signals. Stage 3: Listmonk (self-hosted, AGPL, free) handles prospect email sequences — wired to n8n via HTTP Request + SET-node `LISTMONK_API_URL` | n8n HTTP Request node to Listmonk REST API; SET-node credential refs |
| **h) Financial Tracking & Unit Economics** | Google Sheet (Stage 2–3); skip specialized tool unless needed | Stage 2: simple CAC/LTV tracking sheet (free, already in stack). Stage 3: re-evaluate if P&L model grows past spreadsheet — likely stays Sheets; Actual Budget (self-hosted, OSS) only if multi-ledger accounting needed | Google Sheets API via n8n; template in `.claude/docs/data/` |
| **i) Agent Orchestration & Governance (beyond n8n)** | Skip Stages 1–3; watch CrewAI for Stage 4 | n8n + AI Agent node (ADR-0006) covers current + forecast Stages 1–3: single-tenant BANT workflows, not multi-agent governance. Stage 4 (portfolio path): flag CrewAI (54K+ stars, 5.2M mo. downloads, model-agnostic, production-ready) as fallback if multi-tenant agent coordination needed — superior maturity over Paperclip (6 mo. old, documented prompt-injection risk on templates) | **Not adopted yet**; monitor CrewAI releases; CrewAI Python SDK integrates with Claude API |

---

## Layer 2: Playbook Phase Mapping & Phasing Logic

| Domain | Stage 1: Wedge | Stage 2: Lean MVP | Stage 3: Distribution | Stage 4: Portfolio/Concentration |
|--------|---|---|---|---|
| **Strategy & Decision** | ADR system running | ADR-0010+ for new patterns | ADRs for multi-tenant patterns | ADRs for v2 architectural pivots |
| **Project Management** | GitHub Issues (backlog) | Plane self-hosted (kanban + sprint) | Plane + automation (webhooks) | Plane scaled or replaced per team size |
| **Documentation** | Markdown in `.claude/docs/` | `.claude/docs/` + Docusaurus build (if clients onboarded) | Docusaurus + customer API docs | Separate internal vs. external doc portals |
| **Agentic Engineering** | Claude Code manual review | Claude Code + MCP | Claude Code headless in CI/CD | Multi-agent coordination (separate from n8n) |
| **Testing & QA** | – (no tests yet; ad-hoc) | Vitest unit tests (>60% coverage) | Vitest + Playwright e2e (chatbot UI + n8n flow) | Playwright + performance benchmarks; n8n load testing |
| **Infrastructure** | Docker + docker-compose (laptop/VPS) | Docker + Supabase CLI (local + staging) | Coolify on single instance; auto-scale n8n via Coolify | Coolify multi-node or migration to Kubernetes |
| **Sales & Marketing** | Gmail notify + Sheets log | Gmail + Sheets (manual nurture) | Listmonk + n8n campaigns | Listmonk + CRM integration (or replace with lightweight CRM) |
| **Financial Tracking** | – (informal cost tracking) | Google Sheet (CAC/LTV, weekly review) | Sheet expanded (P&L, burn rate, CAC target) | Sheet or Actual Budget (formal accounting if turnover>$X) |
| **Agent Orchestration** | – (n8n only) | – (n8n only) | – (n8n only; monitor CrewAI) | CrewAI adopted *if* multi-tenant scaling required; else skip |

### Phasing Rationale

**Stage 1 (Wedge):** Minimal infrastructure. Prove core value (BANT chatbot + lead qualification) on one school/agency customer. n8n orchestration handles scrape + qualify + notify via existing nodes. ADR system + markdown docs sufficient. No dedicated test suite yet (speed > coverage). GitHub Issues for backlog. No financial tracking tool (bootstrap phase).

**Stage 2 (Lean MVP):** First cohort of paying customers. Add unit tests (Vitest) to prevent qualification regressions. Introduce Plane for multi-person task coordination. Optional Docusaurus if customers request docs. Continue Docker + Supabase CLI locally + Supabase managed staging. Financial tracking via Sheets (CAC/LTV weekly check-ins).

**Stage 3 (Distribution):** Scale to multiple customer verticals (international schools, regional agencies, etc.). Add Playwright e2e testing to catch qualification flow regressions at scale. Deploy Coolify on a proper instance to unify n8n + chatbot + Postgres (avoids docker-compose ops drift). Introduce Listmonk for prospect nurture campaigns (tied to n8n via HTTP Request). Headless Claude Code in GitHub Actions for PR review automation. Sheets CAC/LTV expanded to P&L tracking.

**Stage 4 (Portfolio/Concentration):** Strategic fork: either (a) focus on a single vertical and build depth, or (b) build a multi-tenant SaaS. If (b), evaluate CrewAI for multi-agent governance across customer instances (not a Stage 1–3 priority). Skip this layer if concentration is the call.

---

## Layer 3: Execution Plan for New Tools

### Plane (Project Management) — Stage 2

**What it replaces:**  
GitHub Issues + manual Sheets task logging → centralized kanban, team permission model, automation rules.

**How it connects:**  
Self-hosted Plane instance runs alongside n8n + chatbot. Plane webhooks (free tier) push issue state changes to n8n via HTTP Request node. Issues tagged `#urgent-qualification` trigger immediate n8n response escalations.

**Setup:**  
```bash
# Docker Compose approach (add to docker-compose.yml)
docker pull plane/plane:latest
docker-compose up -d plane
# Access at http://localhost:8000, configure SMTP for notifications via n8n Gmail
```

**Maturity:** [Emerging] — 2-year-old project (GitHub stars ~8K), active community, but smaller footprint than Jira. Stable for single-team use; no production SLA guarantees but suitable for bootstrap.

---

### Vitest (Unit Testing) — Stage 1–2

**What it replaces:**  
Ad-hoc manual testing → deterministic regression suite for qualification logic + Supabase queries.

**How it connects:**  
Chatbot `src/` tests run in CI via GitHub Actions. Vitest watches qualification scoring functions and Drizzle query builders. Tests commit alongside feature code (git-native, diffs visible in PR review).

**Setup:**  
```bash
npm install -D vitest @vitest/ui
# .next.config.ts already lists vitest; add vitest.config.ts
# Run locally: npm run test -- --watch
# In CI: npm run test -- --run
```

**Maturity:** [Proven] — Vitest 1.0+ stable (used widely in Next.js shops); zero config for TypeScript. Industry standard for modern JS/TS projects.

---

### Playwright (E2E Testing) — Stage 2–3

**What it replaces:**  
Manual browser testing of chatbot UI and n8n webhook responses → automated scenario replay (user conversation flow, qualification branching, booking link CTA).

**How it connects:**  
Playwright tests run headless in GitHub Actions against staging chatbot. Scenarios simulate parent user interaction: "ask timeline question → verify score updates → confirm routing tier" end-to-end. Logs stored as artifacts on failed runs.

**Setup:**  
```bash
npm install -D @playwright/test
npx playwright install
# playwright.config.ts: configure baseURL (staging), browser, retry logic
# tests/e2e/qualification-flow.spec.ts: test qualification > 75 → booking link appears
# In CI: npx playwright test
```

**Maturity:** [Proven] — Microsoft-backed, 3.5M+ monthly downloads, industry standard for e2e. Production-ready; no guardrails needed.

---

### Coolify (Deployment PaaS) — Stage 3

**What it replaces:**  
Hand-rolled docker-compose ops + manual Supabase CLI migrations → single-click deploy of n8n + chatbot + Postgres with auto-backups, auto-SSL, git-push-to-deploy.

**How it connects:**  
Coolify monitors `n8n/workflows/`, `src/Chatbot/`, and `supabase/migrations/` directories. On git push to main, Coolify rebuilds containers, applies migrations, restarts services. n8n SET-node secrets and `.env` vars are stored in Coolify's encrypted vault (no `.env` files in git).

**Setup:**  
```bash
# Install Coolify on a clean VPS (Ubuntu 20.04+)
curl -fsSL https://get.cohere.sh | sh
# Web UI at https://your-vps:3000
# Add git repo, link Dockerfile paths for n8n + chatbot, bind Postgres volume
# Configure Let's Encrypt auto-SSL via Coolify UI
```

**Maturity:** [Emerging] — Coolify 4.0+ released late 2024, ~5K GitHub stars, growing adoption in self-hosted communities. No production SLA, but suitable for single-instance, non-critical workloads (prototype → early Stage 2). Monitor for v5 updates; migration path is straightforward (re-deploy containers).

---

### Listmonk (Email Marketing) — Stage 3

**What it replaces:**  
Gmail-only notifications + static Sheets lists → self-hosted email marketing platform with templates, subscriber segmentation, campaign analytics, unsubscribe handling.

**How it connects:**  
n8n HTTP Request node POSTs to Listmonk REST API (`POST /api/subscribers`, `POST /api/campaigns/send`). SET-node stores `LISTMONK_API_URL` + `LISTMONK_ADMIN_KEY`. n8n decision tree: if lead score > 50 and email_opted_in, add to Listmonk list `hot-leads` and trigger nurture campaign. Listmonk handles delivery, bounces, unsubscribe compliance.

**Setup:**  
```bash
# Docker Compose approach
docker run -d \
  -p 9000:9000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=<secure> \
  --name listmonk \
  listmonk/listmonk
# Access at http://localhost:9000
# Create list "hot-leads", add email template, configure SMTP (via Gmail or SendGrid free tier)
# In n8n: HTTP Request node → PATCH /api/subscribers → body { email, name, lists: [1] }
```

**Maturity:** [Proven] — Listmonk 2.0+ stable (3+ years, 20K+ GitHub stars, used in production). AGPL licensed, battle-tested, no external dependencies for small subscriber counts (<10K).

---

### Docusaurus (Documentation Site) — Stage 2+ (optional, if external clients onboard)

**What it replaces:**  
Markdown-in-repo (internal only) → versioned, searchable, publicly hosted customer docs (API reference, chatbot widget integration guide, data formats).

**How it connects:**  
Source: `.claude/docs/` markdown files. Docusaurus generates static site. GitHub Pages or Coolify serves at `docs.chat.mach2.cloud`. n8n workflow embeds link to docs in booking-confirmation email and fallback messages.

**Setup:**  
```bash
npx create-docusaurus@latest docs-site classic
cd docs-site
# Copy `.claude/docs/data/`, `.claude/docs/adr/` into docs-site/docs/
# Customize docusaurus.config.js (title, logo, theme)
# npm run build → deploy to GitHub Pages or Coolify
```

**Maturity:** [Proven] — Docusaurus 3.0+ (Meta-maintained, 50K+ GitHub stars, industry standard for OSS + SaaS docs). Zero hassle; static generation is the sweet spot for product docs.

---

### CrewAI (Multi-Agent Orchestration) — Stage 4 (watch, don't adopt yet)

**What it replaces:**  
If Stage 4 path is multi-tenant SaaS: n8n single-instance → CrewAI handles multi-agent coordination across customer instances (e.g. one agent per school/vertical, sharing memory + tools).

**Why not Paperclip:**  
- CrewAI: 54K+ stars, 5.2M monthly downloads, model-agnostic (Claude, OpenAI, Ollama), production-grade (2+ years), LangGraph integration
- Paperclip: <6 months old, 50K stars (vanity metric), documented prompt-injection risk on community template import, not widely adopted yet in production

**How it would connect (future):**  
Python backend runs CrewAI agents per customer. Agents call n8n workflows via n8n HTTP Request trigger (webhook). Shared memory (Supabase `agent_memory` table) persists context across agent conversations. Claude API backend.

**Setup (future, Stage 4+):**  
```bash
pip install crewai
# Define agents (e.g., ScrapeAgent, QualificationAgent, NotifyAgent per school)
# Each agent owns sub-workflows, calls n8n via HTTP
# Memory backend: Supabase table
# CLI: `crewai run` or FastAPI wrapper for web requests
```

**Maturity:** [Emerging] — Stable API (1.0+), active development, strong community momentum. Production-ready but no long-term battle scars yet (unlike Temporal or Airflow for orchestration). **Recommendation: monitor releases, do NOT adopt in Stage 1–3.** Re-evaluate at Stage 4 if multi-tenant scaling requires it.

---

## Summary: Go/No-Go by Stage

| Stage | New Tools Introduced | Rationale |
|-------|----------------------|-----------|
| **1** | None (use existing stack) | ADR + n8n + Sheets + Gmail sufficient. Prove business model first. |
| **2** | Vitest, Plane (optional) | Add regression prevention + light project management. Docusaurus only if customers ask. |
| **3** | Playwright, Coolify, Listmonk | Harden against scale. Unified deployment. Email nurture for leads. |
| **4** | CrewAI (conditional) | Only if portfolio path chosen and multi-tenant agent governance required. |

---

## Notes & Caveats

**Source docs substitution:**  
The planning prompt referenced specific strategy documents (`solution-approach.md`, `status-quo.md`, `architecture.md`, `conversation-flow.md`, `qualification-scoring.md`, `implementation_plan.md`, `n8n-self-hosted-context.md`) that do not exist under those exact names in the repo. This plan was written using the actual project docs that cover the same ground:
- `.claude/docs/project-context.md`
- `.claude/docs/adr/0004-self-hosted-free-software-mvp.md`
- `.claude/docs/adr/0006-chatbot-n8n-orchestration.md`
- `.claude/docs/implementation-plan-bant-v1.md`
- `.claude/rules/` (bant-scoring, chatbot, n8n-workflows, ai-agents, database-migrations, docker)
- Auto-memory files (`MEMORY.md` + architecture/product context)

If those named files exist elsewhere (e.g., Google Drive, shared docs), please share them and I can re-pass this plan to reflect their exact guidance.

**Free/OSS verification:**  
Every tool recommended has a genuinely usable free tier or is fully open-source under a permissive license (MIT, AGPL, Apache). No paid-SaaS-only tools slip in. Calendly (already in use for booking links) is free for single-user; its cost is noted but accepted.

**n8n Community Edition constraints:**  
The plan accounts for n8n's lack of native Environment Variables panel (Community license limitation). All secrets route through SET-node (`init-secrets`) per `.claude/rules/n8n-workflows.md`. If Chris upgrades to n8n Cloud or Enterprise, this pattern can simplify — but it's not a blocker for Stages 1–3.
