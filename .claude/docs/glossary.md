# Glossary

Domain terms and customer-specific vocabulary used in this project.

## Product & Domain

| Term | Definition |
|---|---|
| Lawrence | The data ingestion platform: scrapes, validates, AI-enriches, and stores school data, feeding a BANT-qualification chatbot/form product for education agencies. |
| Doris (Doris School Directory) | The external international-school source site (doris.school) that publishes school data as JSON-LD; Lawrence's primary scraping target, protected by Cloudflare bot challenge. |
| chat.mach2.cloud | The project's live domain for the Chatbot and Admin apps. |
| mach2.cloud | The sibling marketing/platform product that Lawrence's Landing site was forked from; still carries un-rebranded mach2.cloud content. |
| Chatbot (`src/Chatbot/`) | The Next.js 16 + React 19 parent-facing chat widget and schools directory; primary consumer of ingested school data and BANT qualification logic. |
| Admin (`src/Admin/`) | The Vite 5 + React 18 agency/counsellor dashboard; currently reads from local mock data only (disconnected from Supabase), scheduled to be consolidated into Chatbot in build step 13. |
| Landing (`src/Landing/`) | The static-export Next.js marketing site deployed to GitHub Pages; cloned from mach2.cloud. |
| Design Partner | The free-tier prototype infrastructure bundle (Vercel Hobby + Supabase Free + KVM1 n8n + pay-as-you-go Anthropic); also implicitly the target customer type (agencies pre-revenue, spending zero until three daily conversations). |
| Agency | A tenant/customer entity in the white-label model; each has its own `intake_method`, accent color, BANT thresholds, and routing config. |
| v1 / v2 | The scope-boundary convention: v1 = chatbot-only BANT MVP; v2 = pivot adding a structured intake form with multi-modal document upload as a peer intake surface. |
| KVM1 | The Hostinger VPS (1 vCPU / 4 GB RAM / 50 GB disk, Boston region) hosting n8n, the scraping worker, nightly `pg_dump`, and Uptime Kuma. |
| intake_method | The per-agency Postgres config value (`chatbot` \| `form` \| `both`) controlling which intake front-end(s) render on an agency's public site. |

## Qualification & Scoring (BANT)

| Term | Definition |
|---|---|
| BANT | Budget, Authority, Need, Timeline: the four-dimension lead-qualification framework (0–100 pts) used to route parents to different follow-up tiers. |
| Stage 1 (Pre-Qualification) | Deterministic JavaScript regex-keyword-matching scoring (0–75 pts) across Timeline/Budget/Authority from three lightweight questions, run in an n8n Code node. |
| Stage 2 (Refined Scoring) | AI-agent-driven follow-up (2–3 conversational questions) triggered only for the 50–75 pre-qual band; adds the Need dimension and re-scores to 0–100. |
| Need (dimension) | The fourth BANT dimension, introduced only in Stage 2, measuring clarity on the parent's specific challenge (exam prep, admissions, relocation, special needs). |
| BANT delta (block) | The hidden structured JSON output the AI agent produces per conversational turn (scores per dimension + explanation), never shown to the parent, parsed downstream for cumulative scoring. |
| Routing tier: Low-fit / Medium-fit / High-fit | Score-band routing categories: <50 → "Standard resources tier"; 50–75 → "AI consulting path"; >75 → "Hot lead + escalation". |
| classification | The DB column on `leads` storing `hot`/`warm`/`cold`, mapped from routing tier as low→cold, medium→warm, high→hot. |
| score_breakdown | JSONB column on `leads` storing `{timeline, budget, authority}` (+ `need` after Stage 2 refinement). |
| hot lead | A lead scoring >75, triggering booking-link surfacing plus a Gmail notification to the admissions team. |
| escalated | Stage 2 re-scoring output flag, true when refined score > 75. |
| forcing_function | *Used but undefined:* A TEXT column on `leads` intended to capture the event forcing a school move (relocation, deadline, exam deadline); name documented but no computation rule in any `.md` or rule file. |
| impetus | The parent's stated reason for the school search (e.g. "Relocation", "Academic fit", "Behavioural concerns"); one of the v2 form's required "Big 5" fields. |
| "Big 5" | The five required core intake-form questions in the v2 form (age/year group, timeline, budget range, impetus, current curriculum). |
| BANT Mapping | A Form Builder field-config option (dropdown: None/Budget/Authority/Need/Timeline) linking a custom form field to a BANT dimension for scoring. |
| profile completeness | *Used but undefined:* A UI metric shown as a percentage on the parent's Search Profile summary; no computation rule documented. |
| cost per qualified lead | The north-star metric for evaluating LLM provider/model choices (as opposed to cost per token). |

## Data & Schema

| Term | Definition |
|---|---|
| `schools` | Core table: one row per school (identity, location, profile, academics); primary key UUID; unique key `slug`. |
| `school_fees` | Child table: one row per fee line item (tuition by year group, application/enrollment/additional fees), FK to `schools`. |
| `school_entry_points` | Child table: one row per admissions cohort/entry window per school (places available, open/close dates, rolling vs. fixed admissions). |
| `scrape_queue` | Pipeline-control table tracking per-URL scrape status, HTTP ETag, content hash, and retry state; not joined with `schools` in the hot path. |
| `leads` | Chatbot/qualification table: one row per BANT-qualified session, keyed by TEXT `session_id`; written only by n8n via service-role key; distinct from scraping-pipeline tables. |
| `messages` | Chat transcript table: one row per message linked to a `lead_id`; RLS-gated read access via `messages_owner_select` policy. |
| `schools_chatbot` | Postgres view (read-only, `security_invoker=on`) flattening `schools` + `school_fees` into the shape the chatbot expects; the app never reads/writes `schools` directly. |
| `agent_config` | *Planned:* Table holding versioned system prompts, BANT thresholds, and routing copy, editable by counsellors via Admin form instead of n8n UI. |
| `intake_documents` | *Planned:* Child table for v2 form-uploaded files (storage path, mime type, extraction status). |
| `session_id` | TEXT UNIQUE column on `leads`, generated client-side (`crypto.randomUUID()`), bridging an anonymous browser session to a lead row before/without authentication. |
| `user_id` | Nullable UUID FK to `auth.users.id` on `leads`, set by the `link-lead` n8n workflow after Google sign-in. |
| extraction_confidence | Float 0.0–1.0, self-reported by the LLM per scraped school; below 0.6 flags `needs_review`. |
| `scrape_status` | Enum on `schools` (`pending` \| `ok` \| `failed` \| `needs_review`); `schools_chatbot` filters to `ok` only. |
| content_hash | MD5 hash of raw scraped HTML, used for change detection alongside HTTP ETag. |
| SEN (learning/behaviour support) | Special Educational Needs; two columns on `schools` (`sen_learning_support`, `sen_behaviour_support`) each valued `Basic` \| `Moderate` \| `Advanced` \| `Specialist`. |
| curricula enum taxonomy | Standardized list of curriculum values (IB, Cambridge, IGCSE, national curricula, etc.) derived from Doris Discover filter UI and validated against `schools.curricula` array. |
| `js_rendered` (error) | A specific extraction-agent error value indicating the scraped page was JavaScript-rendered and needs headless-browser fallback. |
| `db/migrations/001_init_postgres.sql` | *Stale / non-authoritative:* An earlier divergent schema from Drizzle/SQLite translation; superseded by `supabase/migrations/`. Do not edit. |

## Infrastructure & Stack

| Term | Definition |
|---|---|
| n8n | Self-hosted workflow orchestration tool (Community Edition) running ingestion pipelines and (currently) the chat agent; runs on KVM1. |
| SET node pattern (`init-secrets`) | Workaround for n8n Community Edition's lack of environment-variable support: all secrets/config stored plaintext in a single SET node referenced by downstream nodes via `$('init-secrets').item.json.KEY`. |
| Hybrid Pragmatist stack | The chosen production bundle (Vercel Pro + Supabase Pro + Drizzle + AI SDK v6 + Inngest + Resend + Upstash + KVM1 for ingestion); ~$369/mo at 10K conversations. |
| provider seam (`lib/ai/provider.ts`) | *Planned:* Single module through which every LLM call routes, mapping an `AiJob` to a model/provider/region, enabling model swaps via config change. |
| `AiJob` | Typed enum of LLM call sites: `parent_turn`, `bant_delta`, `bant_refine`, `school_enrich`, `doc_extract`. |
| Promptfoo | Free/OSS eval harness for testing BANT routing logic against the five worked trajectories from `.claude/rules/bant-scoring.md`. |
| Inngest | Background-job/durable-workflow service planned to absorb n8n's durable work (CRM writeback, email handoff, scheduled re-scoring) once the chat agent moves to TypeScript. |
| Upstash | Redis-based rate-limiting service (`@upstash/ratelimit`); to be applied per-IP and per-session on public chat endpoints. |
| Uptime Kuma | Self-hosted uptime monitoring on KVM1, watching Vercel/Supabase endpoints. |
| RLS (Row Level Security) | Postgres/Supabase policy mechanism enforcing per-tenant/per-user data isolation; `auth.uid()` is the project's multi-tenancy primitive. |
| `lw-*` design tokens | Tailwind v4 design-system token namespace (`--lw-accent`, `--lw-bg-card`, etc.), wired via `@theme` in `globals.css`; raw hex and default Tailwind palette classes forbidden. |
| WHITE-LABEL BLOCK | Marked section in `globals.css` where an agency's accent color family is swapped (e.g. `blue` → `emerald`) to re-skin the product per-tenant. |

## Process & Conventions

| Term | Definition |
|---|---|
| ADR (Architecture Decision Record) | Numbered, immutable decision-record format (`.claude/docs/adr/000N-*.md`) with Context/Decision/Consequences sections; status flow `proposed` → `accepted` → `superseded by [ADR-XXXX]`. |
| Build step / "build mode" | Numbered task files (`.claude/docs/build-steps/NN-*.md`) executed one at a time when the user says "build step N"; each has Assumes/Task/Do Not/Verify sections. |
| Two series (01–09 and 10–14) | Build steps split into v2 UI/dashboard build (01–09) and stack-remediation steps derived from stack audit (10–14), the latter run in dependency order. |
| Feature log / LAW-N | Running record of completed feature requests in `.claude/docs/feature-log.md`, each entry numbered `LAW-N` with What/Why/Scope/Links; populated via `/feature-log add` skill. |
| Architectural Principles | Six numbered rules governing qualification-by-listening, two-stage scoring, architecture-before-implementation, v1/v2 scope guard, Doris JSON-LD-only extraction, and configurable intake method. See `CLAUDE.md`. |
| re-evaluation trigger | Condition forcing migration from Design Partner prototype stack to Hybrid Pragmatist production stack: "the first agency committing to payment". |

## Known Inconsistencies

These subsystem conflicts exist in the codebase and are documented here so contributors recognize both vocabularies:

- **Two independent scoring models** (same `leads.score` DB column, different logic):
  - `bant-prequalify` (n8n workflow): regex-based, scores Timeline/Budget/Authority 0–25 each (Stage 1), then adds Need 0–25 via AI reply (Stage 2) → 0–100.
  - `chat-agent` (n8n workflow): LLM-based, scores timeline/forcing_function/commitment/location/budget differently; classification bands `<70 cold`, `40–70 warm`, `≥70 hot`.
  - See `n8n/workflows/bant-prequalify.json` vs `n8n/workflows/chat-agent.json`.

- **Three tier/band vocabularies in play** (routing tiers, not consistent across subsystems):
  - Chatbot client type: `low | medium | high` (`.src/Chatbot/lib/session.ts` `BantScoreState.tier`).
  - n8n Stage 2 output: `refined_low | refined_booking | refined_hot` (n8n `Switch2-tier2` node output keys).
  - Admin dashboard: `cold | warm | qualified | hot` (src/Admin/src/utils/score.ts `ScoreBand`, 4 bands vs. the others' 3).
  - Mismatch: "qualified" is the Admin synonym for "medium-fit", but absent from other layers.

- **Two `leads.id` conventions** (historical divergence):
  - Current (Supabase migrations): TEXT `session_id`, used as both the `leads` row key and n8n upsert conflict target.
  - Legacy (stale `db/migrations/001_init_postgres.sql`): UUID `id` with `SERIAL` surrogate; superceded, non-authoritative.
  - See `supabase/migrations/20260702_create_chatbot_leads_messages.sql` vs `db/migrations/001_init_postgres.sql`.
