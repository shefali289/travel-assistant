#!/usr/bin/env bash
# Quality gate for one harness task. Usage: scripts/gate.sh <task-id>   e.g. scripts/gate.sh 02-api
# A task is Done only when this exits 0. Each step maps to an SDLC phase:
#   PLAN    plan written and every question answered in the task doc
#   SPEC    every acceptance criterion (ACn.m) traced to a test or harness probe
#   BUILD   red-before-green commits with saved evidence
#   TEST    unit tests, typecheck, lint, independent harness probe(s)
#   REVIEW  AI code review recorded with an APPROVE verdict and no open blockers
#   HYGIENE no secrets/personal data, CURRENT_TASK.md never committed
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
ID="${1:?usage: scripts/gate.sh <task-id> (see tasks/README.md)}"
DOC="tasks/$ID.md"; [ -f "$DOC" ] || DOC="tasks/done/$ID.md"; N="${ID%%-*}"; N="${N#0}"
[ -f "$DOC" ] || { echo "No task doc tasks/$ID.md"; exit 2; }
FAILS=0; PASSES=0; STEP=""; FAILED_STEPS=""; FAILED_NAMES=""
pass() { printf '  \033[32mPASS\033[0m %s\n' "$1"; PASSES=$((PASSES+1)); }
fail() {
  printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAILS=$((FAILS+1))
  case ",$FAILED_STEPS," in *",$STEP,"*) ;; *) FAILED_STEPS="${FAILED_STEPS:+$FAILED_STEPS,}$STEP" ;; esac
  FAILED_NAMES="${FAILED_NAMES:+$FAILED_NAMES; }$1"
}
step() { printf '\n== %s ==\n' "$1"; STEP="${1%% *}"; }
section() { awk -v h="$1" '$0 ~ "^## "h {f=1; next} /^## / {f=0} f' "$DOC"; }
pyenv() { [ -f api/.venv/Scripts/activate ] && . api/.venv/Scripts/activate; [ -f api/.venv/bin/activate ] && . api/.venv/bin/activate; true; }

step "PLAN"
plan="$(section "1[.] Plan")"
if echo "$plan" | grep -q "_TBD_"; then fail "Plan section still has _TBD_ (run /plan $ID, then write the agreed plan)"; else pass "plan written"; fi
q=$(echo "$plan" | grep -cE '^\s*- Q:' || true); a=$(echo "$plan" | grep -cE '^\s*A: *[^ _]' || true)
if [ "$q" -eq "$a" ]; then pass "questions answered ($a/$q)"; else fail "unanswered questions ($a/$q answered): fill every 'A:' line"; fi

step "SPEC (traceability)"
ACS=$(grep -oE "AC${N}\.[0-9]+" "$DOC" | sort -u)
TRACE_SRC="$(grep -m1 -oE 'Verified by:[*]* *[a-z+ ]+' "$DOC" | sed -E 's/Verified by:[*]* *//')"
if echo "$TRACE_SRC" | grep -q tests; then
  for ac in $ACS; do
    snake="ac${ac#AC}"; snake="${snake/./_}"
    if grep -rqiE "($ac\b|${snake}_)" api/tests web/app web/components web/lib 2>/dev/null --include='*.py' --include='*.test.ts' --include='*.test.tsx'; then pass "$ac has a test"; else fail "$ac has no test (put '$ac' in a test title or '${snake}_' in a pytest name)"; fi
  done
else
  pass "ACs verified by harness probe/doc checks ($(echo $ACS | wc -w) ACs)"
fi

step "BUILD (test-first evidence)"
if echo "$TRACE_SRC" | grep -q tests; then
  log=$(git log --reverse --format=%s)
  red=$(echo "$log" | grep -nE "^test\($ID\)" | head -1 | cut -d: -f1); green=$(echo "$log" | grep -nE "^feat\($ID\)" | head -1 | cut -d: -f1)
  if [ -n "$red" ] && [ -n "$green" ] && [ "$red" -lt "$green" ]; then pass "commit test($ID) precedes feat($ID)"; else fail "need a 'test($ID): ...' commit before a 'feat($ID): ...' commit"; fi
  if [ -f "evidence/$ID-red.txt" ] && grep -qiE "fail|error" "evidence/$ID-red.txt"; then pass "evidence/$ID-red.txt shows failures"; else fail "save the failing run to evidence/$ID-red.txt"; fi
  if [ -f "evidence/$ID-green.txt" ]; then pass "evidence/$ID-green.txt saved"; else fail "save the passing run to evidence/$ID-green.txt"; fi
else
  pass "not applicable (probe-verified task)"
fi
if [ "$ID" = "02-api" ]; then
  first_spec=$(git log --reverse --format=%ct -- openapi/openapi.yaml | head -1)
  first_feat=$(git log --reverse --format='%ct %s' | grep -E " feat\(02-api\)" | head -1 | cut -d' ' -f1)
  if [ -n "$first_spec" ] && { [ -z "$first_feat" ] || [ "$first_spec" -le "$first_feat" ]; }; then pass "OpenAPI committed before API implementation"; else fail "openapi/openapi.yaml must be committed before feat(02-api)"; fi
fi

step "TEST"
( pyenv; cd api && python -m pytest -q >/tmp/gate-pytest.txt 2>&1 ) && pass "pytest" || { fail "pytest (see /tmp/gate-pytest.txt)"; tail -15 /tmp/gate-pytest.txt; }
( cd web && npm test --silent >/tmp/gate-vitest.txt 2>&1 ) && pass "vitest" || { fail "vitest (see /tmp/gate-vitest.txt)"; tail -15 /tmp/gate-vitest.txt; }
( cd web && npm run -s typecheck >/tmp/gate-tsc.txt 2>&1 ) && pass "typecheck" || { fail "typecheck"; tail -10 /tmp/gate-tsc.txt; }
( cd web && npm run -s lint >/tmp/gate-lint.txt 2>&1 ) && pass "lint" || { fail "lint"; tail -10 /tmp/gate-lint.txt; }

probe_ui() {
  scripts/serve.sh start >/tmp/gate-serve.txt 2>&1 || { fail "could not start servers (see .run/*.log)"; return; }
  node scripts/probes/journey.mjs "$1" | tee "evidence/$ID-probe.txt" | grep -E "FAIL|failure"
  [ "${PIPESTATUS[0]}" -eq 0 ] && pass "journey probe '$1' (evidence/$ID-probe.txt)" || fail "journey probe '$1' (evidence/$ID-probe.txt)"
  scripts/serve.sh stop
}
case "$ID" in
  01-*) ( pyenv; python scripts/probes/contract_shape.py openapi/openapi.yaml > "evidence/$ID-probe.txt" 2>&1 ) && pass "contract probe" || { fail "contract probe"; grep FAIL "evidence/$ID-probe.txt"; } ;;
  02-*) ( pyenv; python scripts/probes/api_contract.py > "evidence/$ID-probe.txt" 2>&1 ) && pass "API behaviour matches brief + OpenAPI" || { fail "API contract probe"; grep -E "FAIL|Error" "evidence/$ID-probe.txt" | head; } ;;
  03-*) probe_ui search ;;
  04-*) probe_ui results ;;
  05-*) probe_ui choose ;;
  06-*) probe_ui all
        for h in "Runtime versions" "Install" "Run" "Check" "Environment" "Fixture and demo path" "Branch and commit"; do grep -qi "^## .*$h" README.md && pass "README: $h" || fail "README missing section '$h'"; done
        for h in "Scope" "Assumptions" "Decisions" "Trade-offs" "Checks and evidence" "Mock boundaries" "Manual keyboard checks" "Limitations" "Not verified" "Time spent" "Agent interactions" "Contract revisions"; do grep -qi "^## .*$h" APPROACH.md && pass "APPROACH: $h" || fail "APPROACH missing section '$h'"; done
        grep -q "_TODO_" README.md APPROACH.md && fail "README/APPROACH still contain _TODO_" || pass "no _TODO_ left in README/APPROACH"
        grep -qE "^\*\*(Exact|Retrospective)" APPROACH.md && pass "agent excerpts labelled Exact/Retrospective" || fail "label agent excerpts '**Exact excerpt**' or '**Retrospective summary**'"
        [ -s evidence/agent-context-loaded.txt ] && pass "evidence the agent loaded AGENTS.md" || fail "save evidence/agent-context-loaded.txt (see tasks/06)"
        git grep -qE "^@AGENTS.md" -- CLAUDE.md && pass "CLAUDE.md imports AGENTS.md" || fail "CLAUDE.md must contain '@AGENTS.md'"
        grep -qE "^[A-Za-z0-9_]+=.*(your-|placeholder|example|localhost)" .env.example && pass ".env.example has placeholders" || fail ".env.example placeholders" ;;
esac

step "REVIEW"
R="reviews/$ID.md"
if [ -f "$R" ]; then
  grep -qE "^Verdict: *APPROVE" "$R" && pass "review verdict APPROVE" || fail "$R needs 'Verdict: APPROVE' (fix findings, re-run /review $ID)"
  grep -qE "^\s*- \[ \] *(BLOCKER|MAJOR)" "$R" && fail "$R has open BLOCKER/MAJOR findings" || pass "no open BLOCKER/MAJOR findings"
else
  fail "no review: run /review $ID (writes $R)"
fi

step "HYGIENE"
if git grep -nIE '(sk-ant-[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|[A-Za-z0-9._%+-]+@(gmail|outlook|hotmail|yahoo)\.com)' -- ':!scripts/gate.sh' >/tmp/gate-secrets.txt; then fail "possible secret/personal data:"; cat /tmp/gate-secrets.txt; else pass "no secrets or personal emails tracked"; fi
git ls-files --error-unmatch CURRENT_TASK.md >/dev/null 2>&1 && fail "CURRENT_TASK.md is committed (it is short-term memory: git rm --cached it)" || pass "CURRENT_TASK.md not committed"
git ls-files | grep -E '(^|/)\.env(\.local)?$' >/dev/null && fail ".env file committed" || pass "no .env committed"

printf '\n'
if [ "$FAILS" -eq 0 ]; then
  printf '\033[32mGATE PASSED for %s\033[0m\n' "$ID"
  bash scripts/handoff.sh gate-result "$ID" pass "$PASSES checks"
else
  printf '\033[31mGATE FAILED for %s: %d check(s)\033[0m\n' "$ID" "$FAILS"
  bash scripts/handoff.sh gate-result "$ID" fail "[$FAILED_STEPS] $PASSES passed, $FAILS failed: $FAILED_NAMES"
fi
exit $(( FAILS > 0 ))
