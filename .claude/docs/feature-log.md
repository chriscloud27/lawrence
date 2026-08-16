# Feature Log — lawrence

Running record of completed feature requests, one factsheet block per entry (newest first).
Populated via `/feature-log add`; condensed into a status update via `/feature-log summary`.

**Type legend:** `feature` (new capability) · `fix` (bug/defect) · `chore` (maintenance, deps,
config) · `refactor` (no behavior change)

---

## LAW-10: Document the missing needs_review → ok promotion step
**Date:** 2026-08-16  **Type:** fix  **Status:** done

**What:** Added `.claude/docs/upsert-school-data.md` documenting that
`upsert-schools.mjs` always sets `scrape_status: 'needs_review'` with no
promotion path to `ok`, and that `schools_chatbot` filters on `ok` — silently
hiding every scraped school from `/schools`. Approved the currently
`needs_review` rows to `ok` as a manual stopgap.
**Why:** User reported `/schools` only showing one school; root cause was
undocumented and had no fix path.
**Scope:** `.claude/docs/upsert-school-data.md`
**Links:** none

---

## LAW-9: Capture raw Doris school pages as scrape reference data
**Date:** 2026-08-16  **Type:** chore  **Status:** done

**What:** Saved raw HTML/JS/CSS page captures and JSON snapshots for 5 Bangkok international
schools (Berkeley, Lycée Français, two Wells International campuses) under
`.claude/docs/data/sources/`.
**Why:** Reference fixtures for building/validating the Doris JSON-LD scraper against real page
structure.
**Scope:** `.claude/docs/data/sources/doris-school/*`, `.claude/docs/data/sources/*.json`,
`.claude/docs/data/sources/doris-school.md`
**Links:** commit f151385

---

## LAW-8: Grant schools_chatbot view SELECT + add run-chatbot dev skill
**Date:** 2026-08-16  **Type:** chore  **Status:** done

**What:** Added a grant migration for `schools_chatbot` base-table SELECT access and a
`/run-chatbot` skill (build/run/screenshot driver) for local dev verification.
**Why:** Chatbot reads were failing without the grant; needed a repeatable way to boot and
verify the app during development.
**Scope:** `supabase/migrations/20260816190000_grant_schools_chatbot_base_table_select.sql`,
`.claude/skills/run-chatbot/`
**Links:** commit f151385

---

## LAW-7: Google sign-in wired to lead identity linking
**Date:** 2026-08-16  **Type:** feature  **Status:** done

**What:** Added the Supabase Auth Google OAuth callback route, browser/server Supabase clients,
the `link-lead.json` n8n workflow, and `/api/lead/link` route bridging a browser session to an
authenticated `leads.user_id`.
**Why:** Parents need a durable, cross-device lead record instead of localStorage-only session
state, per ADR-0008.
**Scope:** `src/Chatbot/app/auth/callback/route.ts`, `src/Chatbot/app/api/lead/link/route.ts`,
`src/Chatbot/lib/supabase-browser.ts`, `src/Chatbot/lib/supabase-server.ts`,
`n8n/workflows/link-lead.json`, `supabase/migrations/20260816121024_add_lead_auth_linking.sql`
**Links:** ADR-0008, commit f151385

---

## LAW-6: Marketing homepage built out in Chatbot app
**Date:** 2026-08-16  **Type:** feature  **Status:** done

**What:** Added a full marketing homepage (hero carousel, nav, services tabs, awards, news,
footer, trustpilot strip) plus a `/schools` browse page and school card/search updates.
**Why:** v1 needs a public-facing marketing site alongside the chat widget, not just the bare
chat UI.
**Scope:** `src/Chatbot/components/marketing/*`, `src/Chatbot/app/page.tsx`,
`src/Chatbot/app/schools/page.tsx`, `src/Chatbot/components/schools/SchoolCard.tsx`,
`src/Chatbot/lib/schools.ts`
**Links:** commit f151385

---

## LAW-5: Rebuilt Chatbot as new Next.js MVP with n8n BANT pre-qualify workflow
**Date:** 2026-08-16  **Type:** feature  **Status:** done

**What:** Retired the old Chatbot implementation (moved to `src/Chatbot-old`) and stood up a
fresh Next.js app plus the `n8n/workflows/bant-prequalify.json` workflow (SET-node secrets,
3-question pre-qual, Stage 1 JS scoring) as the v1 MVP.
**Why:** ADR-0007 decided to build a custom chatbot rather than adopt an OSS chat platform;
needed a clean-slate MVP aligned with the BANT spec.
**Scope:** `src/Chatbot-old/` (renamed from `src/Chatbot`), `src/Chatbot/` (new),
`n8n/workflows/bant-prequalify.json`,
`.claude/docs/adr/0007-build-custom-chatbot-not-oss-platform.md`,
`.claude/docs/solution-components.md`, `.env.example`
**Links:** ADR-0007, commits 6df2809, 2493f6e

---

## LAW-4: Simplify BANT pre-qualification tier thresholds to a three-tier model
**Date:** 2026-08-16  **Type:** fix  **Status:** done

**What:** Collapsed the four-tier pre-qual routing (35/50/75 split) into the documented
three-tier spec (50/75), removing the redundant "medium-high / booking-link" tier and updating
the implementation plan and worked examples to match.
**Why:** The scoring rubric and implementation plan had drifted from the intended simpler
routing model.
**Scope:** `.claude/rules/bant-scoring.md`, `.claude/docs/implementation-plan-bant-v1.md`
**Links:** commit fd969f2

---

## LAW-3: Grant service_role DELETE/UPDATE on school_fees and school_entry_points
**Date:** 2026-08-16  **Type:** fix  **Status:** done

**What:** Added grants so `service_role` can DELETE/UPDATE `school_fees` and
`school_entry_points`, matching privileges already held on `schools`.
**Why:** Pipeline re-scrape writes failed with "permission denied for table school_fees"
because `service_role` only had INSERT/SELECT/REFERENCES on these two child tables.
**Scope:** `supabase/migrations/20260816182701_grant_service_role_school_fees_entry_points_write.sql`
**Links:** none

---

## LAW-2: Feature log + executive-summary skill, wired to auto-trigger
**Date:** 2026-08-16  **Type:** chore  **Status:** done

**What:** Added `.claude/docs/feature-log.md` and the `/feature-log` skill (`add`/`summary`
modes), plus a CLAUDE.md rule so completed feature requests get logged without an explicit
manual call each time.
**Why:** User wants a running record of shipped work dense enough to compress into an
executive summary on demand, without having to remember to trigger it themselves.
**Scope:** `.claude/docs/feature-log.md`, `.claude/skills/feature-log/SKILL.md`, `CLAUDE.md`
**Links:** none

---

## LAW-1: Cross-device lead recap for returning signed-in users
**Date:** 2026-08-16  **Type:** feature  **Status:** done

**What:** Every BANT pre-qual tier (not just hot) now persists a `leads` row and both message
turns to Supabase; `messages` gained an RLS SELECT policy; returning signed-in parents get a
templated welcome-back recap built from their stored qualification data.
**Why:** ADR-0008 flagged full-history recap as a v2 trigger; also fixed a data-loss bug where
low/medium-tier sessions wrote zero lead data to Supabase.
**Scope:** `n8n/workflows/bant-prequalify.json`, `src/Chatbot/components/chat/ChatWidget.tsx`,
`src/Chatbot/lib/greeting.ts`, `src/Chatbot/lib/lead-history.ts`,
`supabase/migrations/20260816140000_add_lead_recap_support.sql`, `.claude/docs/data/db-tables.md`
**Links:** ADR-0009

---
