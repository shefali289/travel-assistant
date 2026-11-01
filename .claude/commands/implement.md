---
description: IMPLEMENT phase for a harness task. Red, human commit, green, human commit, then gate.
argument-hint: <task-id e.g. 02-api>
---
You are in the IMPLEMENT phase for task `$ARGUMENTS`. Follow `AGENTS.md`.

**You never commit or push.** At each commit point below, give the human the exact commands and stop. Run a commit yourself only if the human approves that specific commit.

0. Read `CURRENT_TASK.md` and `tasks/$ARGUMENTS.md`. If the Plan section still has `_TBD_` or an empty `A:` line, stop and tell the human to run `/plan $ARGUMENTS` first. Resume where the work stands: if `test($ARGUMENTS)` is already in `git log`, skip to GREEN; if `feat($ARGUMENTS)` is too, skip to GATE.
   If the task doc's "Verified by" does not include `tests`, skip RED and GREEN: do its "3. Implement" section, record decisions, go to GATE, and give the commit commands after the gate run.
1. **RED.** Write tests that encode the acceptance criteria only, with the AC id in each test title. Add only stubs needed for the tests to load. Run them and save the full output to `evidence/$ARGUMENTS-red.txt`. Confirm that every new test fails **for the right reason** (missing behaviour, not syntax, import or config errors). If any fails for the wrong reason, fix the tooling and re-run. Update `CURRENT_TASK.md` (Phase=red-commit), then show the human the failure summary and these commands, and stop:
   `git add -A && git commit -m "test($ARGUMENTS): <summary>"`
2. **GREEN.** Implement the minimum to make the tests pass. Never edit a test to make it pass. If a test is wrong, stop, explain why, and fix it in a separate commit after the human agrees. Save the output to `evidence/$ARGUMENTS-green.txt`. Update `CURRENT_TASK.md` (Phase=green-commit), then give these commands and stop:
   `git add -A && git commit -m "feat($ARGUMENTS): <summary>"`
3. If the implementation needs a contract change, stop and ask. Then edit `openapi/openapi.yaml` first, add a line under "Contract revisions" in `APPROACH.md`, and give the human the commands for its own commit.
4. **GATE.** Run `scripts/gate.sh $ARGUMENTS`. It records the result in the task doc's Status log. Fix failures in code (or ask). The REVIEW step is expected to fail until `/review` runs.
5. Update `CURRENT_TASK.md` (Phase=review) and add every decision to the "Decisions & agent notes" section of the task doc. Report what changed, what is unverified, and any decision the human should check.
Whenever something is unclear, stop and ask instead of guessing.
