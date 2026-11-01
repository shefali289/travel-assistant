---
description: REVIEW phase. AI code review of the task's diff against its spec. Writes reviews/<task>.md and does not fix anything.
argument-hint: <task-id e.g. 02-api>
---
You are reviewing task `$ARGUMENTS` as a skeptical senior reviewer. Do not modify code.

1. Find the diff: from the commit before the first `test($ARGUMENTS)` commit (or `docs($ARGUMENTS)`) to HEAD. Read `tasks/$ARGUMENTS.md` (ACs and its "Review" section), `openapi/openapi.yaml` and `AGENTS.md`.
2. Copy `tasks/REVIEW.template.md` to `reviews/$ARGUMENTS.md` and fill it in:
   - Spec compliance: one row per AC, with Met yes/no and concrete evidence (test name, probe line, file:line).
   - Findings: each with severity BLOCKER / MAJOR / MINOR / NIT, file:line, the failure scenario, and a suggested fix. Check correctness against the spec and OpenAPI, test quality (asserts behaviour, failure paths covered, nothing weakened, mock boundary sensible), accessibility, security/hygiene, and simplicity.
   - Do not invent problems. If unsure, mark it as a question.
3. Verdict: `APPROVE` only if there is no open BLOCKER or MAJOR. Otherwise `CHANGES_REQUESTED`.
4. Tell the human the verdict and the top findings. The human decides. Fixes go in `fix($ARGUMENTS): ...` commits, and then you re-review (tick resolved findings, give a reason for accepted ones, update the verdict). The human commits the review as `review($ARGUMENTS): <verdict>`.
