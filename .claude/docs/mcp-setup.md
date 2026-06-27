# MCP Setup

Servers defined in `.claude/.mcp.json`.

## supabase
Query tables, inspect schema, run migrations directly in conversation.

1. `npm install -g @supabase/mcp-server-supabase`
2. Login: `supabase login`
3. Set in `.env.local`: `SUPABASE_ACCESS_TOKEN=sbp_...`

## filesystem
Scoped to project root. No setup — uses npx on first run.

## docker
Inspect containers and logs. Requires Docker Desktop running. No setup.

## Adding a server
Edit `.claude/.mcp.json`, restart Claude Code.
