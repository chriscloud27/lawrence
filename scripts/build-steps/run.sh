#!/usr/bin/env bash
# Gated driver for the lawrence build-step chain.
#
#   ./scripts/build-steps/run.sh              # run the full remaining chain
#   ./scripts/build-steps/run.sh 15           # resume from step 15
#   ./scripts/build-steps/run.sh 15 13        # run exactly these, in this order
#   COMMIT=1 ./scripts/build-steps/run.sh     # commit after each passing gate
#   DRY=1    ./scripts/build-steps/run.sh     # print the plan, run nothing
#
# Each step gets its OWN claude session. That is deliberate: CLAUDE.md says one step per turn
# and forbids reading ahead, and a fresh session enforces both structurally.
#
# The chain STOPS on the first failing gate. It never force-pushes, never pushes at all, and
# never opens a PR — those stay manual per the user's git rules.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="$ROOT/scripts/build-steps/gate.sh"
LOG="$ROOT/.claude/logs/build-steps"
COMMIT="${COMMIT:-0}"
DRY="${DRY:-0}"
FORCE="${FORCE:-0}"

# Execution order. Numeric filename order is NOT run order: 15 lands between 12 and 13
# because step 13's auth gate and step 14's agent_config both need the tenancy primitive.
DEFAULT_CHAIN=(11 12 15 13 14 16)

model_for() {
  case "$1" in
    15|14) echo "claude-opus-5" ;;   # schema/RLS correctness, and the largest cutover
    *)     echo "claude-sonnet-5" ;; # mechanical: one lib, a port, an assembly
  esac
}

# Steps whose file explicitly asks for plan mode, or whose blast radius earns a human.
interactive_step() { [ "$1" = "14" ]; }

preflight() {
  local step="$1" missing=()
  case "$step" in
    11) grep -qE '^UPSTASH_REDIS_REST_TOKEN=.+' "$ROOT/.env.local" 2>/dev/null \
          || missing+=("UPSTASH_REDIS_REST_TOKEN empty in .env.local — create a free DB at console.upstash.com") ;;
    12|14) [ -n "${ANTHROPIC_API_KEY:-}" ] \
          || grep -qE '^ANTHROPIC_API_KEY=.+' "$ROOT/.env.local" 2>/dev/null \
          || missing+=("ANTHROPIC_API_KEY unset — the eval gate will be deferred, not run") ;;
  esac
  if [ "$step" = "14" ]; then
    for wf in chat-agent bant-prequalify; do
      [ -f "$ROOT/.backup/n8n/$wf.json" ] \
        || missing+=("no backup of n8n/workflows/$wf.json — step 14 DELETES it, and it is the only record of the live prompt and thresholds")
    done
  fi
  [ ${#missing[@]} -eq 0 ] && return 0
  printf '\033[33m  preflight warnings for step %s:\033[0m\n' "$step"
  for m in "${missing[@]}"; do printf '    ! %s\n' "$m"; done
  return 1
}

run_step() {
  local step="$1" model; model="$(model_for "$step")"
  local file; file="$(ls "$ROOT/.claude/docs/build-steps/${step}-"*.md 2>/dev/null | head -1)"

  printf '\n\033[1m━━ step %s \033[0m\033[2m%s · %s\033[0m\n' "$step" "$(basename "${file:-MISSING}")" "$model"
  [ -n "$file" ] || { echo "  no step file for $step" >&2; return 1; }

  preflight "$step" || true

  if interactive_step "$step" && [ "$FORCE" != "1" ]; then
    printf '\n  \033[33mStep %s is flagged interactive.\033[0m Its own file says use plan mode: it\n' "$step"
    printf '  touches a new route handler, Inngest, a migration, an Admin form, and ADR-0006.\n\n'
    printf '  Run it yourself:  claude --model %s "build step %s"\n' "$model" "$step"
    printf '  Then resume:      ./scripts/build-steps/run.sh 16\n'
    printf '  Or override:      FORCE=1 ./scripts/build-steps/run.sh %s\n\n' "$step"
    return 2
  fi

  if [ "$DRY" = "1" ]; then echo "  (dry run)"; return 0; fi

  mkdir -p "$LOG"
  claude -p --model "$model" --permission-mode acceptEdits "build step $step" \
    2>&1 | tee "$LOG/step-$step.md"

  "$GATE" "$step" || return 1

  if [ "$COMMIT" = "1" ]; then
    git -C "$ROOT" add -A
    git -C "$ROOT" diff --cached --quiet && { echo "  nothing to commit"; return 0; }
    git -C "$ROOT" commit -q -m "build(step-$step): $(head -1 "$file" | sed 's/^# *//')" \
      -m "Gate: scripts/build-steps/gate.sh $step — pass.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
    printf '  \033[32mcommitted\033[0m %s\n' "$(git -C "$ROOT" rev-parse --short HEAD)"
  fi
}

chain=("${@:-}")
[ -z "${chain[0]:-}" ] && chain=("${DEFAULT_CHAIN[@]}")

printf '\033[1mchain:\033[0m %s   \033[2m(commit=%s dry=%s)\033[0m\n' "${chain[*]}" "$COMMIT" "$DRY"

for step in "${chain[@]}"; do
  run_step "$step"
  case $? in
    0) ;;
    2) printf '\n\033[33mpaused at step %s — see above\033[0m\n' "$step"; exit 0 ;;
    *) printf '\n\033[31mstopped: step %s did not pass its gate\033[0m\n' "$step"
       printf '  log:    %s/step-%s.md\n  resume: %s %s\n\n' "$LOG" "$step" "$0" "$step"
       exit 1 ;;
  esac
done

printf '\n\033[32mchain complete.\033[0m Run step 16'"'"'s nine-point smoke test by hand — it is the\n'
printf 'only thing that proves the prototype works end to end.\n\n'
