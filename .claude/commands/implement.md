---
description: IMPLEMENT phase for a harness task. Red commit, then green commit, then gate.
argument-hint: <task-id e.g. 02-api>
---
You are in the IMPLEMENT phase for task `$ARGUMENTS`. Follow `AGENTS.md`.

0. Read `CURRENT_TASK.md` and `tasks/$ARGUMENTS.md`. If the Plan section still has `_TBD_` or an empty `A:` line, stop and tell the human to run `/plan $ARGUMENTS` first.
1. **RED.** Write tests that encode the acceptance criteria only, with the AC id in each test title. Add only stubs needed for the tests to load. Run them and save the full output to `evidence/$ARGUMENTS-red.txt`. Confirm that every new test fails **for the right reason** (missing behaviour, not syntax, import or config errors). If any fails for the wrong reason, fix the tooling and re-run. Show the human the failure summary, then commit `test($ARGUMENTS): <summary>`. Update `CURRENT_TASK.md` (Phase=green).
2. **GREEN.** Implement the minimum to make the tests pass. Never edit a test to make it pass. If a test is wrong, stop, explain why, and fix it in a separate commit after the human agrees. Save the output to `evidence/$ARGUMENTS-green.txt`, then commit `feat($ARGUMENTS): <summary>`.
3. If the implementation needs a contract change, stop and ask. Then edit `openapi/openapi.yaml` first in its own commit and add a line under "Contract revisions" in `APPROACH.md`.
4. **GATE.** Run `scripts/gate.sh $ARGUMENTS`. Fix failures in code (or ask). The REVIEW step is expected to fail until `/review` runs.
5. Update `CURRENT_TASK.md` (Phase=review) and the "Decisions & agent notes" section of the task doc. Report what changed, what is unverified, and any decision the human should check.
Whenever something is unclear, stop and ask instead of guessing.
