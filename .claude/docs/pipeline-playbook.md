# Pipeline Development Playbook

Reference for Claude when building or modifying ingestion pipelines.

## Adding a New Data Source (End-to-End)

### 1. Define the schema
```
database/migrations/<timestamp>_create_<source>_table.sql
src/services/schemas/<source>.ts   ← Zod or TypeScript type
```

### 2. Build the n8n workflow
- Export template from `n8n/workflows/_template.json`
- Rename to `n8n/workflows/<action>-<source>.json`
- Required nodes: Trigger → Fetch → Validate → (AI Enrich?) → Store → Notify

### 3. Add AI enrichment (optional)
- Create `src/agents/<purpose>.ts`
- Expose as HTTP endpoint in `src/api/agents/<purpose>.ts`
- Call from n8n via HTTP Request node → `http://backend:3000/api/agents/<purpose>`

### 4. Test locally
```bash
/run-pipeline <pipeline-name>
# Then verify:
# - rows in DB table
# - pipeline_runs record with status=success
# - no errors in docker-compose logs
```

### 5. Deploy
```bash
/deploy-staging
# Validate on staging before production
```

## Pipeline Anatomy (n8n Workflow Nodes)

```
[Cron/Webhook Trigger]
        ↓
[HTTP Request: Fetch data from source]
        ↓
[Validate Payload] ← compares against schema, stops on error
        ↓
[Transform / Normalize] ← field mapping, type coercion
        ↓
[AI Enrich?] ← optional: HTTP call to backend agent
        ↓
[Supabase: Upsert rows]
        ↓
[Update pipeline_runs: status, row_count, duration]
        ↓
[Error branch] → [Slack/email alert + log to pipeline_runs]
```

## Debugging a Failed Pipeline

Use the `/pipeline-debugger` agent:
> "@pipeline-debugger — scrape-news-api failed at 02:00 UTC, investigate"

Or manually:
1. `docker-compose logs n8n --tail=200 | grep ERROR`
2. Query `SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 5;`
3. Check the n8n execution history UI at `http://localhost:5678`

## Upgrading from n8n to a Backend Service

When a pipeline outgrows n8n (complex branching, stateful retries, ML models):
1. Port the n8n nodes to `src/services/<pipeline>.ts`
2. Add a scheduler (node-cron or dedicated job queue like BullMQ)
3. Keep n8n as a trigger webhook if needed, but move all logic server-side
4. Update `docs/ARCHITECTURE.md` to reflect the change
