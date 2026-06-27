#!/usr/bin/env bash
# Runs before any Bash tool call. Blocks destructive commands.

CMD="$1"

# Block patterns that could cause irreversible damage
DANGEROUS=(
  "DROP TABLE"
  "DROP DATABASE"
  "supabase db reset --db-url.*prod"
  "docker volume rm n8n_data"
  "git push.*--force.*main"
  "rm -rf /"
)

for pattern in "${DANGEROUS[@]}"; do
  if echo "$CMD" | grep -qiE "$pattern"; then
    echo "[safety-hook] BLOCKED: Command matches dangerous pattern: $pattern"
    echo "[safety-hook] Command was: $CMD"
    exit 1
  fi
done

exit 0
