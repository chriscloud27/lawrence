# Deployment Environments

**TL;DR:** Three environments exist in concept; only two are live. Local Docker is a disposable rehearsal stage — nothing important is trapped there. Everything reproducible is in committed files. Getting schema and seed data onto the cloud DB means replaying those files, not migrating anything out of Docker.

---

## Environment Overview

| Environment | Where | Role | Status |
|---|---|---|---|
| Local (Docker) | Mac / localhost | Throwaway dev sandbox | Built; currently stopped |
| Cloud (prototype) | Supabase cloud | Real prototype DB | Live; empty of pipeline data |
| Staging / Production | Separate cloud projects | Pre-release / live | Not yet provisioned |

---

## What Lives Where

### Committed — fully reproducible
- `supabase/migrations/` — 3 migrations: schools schema, leads/messages tables, the chatbot view
- `supabase/seed_scrape_queue.sql` — 64 scrape-queue URLs (UK + Thailand)

### Local-only — not important
- One hand-inserted St Edward's test row; intentionally throwaway.

Nothing schema- or data-relevant is trapped in the local Docker volume.

---

## Why Keep a Local Stack at All

Local is the **rehearsal stage**; cloud is the **stage**. The value proposition even during prototyping:

- **Fast and free** — schema iteration with no network round-trips or cloud quota.
- **Disposable** — `supabase db reset` wipes and replays all migrations from scratch in seconds; safe to test destructive changes.
- **Migration authoring** — `supabase db diff` uses a shadow DB to generate and verify migrations against the table spec before commit.
- **Safety** — no risk of corrupting prototype data or hitting unexpected RLS behaviour while experimenting.

The local step feels like an extra hop only when treated as a separate destination. The right model: author and verify locally, then push the same migration files to cloud.

---

## Getting to the Cloud DB

The path is: link the CLI to the cloud project, push committed migrations, run the seed. This is covered in:

- **[`supabase-cli-reference.md`](../supabase-cli-reference.md)** — `supabase link`, `db push`, diff workflow, common errors
- **[`pipeline-playbook.md`](../pipeline-playbook.md)** — end-to-end flow including seeding

---

## Cloud-Specific Gotchas

**RLS is enforced.** Locally the CLI connects as superuser and bypasses RLS. On cloud, the public-read policies on `schools` and `school_fees` (baked into the view migration) are what allow the chatbot to read. Verify those policies are present before testing the chatbot against cloud.

**Secrets policy applies.** `.env.local` (which holds the cloud project ref and DB password) is never read into AI context. Run `supabase link` and `db push` yourself via `! supabase ...` in the prompt. See `.claude/rules/secrets.md`.
