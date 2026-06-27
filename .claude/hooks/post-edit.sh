#!/usr/bin/env bash
# Runs after Claude edits/writes a file. Lints the changed file if applicable.

FILE="$1"
[ -z "$FILE" ] && exit 0

EXT="${FILE##*.}"

case "$EXT" in
  ts|tsx)
    # TypeScript: type-check and lint
    if command -v npx &>/dev/null; then
      npx eslint "$FILE" --fix --quiet 2>/dev/null || true
    fi
    ;;
  sql)
    # SQL migrations: remind to test locally
    echo "[hook] SQL file edited: $FILE — remember to run /db-migrate to test locally."
    ;;
  json)
    # Validate JSON is well-formed
    if ! jq empty "$FILE" 2>/dev/null; then
      echo "[hook] WARNING: $FILE is not valid JSON."
    fi
    ;;
  sh)
    # Ensure shell scripts are executable
    chmod +x "$FILE"
    ;;
esac
