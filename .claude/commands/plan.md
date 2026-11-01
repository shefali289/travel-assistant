---
description: PLAN phase for a harness task. Clarify, ask questions, propose a plan. Writes no code.
argument-hint: <task-id e.g. 02-api>
---
You are in the PLAN phase for task `$ARGUMENTS`. Do not write or change any code or tests.

1. Read `AGENTS.md`, `tasks/README.md`, `tasks/$ARGUMENTS.md`, and `openapi/openapi.yaml` if it exists. Read `CURRENT_TASK.md` if present.
2. Create or overwrite `CURRENT_TASK.md` from `tasks/CURRENT_TASK.template.md`: Task=$ARGUMENTS, Phase=plan.
3. Restate the outcome in one sentence and list each acceptance criterion (ACn.m) with how you would verify it (test name, or probe step).
4. **Ask questions.** List every ambiguity, conflict with the brief, or missing decision, including the pre-seeded `- Q:` items. For each one, give a recommended answer and why. Ask about anything you would otherwise have to guess. Then **STOP and wait for the human's answers.** Do not continue past this step in the same turn.
5. After the human answers: write each answer on its `A:` line, replace `Plan: _TBD_` with a 3–6 line plan (files to touch, test file names, order), and update the ACs if the answers changed scope (say what changed). Update `CURRENT_TASK.md` (Phase=spec, next steps).
6. Tell the human to review the task doc and commit it as `docs($ARGUMENTS): plan and spec`. Do not commit it yourself unless asked.
