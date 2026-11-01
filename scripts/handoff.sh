#!/usr/bin/env bash
# Automatic handoff between agents. The next action is worked out from repo state, not agent memory,
# so it survives new sessions and compaction. Agents never commit or push: those steps wait on the human.
# Usage: scripts/handoff.sh <command>
#   status                          print the handoff brief (any agent can run this)
#   session-start                   SessionStart hook: same brief, injected into the new session
#   stop                            Stop hook: when the phase just changed, hand off once; otherwise do nothing
#   branch                          switch to the active task's branch task/<id>, creating it from main if needed
#   log <task-id> <text>            append a line to the task doc's Status log
#   gate-result <task-id> pass|fail <summary>   called by scripts/gate.sh; a pass moves the doc to tasks/done/
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
STATE=".run/handoff-state"

doc_of() { for d in "tasks/$1.md" "tasks/done/$1.md"; do [ -f "$d" ] && { echo "$d"; return; }; done; }
section() { awk -v h="$2" '$0 ~ "^## "h {f=1; next} /^## / {f=0} f' "$1"; }
phase_is() { [ -f CURRENT_TASK.md ] && grep -qE "^Task[:=] *$ID\b" CURRENT_TASK.md && grep -qE "^Phase[:=] *$1\b" CURRENT_TASK.md; }
next() { WHO="$1"; ACTION="$2"; TEXT="$3"; }

log() {
  local doc; doc="$(doc_of "$1")"; [ -n "$doc" ] || return 0
  grep -q '^## Status log' "$doc" || printf '\n## Status log (updated automatically)\n' >> "$doc"
  printf -- '- %s - %s\n' "$(date -u '+%Y-%m-%d %H:%M UTC')" "$2" >> "$doc"
}

fresh_agent() { echo "Hand off to a fresh agent: use the Agent tool (general-purpose) with this brief: run scripts/handoff.sh status, then follow .claude/commands/$1.md with ARGUMENTS=$ID. Do not commit or push: nothing is committed until the task's final gate passes. If you need a human decision, return it in your final message. Relay that message to the person."; }

# Sets WHO (agent|human|none), ACTION, TEXT and ID.
resolve() {
  local finished plan q a f
  # A task the gate just moved to tasks/done/ must be committed before the next one starts.
  finished="$(git status --porcelain -uall -- tasks/done 2>/dev/null | sed -nE 's#.*tasks/done/([^ "]+)\.md.*#\1#p' | head -1)"
  if [ -n "$finished" ]; then
    ID="$finished"; DOC="tasks/done/$ID.md"
    next human commit-done "Task $ID passed the gate and moved to tasks/done/. This is the task's one commit. Ask the person to check git status, then commit, merge into main and push, giving them these commands one per line (fill in the summary). Stage only files this task changed, named one by one, never git add -A; drop any listed file that belongs to other work: (1) git add $(git status --porcelain -uall | sed -E 's/^...//; s/.* -> //' | paste -sd' ') (2) git commit -m 'feat($ID): <one-line summary of the task>' $(merge_cmds 3)"
    return
  fi
  # Each task lives on its own branch. A finished task's branch must be merged into main before the next one starts.
  BRANCH="$(git branch --show-current)"
  if [ -f "tasks/done/${BRANCH#task/}.md" ]; then
    ID="${BRANCH#task/}"; DOC="tasks/done/$ID.md"
    next human merge "Task $ID is done but its branch is not merged. Ask the person to merge it into main and push, giving them these commands one per line: $(merge_cmds 1)"
    return
  fi
  # The active task is the lowest-numbered doc still in tasks/.
  ID=""; for f in tasks/[0-9][0-9]-*.md; do [ -f "$f" ] && { ID="$(basename "$f" .md)"; DOC="$f"; break; }; done
  if [ -z "$ID" ]; then ID="all"; DOC=""; next none finished "All tasks are done and in tasks/done/."; return; fi
  if [ "$BRANCH" != "task/$ID" ]; then
    next agent branch "Run scripts/handoff.sh branch to get onto task/$ID. If it refuses, tell the person why."
    return
  fi

  # Nothing is committed while a task is in progress. Phases are read from the task doc and reviews/,
  # and the person makes one commit when the final gate passes.
  # Plan: agent asks, human answers. Same checks as the gate's PLAN step.
  plan="$(section "$DOC" "1[.] Plan")"
  q=$(echo "$plan" | grep -cE '^\s*- Q:'); a=$(echo "$plan" | grep -cE '^\s*A: *[^ _]')
  if echo "$plan" | grep -q "_TBD_" || [ "$q" -ne "$a" ]; then
    if phase_is plan; then next human answers "Waiting on the person to answer the plan questions for $ID ($a of $q answered). Show them any unanswered questions from $DOC."
    else next agent plan "Run /plan $ID in this session, because it needs a conversation with the person. Ask the questions, then stop for answers."; fi
    return
  fi
  # Implement: red, green, then a gate run, in one fresh agent. Only REVIEW may still fail before the review.
  if ! grep -E ' - gate ' "$DOC" | tail -1 | grep -qE 'gate (PASSED|FAILED \[REVIEW\])'; then
    next agent implement "$(fresh_agent implement)"; return
  fi

  # Review: a fresh agent reviews the uncommitted work against main, the human triages. Then the final gate run.
  if [ ! -f "reviews/$ID.md" ]; then next agent review "$(fresh_agent review)"; return; fi
  if ! grep -qE '^Verdict: *APPROVE' "reviews/$ID.md" || grep -qE '^\s*- \[ \] *(BLOCKER|MAJOR)' "reviews/$ID.md"; then
    next human triage "Review of $ID has open findings. Ask the person to read reviews/$ID.md and decide what to fix. Agreed fixes are made in the working tree (no commit), then /review $ID runs again."
    return
  fi
  next agent gate "Run scripts/gate.sh $ID. It rebases task/$ID on main if needed. A pass moves the task doc to tasks/done/."
}

# Commands for the person, numbered from $1 and never chained, so each one can be run and checked on its own:
# fast-forward main to the task branch, then push both.
merge_cmds() { echo "($1) git switch main ($(($1+1))) git merge --ff-only task/$ID ($(($1+2))) git push origin main task/$ID"; }

# Get onto task/<id>: switch if it exists, otherwise create it from main. Never leaves another task's branch.
switch_branch() {
  local want="task/$ID"
  [ "$BRANCH" = "$want" ] && return 0
  if git show-ref --verify -q "refs/heads/$want"; then git switch -q "$want"
  elif [ "$BRANCH" = main ]; then git switch -q -c "$want"
  else echo "Not switching to $want: on '$BRANCH', not main. Commit or stash, then: git switch main"; return 1; fi \
    && log "$ID" "on branch $want" && echo "On branch $want."
}
# Hooks call this, so a new task's branch is made without anyone asking.
auto_branch() { resolve; [ "$ACTION" = branch ] && switch_branch >&2; resolve; }

# True when the phase changed since the last look. The first look only records it.
advanced() {
  local key="$ID|$ACTION" last=""
  mkdir -p .run; [ -f "$STATE" ] && last="$(cat "$STATE")"
  [ "$key" = "$last" ] && return 1
  echo "$key" > "$STATE"
  [ "$ID" != "all" ] && log "$ID" "next: $ACTION ($WHO)"
  [ -n "$last" ]
}

brief() {
  local f notes
  echo "# Harness handoff (generated from repo state by scripts/handoff.sh)"
  echo "Active task: $ID${DOC:+ ($DOC)}"
  echo "Next ($WHO): $TEXT"
  echo "Agents never commit or push. Give the person the commands, or run one only if they approve that specific commit or push."
  echo; echo "## Completed"
  for f in tasks/done/*.md; do [ -f "$f" ] && echo "- $(basename "$f" .md)"; done
  echo; echo "## Decisions so far"
  for f in tasks/done/*.md ${DOC:+"$DOC"}; do
    [ -f "$f" ] || continue
    notes="$(section "$f" "Decisions" | grep -vE '^\s*-?\s*$')"
    [ -n "$notes" ] && { echo "### $(basename "$f" .md)"; echo "$notes"; }
  done
  if [ -n "${DOC:-}" ]; then echo; echo "## Recent status"; section "$DOC" "Status log" | tail -5; fi
  if [ -f CURRENT_TASK.md ]; then echo; echo "## CURRENT_TASK.md"; head -40 CURRENT_TASK.md; fi
}

complete() {
  local doc n; doc="tasks/$1.md"; [ -f "$doc" ] || return 0
  mkdir -p tasks/done; mv "$doc" "tasks/done/$1.md"
  n="${1%%-*}"
  sed -i -E "/^\| $n \|/{s#\($1\.md\)#(done/$1.md)#; s#\| Todo \|#| Done |#}" tasks/README.md
  echo "Moved $doc to tasks/done/ and ticked the board. Next step: scripts/handoff.sh status"
}

case "${1:-status}" in
  status) resolve; brief ;;
  branch) resolve; [ "$ACTION" = branch ] && { switch_branch || exit 1; } || echo "Nothing to do: $TEXT" ;;
  session-start)
    auto_branch 2>&1; advanced
    brief
    echo; echo "When the person asks to continue, carry out Next. If Next waits on them, tell them exactly what is needed." ;;
  stop)
    auto_branch 2>/dev/null
    advanced || exit 0
    printf '{"decision":"block","reason":"Phase changed for %s. Record any decisions under Decisions and agent notes in the task doc, then: %s"}\n' "$ID" "$TEXT" ;;
  log) log "$2" "$3" ;;
  gate-result)
    if [ "$3" = pass ]; then log "$2" "gate PASSED ($4)"; complete "$2"
    else log "$2" "gate FAILED $4"; fi ;;
  *) echo "usage: scripts/handoff.sh status|branch|session-start|stop|log|gate-result"; exit 2 ;;
esac
exit 0
