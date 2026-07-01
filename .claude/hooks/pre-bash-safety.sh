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

# Block commands that would print secrets or credentials to stdout
CREDENTIAL_READS=(
  "cat \.env"
  "cat supabase/\.temp"
  "echo \\\$SUPABASE"
  "echo \\\$OPENAI"
  "printenv SUPABASE"
  "printenv OPENAI"
)

for pattern in "${DANGEROUS[@]}"; do
  if echo "$CMD" | grep -qiE "$pattern"; then
    echo "[safety-hook] BLOCKED: Command matches dangerous pattern: $pattern"
    echo "[safety-hook] Command was: $CMD"
    exit 1
  fi
done

for pattern in "${CREDENTIAL_READS[@]}"; do
  if echo "$CMD" | grep -qiE "$pattern"; then
    echo "[safety-hook] BLOCKED: Command would expose credentials. Explicit user go-ahead required."
    echo "[safety-hook] Command was: $CMD"
    exit 1
  fi
done

exit 0
