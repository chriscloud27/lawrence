---
description: Rules for working with n8n workflow JSON files in n8n/workflows/
globs: ["n8n/workflows/**/*.json"]
---

# n8n Workflow Rules

## Workflow JSON Format
- All workflows must be exported from n8n UI in JSON format and committed here
- Each workflow file = one logical pipeline (e.g., `scrape-news-api.json`)
- Never hardcode credentials in workflow JSON — use n8n credential references by name

## Naming Convention
- File names: `{action}-{source}.json` → `scrape-news-api.json`, `ingest-product-feed.json`
- Workflow name inside JSON must match filename (without `.json`)

## When Editing Workflow JSON
- Do not manually edit `id` or `versionId` fields — these are managed by n8n
- Trigger nodes (Cron, Webhook) should always be the first node in the JSON
- HTTP Request nodes must use environment variable expressions: `{{ $env.API_BASE_URL }}`

## Credentials
- Document required credentials in `n8n/credentials.example.json` (with placeholder values only)
- Never commit real credential values

## Self-Hosted Community Edition Constraints

**What is NOT available on Community license:**
- Environment Variables (UI panel) — no `$env` references
- External Secrets (Vault, AWS, etc.)
- LDAP/SSO
- Worker mode (horizontal scaling)
- Audit logs
- Variables (UI panel)

**Solution: SET Node Pattern**

All secrets, API keys, and configuration live in a **single `init-secrets` SET node** placed **first after the trigger**.

### Fields in SET Node

```
Key                     Value                               Example
─────────────────────── ────────────────────────────────── ──────────────────
OPENAI_MODEL            gpt-4o                             gpt-4o
GMAIL_ADDRESS           admissions@lawrence-project.com     admissions@...
SUPABASE_URL            https://xxx.supabase.co             https://xxx.supabase.co
BOOKING_LINK            https://calendly.com/...           https://calendly.com/...
BANT_HOT_THRESHOLD      75                                 75
BANT_MEDIUM_THRESHOLD   50                                 50
```

### Stored Credentials in n8n (Community Edition)
- Gmail test account ("chrisallin24@gmail.com") connected
- Supabase cloud account ("supabase-lawrence") connected
- Google sheet account ("mach2-google-sheets") connected
- OpenAI developer platform ("OpenAi account") connected


### Referencing in Downstream Nodes

Every downstream node references the SET node values:

```
{{ $('init-secrets').item.json.OPENAI_API_KEY }}
{{ $('init-secrets').item.json.GMAIL_APP_PASSWORD }}
{{ $('init-secrets').item.json.BANT_HOT_THRESHOLD }}
```

**Never** use `$env.VAR_NAME` on Community Edition — it will fail at runtime.

### Security & Rotation

| Risk | Mitigation |
|------|------------|
| Keys visible in workflow JSON exports | Never commit workflow JSON to public repos; keep workflow exports private |
| Keys visible to dashboard users | Restrict n8n UI access (strong password, IP allowlist, VPN if possible) |
| No automatic rotation | Manual: edit SET node, save workflow, next execution uses new value |
| Keys in execution history | Acceptable for self-hosted single-server; encrypt disk if needed |

**Rotation procedure:** Open n8n UI → open workflow → click `init-secrets` → update value → save → done (no restart needed).

### Backup

```bash
# Workflow JSON export (includes SET node values — keep private)
n8n export:workflow --all --output=/var/backups/n8n/workflows.json

# Database (SQLite)
cp ~/.n8n/database.sqlite /var/backups/n8n/db-$(date +%Y%m%d).sqlite

# Database (PostgreSQL)
pg_dump -U n8n_user n8n_db > /var/backups/n8n/db-$(date +%Y%m%d).sql

# Cron (daily 2am)
0 2 * * * /usr/local/bin/n8n-backup.sh
```

Keep workflow JSON exports **private** — they contain SET node values in plaintext.

### Scaling Constraint

n8n Community Edition supports **single instance only** (no worker mode). For v1 pilot, this is acceptable (expected <100 conversations/day). For v2+, upgrade to Enterprise or multi-instance architecture.
