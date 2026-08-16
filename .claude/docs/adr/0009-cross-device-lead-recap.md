# ADR-0009: Cross-device lead recap for returning signed-in users

**Status:** accepted
**Date:** 2026-08-16

## Context

ADR-0008 ("Link chatbot leads to identity") established the `leads.user_id`/`leads.session_id` 
bridge so a signed-in parent can have a durable qualification record across devices. That same 
ADR explicitly flagged as a v2 revisit trigger: *"if a lead's full history needs to be read back 
into a new device's chat window (needs a read-only `/api/lead/history` path — no rule conflict, 
just not built yet)"*. This ADR is that trigger firing.

Additionally, a data-loss bug was discovered: `n8n/workflows/bant-prequalify.json` only writes 
a `leads` row to Supabase when a session scores > 75 (hot tier). Low-tier and medium-tier 
sessions — the vast majority — currently persist zero leads data (no score, no prequal answers, 
no context). Fixing this is prerequisite to offering returning-user recaps; otherwise most 
users would have no history to recap.

Finally, the `messages` table (where individual conversation turns are meant to live) has RLS 
enabled but carries zero SELECT policies — even if message rows were written, no authenticated 
user could read them back today.

## Decision

1. **Fix the per-tier write gap in `bant-prequalify.json`:** Every tier (low, medium, hot) now 
   upserts a `leads` row and inserts both message turns (user + assistant) via Supabase's 
   PostgREST `/rest/v1/leads` and `/rest/v1/messages` endpoints, using the service-role key 
   (n8n's standard write pattern, per ADR-0008 & `.claude/rules/chatbot.md`). Classification 
   mapping: `low→cold`, `medium→warm`, `high→hot`. This fixes the hardcoded `"classification": "hot"` 
   bug that was hiding the fact that only hot-tier sessions ever reached the database.

2. **Add RLS SELECT policy to `messages`:** A new policy `messages_owner_select` allows authenticated 
   users to read their own messages via the RLS-scoped browser client (`lib/supabase-browser.ts`, 
   same pattern `lib/schools.ts` uses for the public schools view). No new API route needed — the 
   chatbot reads directly from Supabase on sign-in, staying consistent with the read-only boundary.

3. **Recap is deterministically templated, not LLM-generated:** The welcome-back greeting composes 
   from already-captured structured fields (`timeline`, `budget_range_usd`, `curriculum`, 
   `current_school`, `classification`, `score`) plus the most recent assistant message from 
   `messages`. String interpolation with graceful degradation for missing fields avoids a new 
   LLM prompt/call/failure surface for something deterministic. Revisit only if user testing 
   shows this reads too mechanical.

4. **Multi-lead users: pick most-recent by `updated_at`.** A signed-in user who chatted multiple 
   times before signing in will have multiple `leads` rows (one per anonymous session). The 
   chatbot fetches `leads.order('updated_at', desc).limit(1)` to show the most recent; true 
   cross-session merging (combining BANT signals) is explicitly deferred to v2.

5. **Trigger support:** Add `updated_at TIMESTAMPTZ` to `leads` (with a `BEFORE UPDATE` trigger 
   `set_updated_at()`) so n8n's upsert/patch calls don't need to manage timestamps themselves — 
   the database auto-stamps, matching the pattern in other tables and reducing n8n node complexity.

## Consequences

**Easier:**
- A returning signed-in user now gets a warm, personalized greeting that acknowledges their 
  prior search context and signals what we know about their needs — improves UX vs. the generic 
  welcome message every visit.
- Every lead is now durable at insert, not just hot tiers — fixes data loss and enables future 
  features like admin dashboards, follow-up email triggers, or multi-tier triage.
- The `messages` table is now readable by owners, unblocking future transcription/history-review 
  features and analysis.

**Harder:**
- `bant-prequalify.json` gains ~3 new HTTP Request nodes and corresponding Code nodes (one per 
  tier branch) for the per-tier upsert/insert pattern — approximately 50% more complexity in 
  the workflow, balanced against the fact that we're fixing a real bug and enabling v2 features.
- The recap greeting degrades gracefully when fields are missing, but won't read as rich as an 
  LLM paraphrase — purely a v1 pragmatism trade-off; revisit if qualitative feedback warrants 
  the complexity cost of adding an n8n agent node or a separate `/api/summarize` call.

**Accepted trade-off:** Deterministic templating over LLM-generated narrative, in pursuit of 
simpler v1 scope and fewer moving parts (no new OpenAI calls, no new prompt to maintain, no 
failure modes from LLM availability/rate-limits). The recap will be 2–3 sentences of structured 
context plus a call-to-action, not a novel — adequate for re-engagement without gold-plating.

**Risk:** n8n workflow complexity increases; the three new branches (low, medium, hot) each now 
manage a mini write-pipeline. Mitigation: Code nodes are structured identically (matching the 
existing `pre-qualifyJS`/`re-scoreJS` pattern), and every HTTP node uses the same headers/auth 
template, so the actual cognitive load is lower than raw node count suggests.

## References

- ADR-0008: Lead identity linking (the context and bridge that makes cross-device recap 
  possible)
- ADR-0002: Supabase CLI schema lifecycle (canonical schema lives in `supabase/migrations/`)
- `.claude/rules/chatbot.md`: Read-only chatbot, writes via n8n
- `.claude/rules/bant-scoring.md`: Tier thresholds and classification vocabulary (0–50→cold, 
  50–75→warm, 75+→hot)
