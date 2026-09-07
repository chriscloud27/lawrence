# ADR-0010: Configurable intake method (chatbot and form as peer front-ends)

**Status:** proposed
**Date:** 2026-09-07

## Context

The v2 pivot (`v2/lawrence-problem-solution-v2.md`) introduces a structured intake form with
multi-modal document upload (voice notes, PDFs, screenshots) as an alternative way to capture a
parent's initial enquiry, on the bet that some agencies will prefer a familiar form over a chat
widget. This is not a replacement for the chatbot (`src/Chatbot/`) — both are ways of gathering
the same class of data, and the bet is that different agencies will prefer different ones.

Everything downstream of intake is unchanged by which front-end was used: AI profile
construction, BANT scoring (`.claude/rules/bant-scoring.md`), parent review, and agency-portal
display all operate on a `leads` row regardless of whether it originated from a chat session or
a form submission with uploaded documents.

Two further requirements shape this:

1. **Per-agency configurability.** An agency should be able to choose which intake surface(s)
   are active on their public website — chatbot only, form only, or both — as a setting, not a
   code branch per agency.
2. **Universal portal visibility.** The agency portal must show every intake session, whether or
   not the parent ever authenticated. ADR-0008 already established the `leads.user_id` /
   `session_id` bridge for optional Google sign-in; this ADR extends that bridge to (a) more auth
   providers (Apple, email) and (b) a dedicated parent-facing portal that reads via that same
   linkage, plus an explicit surfaced flag for agency-side visibility of unlinked sessions.

## Decision

1. **Intake method is an agency setting, not a fixed product surface.** Add
   `intake_method TEXT CHECK (intake_method IN ('chatbot', 'form', 'both'))` to the agency
   config table. The public embed reads this setting and renders the chatbot widget, the intake
   form, or both accordingly.

2. **Chatbot and form are peer producers of the same `leads` row shape.** Both write (via n8n,
   per the existing read-only-from-chatbot rule in `.claude/rules/chatbot.md`) into `leads`,
   tagged with a `source TEXT CHECK (source IN ('chatbot', 'form'))` column. Form submissions
   additionally populate a new `intake_documents` table (one row per uploaded file: storage
   path, mime type, extraction status) that feeds the same profile-construction step the chatbot's
   `messages` already feed.

3. **Auth surface extends ADR-0008's pattern to more providers.** Supabase Auth gains Apple and
   email/magic-link providers alongside the existing Google provider. The linking mechanism is
   unchanged: `leads.user_id` stays nullable, set via the existing `link-lead.json` n8n workflow
   pattern, now triggered from either the chatbot's post-signin hook or the form's post-signin
   hook.

4. **Parent portal is a new, separate surface from the agency portal.** A signed-in parent
   (`user_id` set) can view and edit their own extracted profile — this is v2 Step 4 ("parent
   review") from the pivot doc. It is *not* the admin dashboard (`src/Admin/`); it is a
   parent-facing route, RLS-scoped to `auth.uid() = user_id`, reusing the SELECT policy pattern
   ADR-0009 added to `messages`.

5. **Agency portal shows every lead, flagged by link status.** No filtering by `user_id IS NOT
   NULL` — the dashboard lists all leads for the agency and renders a `linked` / `not tracked`
   badge (`lead.user_id ? 'linked' : 'not tracked'`) so counsellors see unauthenticated leads too,
   consistent with the existing principle that no enquiry should be invisible to the agency just
   because the parent didn't sign in.

## Consequences

**Easier:**
- Agencies can pilot the form-based intake without an agency-specific code fork — it's a config
  flip, same as any other white-label setting.
- The BANT scoring engine, profile construction, and portal code all stay intake-method-agnostic;
  new intake surfaces in the future (e.g. WhatsApp) plug into the same `leads`/documents shape.
- Extending auth providers reuses ADR-0008's linking mechanism rather than inventing a new one.

**Harder:**
- `leads` now needs a `source` column and a documents child table, both of which the two intake
  n8n workflows (`bant-prequalify.json` for chatbot, a new `intake-form.json` for the form) must
  write consistently — a schema drift risk between two workflows, same category of risk ADR-0009
  already flagged for the low/medium/hot branches.
- The parent portal is new surface area (new routes, new RLS policies, new auth providers to
  configure in the Supabase dashboard) — not a small addition.
- Document extraction (transcription, PDF parsing) is a new, currently unscoped n8n/agent
  pipeline stage with its own cost and failure modes, distinct from the chatbot's live LLM calls.

**Trade-off accepted:** More schema and workflow surface area (two intake sources instead of one)
in exchange for not locking any agency into a single intake UX, which the v2 pivot bets is a
real adoption blocker for some agencies.

**Explicitly deferred (not in this ADR):**
- The exact document-extraction pipeline design (which model, batch vs. real-time, storage
  bucket layout) — needs its own ADR once `intake_documents` schema is drafted.
- Cross-session profile merging when a parent used both chatbot and form at different times —
  same class of problem ADR-0009 deferred for multi-session chatbot users.

## References

- ADR-0008: Lead identity linking (the `user_id`/`session_id` bridge this ADR extends to a second
  intake source and more auth providers)
- ADR-0009: Cross-device lead recap (the per-tier write pattern and RLS SELECT precedent this
  ADR's form-intake writes follow)
- `v2/lawrence-problem-solution-v2.md`: the pivot document motivating this decision
- `.claude/rules/chatbot.md`, `.claude/rules/bant-scoring.md`: rules extended by this decision
