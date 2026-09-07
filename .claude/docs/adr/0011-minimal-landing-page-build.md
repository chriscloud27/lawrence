# ADR-0011: Minimal landing page build from mach2.cloud copy, blog deferred

**Status:** proposed
**Date:** 2026-09-07

## Context

`src/Landing/` was added to the repo as a copy of the mach2.cloud marketing site (Next.js 15,
App Router, `[locale]` routing), intended to become lawrence's public landing page. As copied,
`npm run build` failed for two independent reasons:

1. `package.json`'s `build` script chained `sync:notion-assets`, which ran
   `scripts/sync-notion-assets.mjs` — a file that does not exist anywhere in this repo (confirmed
   via `git log` on the untracked directory; the file was never carried over from mach2.cloud).
2. `app/[locale]/page.tsx` imports five section components (`HeroSection`, `ProblemSection`,
   `ServicesSection`, `CredibilitySection`, `CtaSection`) from `components/sections/`, which was
   never copied — only `components/ui/` exists.

mach2.cloud sources its blog from Notion pages via `@notionhq/client`; that is the purpose of the
missing sync script. Reproducing that pipeline is out of scope for getting a landing page
buildable today — the immediate need is a lightweight, buildable page, not blog parity.

## Decision

1. **`package.json` renamed** from `mach2-cloud` to `lawrence` — cosmetic identifier fix, no
   behavior change. mach2.cloud domain/brand references inside page content
   (`lib/site-config.ts`, `next.config.ts`, `app/page.tsx` — site URLs, logo paths, cookie/event
   names, LinkedIn link) were left untouched; that is real content, not a project identifier, and
   rebranding it is separate scope.

2. **Notion sync decoupled from `build`.** `sync:notion-assets` stays as a standalone npm script
   (`node scripts/sync-notion-assets.mjs`), but is no longer chained into `build`. A stub
   `scripts/sync-notion-assets.mjs` was added (logs "not implemented yet" and exits) so the script
   name resolves and can be run manually once real Notion sync logic lands, without blocking or
   silently no-op'ing the production build.

3. **Blog switched off for now.** No Notion-sourced blog exists in this build. The landing page
   ships as a super-lightweight static-content site; blog wiring (`@notionhq/client` fetch logic,
   content routes, asset sync) is deferred until `sync:notion-assets` is implemented for real.

4. **Missing `components/sections/*` is out of scope for this ADR** — it is missing source, not a
   config decision, and is tracked separately (the five section components must be supplied
   before `npm run build` succeeds end-to-end).

## Consequences

**Easier:**
- `npm run build` no longer depends on a file that doesn't exist in this repo; the build failure
  surface is now limited to genuinely missing source (the section components), not tooling
  mismatch from the mach2.cloud copy.
- Notion blog sync can be turned on later by (a) implementing the real logic in
  `scripts/sync-notion-assets.mjs` and (b) re-adding `npm run sync:notion-assets &&` to `build` —
  a two-step, reversible switch-on with no other code to touch.
- `@notionhq/client` dependency stays in `package.json` unused-but-ready, avoiding a
  remove-then-reinstall cycle when the blog is built.

**Harder:**
- The landing page currently ships with zero blog content and no indication in the UI that this
  is temporary — a future contributor needs this ADR (or the stub script's inline comment) to
  know the sync step is intentionally disabled, not broken.
- mach2.cloud-branded URLs/content still throughout the copy (`site-config.ts`, `next.config.ts`,
  `page.tsx`) — this ADR explicitly does not resolve that, so the site is not yet safe to deploy
  as lawrence's public page without a separate rebranding pass.

**Trade-off accepted:** Ship a buildable, blog-free landing page now rather than block on
reproducing mach2.cloud's Notion pipeline; accept that blog and full rebrand are separate,
un-scheduled follow-ups.

**Explicitly deferred (not in this ADR):**
- Real Notion sync implementation in `scripts/sync-notion-assets.mjs` and re-wiring it into
  `build`.
- Rebranding mach2.cloud domain/brand references to lawrence equivalents.
- Supplying the missing `components/sections/*` files needed for `npm run build` to actually pass.

## References

- `.claude/rules/n8n-workflows.md`, `.claude/rules/secrets.md`: credential-reference pattern to
  follow once Notion sync needs a real `NOTION_TOKEN` / `NOTION_DATABASE_ID`.
- `src/Landing/scripts/sync-notion-assets.mjs`: current stub, with inline TODO marking the
  switch-on point.
