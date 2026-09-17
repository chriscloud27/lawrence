#!/usr/bin/env bash
# Create the two local counsellor auth users, then re-apply the demo seed so
# their agency_members rows land.
#
# auth.users cannot be seeded from SQL without fabricating UUIDs and password
# hashes, and `supabase db reset` wipes it — so this runs after a reset.
#
# Local Supabase only. The password is a throwaway for a container on your
# laptop; pass your own with SEED_COUNSELLOR_PASSWORD if you prefer.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="${SUPABASE_LOCAL_API:-http://127.0.0.1:54321}"
PASSWORD="${SEED_COUNSELLOR_PASSWORD:-local-dev-only-password}"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_lawrence}"

# The local anon key is a fixed, published development value — identical in
# every `supabase start`, and not a secret. Read it from the CLI rather than
# pasting it here.
ANON_KEY="$(cd "$ROOT" && supabase status -o json \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["ANON_KEY"])')"

for email in counsellor@demo-agency.test counsellor@rival-agency.test; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/v1/signup" \
    -H "apikey: $ANON_KEY" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\"}")
  case "$code" in
    200|422) echo "user $email ready (http $code)" ;;
    *)       echo "signup failed for $email (http $code)" >&2; exit 1 ;;
  esac
done

# psql is not a project dependency; the local stack ships one in its DB container.
if command -v psql >/dev/null 2>&1; then
  psql "${SUPABASE_LOCAL_DB:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" \
    -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/seed_demo_agency.sql"
else
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
    < "$ROOT/supabase/seed_demo_agency.sql"
fi

echo "memberships linked."
