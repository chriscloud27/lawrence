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
