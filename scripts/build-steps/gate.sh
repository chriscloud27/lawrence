#!/usr/bin/env bash
# Machine-checkable gate for one build step. Exit 0 = pass, non-zero = stop the chain.
#
#   ./scripts/build-steps/gate.sh 11
#
# Only asserts what a script can prove. Items that need a browser, a human eye, or a live
# account are NOT asserted here — they are listed as DEFERRED and re-checked by hand in
# step 16's smoke test. A gate that lies is worse than no gate.
set -uo pipefail

STEP="${1:?usage: gate.sh <step-number>}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHATBOT="$ROOT/src/Chatbot"
APP_URL="${APP_URL:-http://localhost:3000}"
PSQL_URL="${PSQL_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

FAILED=0
DEFERRED=()

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; FAILED=1; }
defer() { printf '  \033[33m·\033[0m %s \033[2m(deferred to step 16)\033[0m\n' "$1"; DEFERRED+=("$1"); }
check() { if eval "$2" >/dev/null 2>&1; then pass "$1"; else fail "$1"; fi; }
# check_absent NAME CMD — passes when CMD finds nothing (grep-style negative assertion)
check_absent() { if eval "$2" >/dev/null 2>&1; then fail "$1"; else pass "$1"; fi; }

app_up() { curl -sf -o /dev/null --max-time 2 "$APP_URL" 2>/dev/null; }

# psql is not a project dependency; the local stack ships one inside its DB container, so fall
# back to that rather than deferring every schema assertion on a machine without libpq.
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_lawrence}"
if command -v psql >/dev/null 2>&1; then
  psql_() { psql "$PSQL_URL" "$@"; }
else
  psql_() { docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres "$@"; }
fi
db_up()  { psql_ -c 'select 1' >/dev/null 2>&1; }
sql()    { psql_ -tAc "$1" 2>/dev/null; }
# sql_as UUID SQL — run SQL as the `authenticated` role with that user's JWT sub, so RLS applies.
sql_as() {
  # Output is BEGIN / set_config / SET / <result> / ROLLBACK — the result is the last line
  # before ROLLBACK.
  psql_ -tAc "begin; select set_config('request.jwt.claims', json_build_object('sub','$1','role','authenticated')::text, true); set local role authenticated; $2; rollback;" \
    2>/dev/null | tail -2 | head -1
}
uid_of() { sql "select id from auth.users where email='$1'"; }

build_chatbot() { (cd "$CHATBOT" && npm run build); }
types_chatbot() { (cd "$CHATBOT" && npx --no-install tsc --noEmit); }

printf '\n\033[1mgate %s\033[0m\n' "$STEP"

case "$STEP" in

10)
  check "docs-only diff — nothing under src/" \
        "[ -z \"\$(git -C '$ROOT' diff --name-only HEAD -- src/)\" ]"
  check "no live doc claims better-sqlite3" \
        "! grep -rl 'better-sqlite3' '$ROOT/CLAUDE.md' '$ROOT/.claude/rules' 2>/dev/null | grep -q ."
  check "both rules files carry the ADR-0015 note" \
        "grep -q 'ADR-0015' '$ROOT/.claude/rules/chatbot.md' && grep -q 'ADR-0015' '$ROOT/.claude/rules/ai-agents.md'"
  ;;

11)
  check "@upstash/ratelimit installed" \
        "grep -q '\"@upstash/ratelimit\"' '$CHATBOT/package.json'"
  check "lib/rate-limit.ts exists" "[ -f '$CHATBOT/lib/rate-limit.ts' ]"
  check "both Upstash vars exported from lib/env.ts" \
        "grep -q 'UPSTASH_REDIS_REST_URL' '$CHATBOT/lib/env.ts' && grep -q 'UPSTASH_REDIS_REST_TOKEN' '$CHATBOT/lib/env.ts'"
  check "limiter applied to all three public routes" \
        "grep -ql 'rate-limit' '$CHATBOT/app/api/prequalify/route.ts' '$CHATBOT/app/api/schools/search/route.ts' '$CHATBOT/app/api/lead/link/route.ts'"
  check_absent "process.env read only in lib/env.ts" \
        "grep -rn 'process\.env' '$CHATBOT' --include=*.ts --include=*.tsx --exclude-dir=node_modules --exclude-dir=.next | grep -v 'lib/env.ts' | grep -q ."
  check_absent ".env.example carries no real-looking token" \
        "grep -nE '^[A-Z_]+=[A-Za-z0-9_-]{20,}\$' '$ROOT/.env.example' | grep -q ."
  check "next build passes" "build_chatbot"
  if app_up; then
    n=0; for _ in $(seq 1 21); do
      code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$APP_URL/api/prequalify" \
             -H 'content-type: application/json' -d '{"sessionId":"gate-probe","message":"hi"}')
      n=$code
    done
    [ "$n" = "429" ] && pass "21st request from one IP → 429" || fail "21st request returned $n, expected 429"
  else
    defer "21 rapid requests → 429 (dev server not running)"
  fi
  defer "Anthropic monthly budget alert configured (console action)"
  ;;

12)
  check "lib/ai/provider.ts exists" "[ -f '$CHATBOT/lib/ai/provider.ts' ]"
  check "ai SDK pinned exact (no caret)" \
        "grep -qE '\"ai\": *\"[0-9]' '$CHATBOT/package.json'"
  check_absent "no model id hardcoded outside the seam" \
        "grep -rnE 'claude-(haiku|sonnet|opus)|gpt-4o' '$CHATBOT/app' '$CHATBOT/lib' --include=*.ts --include=*.tsx 2>/dev/null | grep -v 'lib/ai/provider.ts' | grep -q ."
  check "promptfoo config at repo root" \
        "ls '$ROOT'/promptfooconfig.* >/dev/null 2>&1"
  check "next build passes" "build_chatbot"
  # A key exported in the shell shadows the one in .env — promptfoo reads dotenv,
  # which does not override an existing process env var. A too-short value is
  # almost always a leftover placeholder, and it fails as an auth error that
  # looks like a broken eval.
  if [ -n "${ANTHROPIC_API_KEY:-}" ] && [ ${#ANTHROPIC_API_KEY} -lt 40 ]; then
    printf '  \033[33m!\033[0m ANTHROPIC_API_KEY in this shell is %s chars — too short for a real key,\n' "${#ANTHROPIC_API_KEY}"
    printf '    and it shadows .env. Run: unset ANTHROPIC_API_KEY\n'
  fi
  if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    check "promptfoo eval passes" "(cd '$ROOT' && npx --yes promptfoo eval)"
  elif grep -qE '^ANTHROPIC_API_KEY=.+' "$ROOT/.env.local" 2>/dev/null; then
    check "promptfoo eval passes (key from .env)" "(cd '$ROOT' && npx --yes promptfoo eval)"
  else
    defer "npx promptfoo eval (no ANTHROPIC_API_KEY in the shell or .env.local)"
  fi
  ;;

15)
  check "tenancy migration exists" \
        "ls '$ROOT'/supabase/migrations/*add_agency_tenancy.sql >/dev/null 2>&1"
  check "backfill migration exists" \
        "ls '$ROOT'/supabase/migrations/*backfill_leads_agency_id.sql >/dev/null 2>&1"
  check "every new migration has a Down block" \
        "! grep -L -- '-- Down migration:' '$ROOT'/supabase/migrations/*agency*.sql | grep -q ."
  check "seed file exists" "[ -f '$ROOT/supabase/seed_demo_agency.sql' ]"
  check_absent "seed contains no hardcoded uuid" \
        "grep -nE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' '$ROOT/supabase/seed_demo_agency.sql' | grep -q ."
  check "db-tables.md documents agencies" \
        "grep -q 'agency_members' '$ROOT/.claude/docs/data/db-tables.md'"
  check "tenancy ADR written" \
        "grep -rlq 'agency_members' '$ROOT/.claude/docs/adr/'"
  if db_up; then
    check "supabase db reset replays clean" "(cd '$ROOT' && supabase db reset)"
    # The reset wipes auth.users, so the counsellors the isolation check needs are
    # recreated here rather than assumed to have survived it.
    check "counsellor users + memberships seeded" "'$ROOT/scripts/seed-local-counsellors.sh'"
    check "leads.agency_id is NOT NULL" \
          "[ \"\$(sql \"select is_nullable from information_schema.columns where table_name='leads' and column_name='agency_id'\")\" = NO ]"
    check "no orphan leads" "[ \"\$(sql 'select count(*) from leads where agency_id is null')\" = 0 ]"
    check "rls enabled on agencies + agency_members" \
          "[ \"\$(sql \"select count(*) from pg_class where relname in ('agencies','agency_members') and relrowsecurity\")\" = 2 ]"
    check "two agencies seeded (isolation test needs both)" \
          "[ \"\$(sql 'select count(*) from agencies')\" -ge 2 ]"
    check "idx_agency_members_user exists" \
          "[ \"\$(sql \"select count(*) from pg_indexes where indexname='idx_agency_members_user'\")\" = 1 ]"
    check "current_agency_ids() is SECURITY DEFINER" \
          "[ \"\$(sql \"select prosecdef from pg_proc where proname='current_agency_ids'\")\" = t ]"

    # The test that matters: a counsellor must not see another agency's leads. Anything less
    # asserts that RLS is configured, not that it works.
    DEMO_UID="$(uid_of counsellor@demo-agency.test)"
    RIVAL_UID="$(uid_of counsellor@rival-agency.test)"
    if [ -n "$DEMO_UID" ] && [ -n "$RIVAL_UID" ]; then
      check "demo counsellor sees only demo-agency leads" \
            "[ \"\$(sql_as '$DEMO_UID' \"select count(*) from leads where id like 'seed-rival-%'\")\" = 0 ]"
      check "rival counsellor sees no demo-agency leads" \
            "[ \"\$(sql_as '$RIVAL_UID' \"select count(*) from leads where id like 'seed-demo-%'\")\" = 0 ]"
      check "demo counsellor sees all six seeded leads" \
            "[ \"\$(sql_as '$DEMO_UID' 'select count(*) from leads')\" = 6 ]"
    else
      defer "cross-agency isolation (run scripts/seed-local-counsellors.sh after the reset)"
    fi
  else
    defer "supabase db reset + schema assertions (local Postgres not reachable)"
  fi
  ;;

13)
  check "src/Admin removed" "[ ! -d '$ROOT/src/Admin' ]"
  check "admin route group exists" "[ -d '$CHATBOT/app/(admin)' ]"
  check "lib/leads.ts exists" "[ -f '$CHATBOT/lib/leads.ts' ]"
  check "cookie-bound server client exported" \
        "grep -q 'createServerClient' '$CHATBOT/lib/supabase-server.ts'"
  check_absent "no raw hex or rgb() in admin routes" \
        "grep -rnE '#[0-9a-fA-F]{6}|rgba?\(' '$CHATBOT/app' --include=*.tsx --include=*.css 2>/dev/null | grep -qv 'brand'"
  check_absent "no Tailwind default palette classes in admin" \
        "grep -rnE '\b(blue|gray|slate|zinc|emerald|indigo)-[0-9]{2,3}\b' '$CHATBOT/app/(admin)' 2>/dev/null | grep -q ."
  check_absent "no ThemeContext import survives" \
        "grep -rn 'ThemeContext' '$CHATBOT' --include=*.tsx --exclude-dir=node_modules --exclude-dir=.next | grep -q ."
  check_absent "mock-data.ts gone" "[ -f '$ROOT/src/Admin/src/data/mock-data.ts' ]"
  check "next build passes" "build_chatbot"
  defer "all seven /admin routes render; /admin redirects when signed out"
  ;;

14)
  check "streaming chat route exists" "[ -f '$CHATBOT/app/api/chat/route.ts' ]"
  check "bant engine in TypeScript" "[ -d '$CHATBOT/lib/bant' ]"
  check "agent_config migration exists" \
        "ls '$ROOT'/supabase/migrations/*agent_config*.sql >/dev/null 2>&1"
  check_absent "chat workflows deleted" \
        "ls '$ROOT'/n8n/workflows/chat-agent.json '$ROOT'/n8n/workflows/bant-prequalify.json 2>/dev/null | grep -q ."
  check "ingestion workflow retained" "[ -f '$ROOT/n8n/workflows/scrape-doris-school.json' ]"
  check_absent "N8N_BANT_WEBHOOK_URL fully removed" \
        "grep -rn 'N8N_BANT_WEBHOOK_URL' '$ROOT/src' '$ROOT/.env.example' 2>/dev/null | grep -q ."
  check "ADR-0006 marked superseded" \
        "grep -qi 'superseded by' '$ROOT/.claude/docs/adr/0006-chatbot-n8n-orchestration.md'"
  check_absent "no threshold hardcoded in TypeScript" \
        "grep -rnE '\b(75|50)\b' '$CHATBOT/lib/bant' --include=*.ts 2>/dev/null | grep -iE 'threshold|hot|medium' | grep -q ."
  check_absent "no provider package imported outside the seam" \
        "grep -rn '@ai-sdk/anthropic' '$CHATBOT/app' '$CHATBOT/lib' --include=*.ts 2>/dev/null | grep -v 'lib/ai/provider.ts' | grep -q ."
  check "chatbot rules no longer claim n8n owns all writes" \
        "! grep -q 'All Supabase calls are read-only from the chatbot; writes go through n8n pipelines only' '$ROOT/.claude/rules/chatbot.md'"
  check "next build passes" "build_chatbot"
  if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    check "promptfoo eval passes after the port" "(cd '$ROOT' && npx --yes promptfoo eval)"
  else
    defer "npx promptfoo eval after the port — THE port-bug guard, do not skip"
  fi
  defer "tokens stream; delta block never parent-visible; Resend hot-lead send"
  ;;

16)
  check "LOCAL-DEV.md exists" "[ -f '$ROOT/docs/LOCAL-DEV.md' ]"
  check "dev:reset script wired" "grep -q 'dev:reset' '$CHATBOT/package.json'"
  check "only two apps remain" \
        "[ -d '$ROOT/src/Chatbot' ] && [ -d '$ROOT/src/Landing' ] && [ ! -d '$ROOT/src/Admin' ]"
  check "chatbot builds" "build_chatbot"
  check "landing builds" "(cd '$ROOT/src/Landing' && npm run build)"
  check_absent "no env file staged" \
        "git -C '$ROOT' status --porcelain | grep -qE '\.env\.local|supabase/\.temp'"
  defer "the nine-point smoke test — run it by hand, record pass/fail per item"
  ;;

*)
  echo "no gate defined for step $STEP" >&2
  exit 2
  ;;
esac

if [ ${#DEFERRED[@]} -gt 0 ]; then
  printf '\n  \033[33m%d item(s) deferred — not proven by this gate:\033[0m\n' "${#DEFERRED[@]}"
  for d in "${DEFERRED[@]}"; do printf '    · %s\n' "$d"; done
fi

if [ "$FAILED" -eq 0 ]; then
  printf '\n\033[32mgate %s PASS\033[0m\n\n' "$STEP"
else
  printf '\n\033[31mgate %s FAIL\033[0m\n\n' "$STEP"
fi
exit "$FAILED"
