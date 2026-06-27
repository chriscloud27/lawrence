---
name: run-pipeline
description: Trigger a specific data ingestion pipeline by name. Validates the pipeline exists in n8n, triggers it via webhook or CLI, then tails logs to confirm completion.
---

# Run Pipeline

## Usage
```
/run-pipeline <pipeline-name>
```
Example: `/run-pipeline scrape-news-api`

## Steps

1. **Find the pipeline**
   Look in `n8n/workflows/` for a file matching `<pipeline-name>.json`. If not found, list available workflows and ask user to clarify.

2. **Trigger via n8n API**
   ```bash
   curl -X POST \
     -H "X-N8N-API-KEY: $N8N_API_KEY" \
     "${N8N_URL}/api/v1/workflows/<workflow-id>/execute"
   ```
   Get the workflow ID from the JSON file: `jq '.id' n8n/workflows/<pipeline-name>.json`

3. **Tail n8n execution logs**
   ```bash
   docker-compose logs -f n8n --tail=50
   ```
   Watch for `Workflow execution finished` or error messages.

4. **Verify output in database**
   Query Supabase to confirm new rows were inserted in the expected table (check `pipeline_runs` table or the pipeline's target table).

5. Report: execution status, rows inserted, any errors encountered.
