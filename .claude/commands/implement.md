---
description: IMPLEMENT phase for a harness task. Red, then green, then gate, with nothing committed.
argument-hint: <task-id e.g. 02-api>
---
You are in the IMPLEMENT phase for task `$ARGUMENTS`. Follow `AGENTS.md`.

**You never commit or push.** All work stays in the working tree on branch `task/$ARGUMENTS`. The human makes one commit when the task's final gate passes.

0. Read `CURRENT_TASK.md` and `tasks/$ARGUMENTS.md`. If the Plan section still has `_TBD_` or an empty `A:` line, stop and tell the human to run `/plan $ARGUMENTS` first. Resume where the work stands: if the Status log already has a `red:` line, skip to GREEN; if it has a `green:` line too, skip to GATE.
   If the task doc's "Verified by" does not include `tests`, skip RED and GREEN: do its "3. Implement" section, record decisions, and go to GATE.
1. **RED.** Write tests that encode the acceptance criteria only, with the AC id in each test title. Add only stubs needed for the tests to load. Run them and save the full output to `evidence/$ARGUMENTS-red.txt`. Confirm that every new test fails **for the right reason** (missing behaviour, not syntax, import or config errors). If any fails for the wrong reason, fix the tooling and re-run. Then record it, which is the gate's proof that tests came first:
   `scripts/handoff.sh log $ARGUMENTS "red: <n> tests fail for the right reason (evidence/$ARGUMENTS-red.txt)"`
   Update `CURRENT_TASK.md` (Phase=green) and carry on.
2. **GREEN.** Implement the minimum to make the tests pass. Never edit a test to make it pass. If a test is wrong, stop, explain why, and change it only after the human agrees (note it under Decisions). Save the output to `evidence/$ARGUMENTS-green.txt`, then:
   `scripts/handoff.sh log $ARGUMENTS "green: all tests pass (evidence/$ARGUMENTS-green.txt)"`
3. If the implementation needs a contract change, stop and ask. Then edit `openapi/openapi.yaml` first and add a line under "Contract revisions" in `APPROACH.md`.
4. **GATE.** Run `scripts/gate.sh $ARGUMENTS`. It records the result in the task doc's Status log. Fix failures in code (or ask). The REVIEW step is expected to fail until `/review` runs.
5. Update `CURRENT_TASK.md` (Phase=review) and add every decision to the "Decisions & agent notes" section of the task doc. Report what changed, what is unverified, and any decision the human should check.
Whenever something is unclear, stop and ask instead of guessing.
