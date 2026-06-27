#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${STAGING_BASE_URL:-http://localhost:3000}"
N8N_URL="${STAGING_N8N_URL:-http://localhost:5678}"

echo "=== Health checks ==="

check() {
  local name=$1
  local url=$2
  local expected=${3:-200}
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
  if [ "$status" = "$expected" ]; then
    echo "  ✓ $name ($status)"
  else
    echo "  ✗ $name — expected $expected, got $status"
    exit 1
  fi
}

check "Backend API" "$BASE_URL/health"
check "n8n UI"      "$N8N_URL/healthz"

echo "=== All health checks passed ==="
