# High-Level Architecture

*tl;dr;*
> Lawrence is a data-in, decision-out pipeline: capture a parent's signals through a chatbot, score them (BANT), and route hot leads to a human agent while cooling everyone else into a self-serve resource funnel. The architecture below is the target-state shape — a Netflix/Google/Meta-style layering of edge, application, data, AI, and platform concerns — with the current n8n/Supabase/Next.js stack mapped onto it so the v1→v2 path is visible rather than a rewrite.

---

## 1. Infrastructure Components

| Layer | Component | Purpose | Current (v1) | Target (v2+) |
|---|---|---|---|---|
| **Edge / Delivery** | CDN + WAF | Serve chatbot static assets, block abuse | Vercel/Next.js edge | CDN + WAF (Cloudflare/Azure Front Door) |
| **Identity** | AuthN/AuthZ | Session identity, agent-portal login | Google OAuth (Chatbot) | Central IdP (Auth0/Azure AD B2C), RLS-scoped tokens |
| **Orchestration** | Workflow engine | Pipeline triggers, retries, branching | n8n (Community, single instance) | n8n Enterprise / Temporal for durable execution |
| **Messaging / Queue** | Event bus | Decouple ingestion from scoring from notification | Direct node-to-node in n8n | Kafka/SQS between ingestion, scoring, notification domains |
| **Data store (OLTP)** | Relational DB | Leads, messages, sessions, schools | Supabase (Postgres) | Same, with read replicas per region |
| **Data store (analytics)** | OLAP / warehouse | Funnel metrics, BANT score distributions | — (none yet) | ClickHouse/BigQuery fed by CDC from Postgres |
| **AI layer** | LLM gateway | Model routing, cost control, prompt versioning | Direct OpenAI/Anthropic SDK calls | Internal gateway (LiteLLM-style) with fallback + rate limiting |
| **Observability** | Logs/metrics/traces | Pipeline health, AI cost tracking, chat latency | n8n execution logs only | OpenTelemetry → Grafana/Datadog, cost dashboards per model |
| **Secrets** | Secret management | Credential rotation, no plaintext in workflow JSON | n8n SET-node pattern (Community limitation) | Vault/External Secrets once on Enterprise/self-hosted multi-instance |
| **Compute** | Containers | Run n8n, chatbot, workers | Docker Compose, single host | Kubernetes (or managed container platform) with autoscaling |
| **CI/CD** | Deploy pipeline | Ship chatbot + migrations safely | Manual `/deploy-staging` skill | GitHub Actions → staging → prod gate, automated migration checks |

---

## 2. Application Features

Grouped by the four domains implied in `solution-components.md`: **Chatbot**, **Qualification**, **Session/Data**, **Discovery (School Search)**.

### Chatbot (parent-facing)
- Conversational entry point embedded on an agent/school website
- Warm, one-question-at-a-time BANT elicitation (no visible scoring, no forms)
- Objection handling with resource-tier fallback
- Session persistence + "remembered" returning visitor (Google auth)

### Qualification Engine
- **Stage 1** — deterministic JS pre-qualification (0–75 pts) on 3 lightweight questions
- **Stage 2** — AI agent refinement (35–75 band only) adding a Need dimension → 0–100 pts
- Hidden scoring: parent never sees thresholds or the word "qualification"
- Routing tiers: Standard resources (<50) / Booking path (50–75) / Hot lead + Gmail escalation (>75)

### Session & Data Layer
- `leads`, `messages` tables owned by the chatbot
- `schools_chatbot` read view owned by ingestion, decoupled from chatbot writes (ADR-0005)
- RLS enforced on every user/pipeline-facing table
- Local dev via Drizzle + SQLite mirror for fast iteration without touching Supabase

### School Search / Discovery
- Structured data ingestion via JSON-LD (Doris source, no LLM extraction needed for v1)
- Source-specific scrapers behind a common `{action}-{source}.json` n8n workflow convention
- Validation step before data lands in Supabase (schema conformance, not AI judgment)

### Agent/Admissions Notification
- Gmail-based escalation for hot leads (v1)
- v2: dashboard for admissions team, multi-channel notification (Slack/SMS)

---

## 3. Procedure (Request → Outcome Flow)

```
1. DISCOVERY
   Parent lands on agent/school site → opens Chatbot widget

2. CAPTURE
   Chatbot asks 1 pre-qual question per turn (empathetic framing)
   → JS scorer computes Stage 1 BANT delta per turn (0–75 running total)

3. ROUTE (post Stage 1)
   score < 50   → Standard resources tier (article + links, no agent contact)
   score 50–75  → AI Agent takes over for 2–3 targeted follow-ups
   score > 75   → skip to STEP 5 (hot lead)

4. REFINE (Stage 2, band 50–75 only)
   AI Agent conversation → JS re-scorer adds Need dimension → refined 0–100 score
   → re-route based on refined score (same tiers as above)

5. ESCALATE (score > 75)
   Booking link surfaced to parent
   → n8n triggers Gmail notification to admissions team
   → Lead + full BANT breakdown persisted to Supabase

6. PERSIST (every path)
   Session, messages, and final score/tier written to `leads`/`messages`
   → available to Chatbot for "remembered" return visits
   → available to future analytics layer (v2) for funnel reporting
```

---

## Notes / Open Questions
- This structure extrapolates from `.claude/docs/solution-components.md` (which is currently a skeleton — Sections `AI Agent`, `Store Session`, `Chatbot Logic/Frontend/Workflow`, `Website`, `School Search` are unfilled). Treat the mapping above as a proposal to fill those gaps, not as already-decided architecture.
- v1/v2 boundary per project principle: anything in the "Target (v2+)" column is explicitly deferred — do not build ahead of spec.
- Confirm with an ADR before adopting any "Target" component (event bus, LLM gateway, k8s) — these are technology choices per `CLAUDE.md` ADR guidance, not implementation details.
