#!/usr/bin/env bash
set -euo pipefail

echo "=== Pre-deploy checks ==="

# 1. Check .env.example has all keys present in .env.local
if [ -f .env.local ]; then
  missing=()
  while IFS= read -r line; do
    key=$(echo "$line" | cut -d= -f1)
    [[ -z "$key" || "$key" == \#* ]] && continue
    grep -q "^${key}=" .env.example 2>/dev/null || missing+=("$key")
  done < .env.local
  if [ ${#missing[@]} -gt 0 ]; then
    echo "WARNING: Keys in .env.local missing from .env.example: ${missing[*]}"
    echo "Update .env.example before deploying."
    exit 1
  fi
fi

# 2. Scan for accidental secrets in tracked files
if git grep -rn "sk-[a-zA-Z0-9]\{20,\}" -- '*.ts' '*.js' '*.py' '*.json' 2>/dev/null | grep -v ".example"; then
  echo "ERROR: Possible API key found in source files. Aborting."
  exit 1
fi

# 3. Docker build dry run (no push)
echo "Testing Docker build..."
docker-compose -f docker/docker-compose.prod.yml build --quiet

echo "=== Pre-deploy checks passed ==="
