# 06 · Journey evidence and submission docs
**Outcome:** A reviewer can install, run, check and understand the work without asking, and sees evidence of the main journey, a failure case, small screens, keyboard use, and that the agent really loaded AGENTS.md.
**Brief criteria:** small-screen layout, keyboard access, evidence, README, APPROACH, AGENTS.md loaded, runtime versions, branch/commit, no secrets, time spent.
**Depends on:** 01–05 · **Verified by:** probe (journey `all`) + doc checks

## 1. Plan
Run `/plan 06-evidence-docs`.

Plan: _TBD_

Questions:
- Q: Which agent interactions go into APPROACH (2–3)? Pick ones where you **challenged** the agent, e.g. a wrong-reason red run, a test that was weakened, or a contract shortcut.
  A:
- Q: Which browser and screen reader (if any) did you use for manual keyboard checks?
  A:
- Q: What is the delivery route: a branch on a repo, or a zip? (This decides the "Branch and commit" section.)
  A:

## 2. Spec: acceptance criteria
- **AC6.1** Journey probe `all` passes against the real app. `evidence/06-evidence-docs-probe.txt` and screenshots include `probe-mobile-360.png` (no horizontal overflow at 360px).
- **AC6.2** Manual keyboard check: write down in APPROACH what you tabbed through, the focus visibility, Enter/Space behaviour, and what you did **not** verify (e.g. screen reader).
- **AC6.3** `evidence/agent-context-loaded.txt` holds the output of `/memory` in Claude Code showing CLAUDE.md → AGENTS.md, or a fresh session's answer to "What is the API contract and the UI contract?" Label it as an exact excerpt.
- **AC6.4** README sections: Runtime versions (`node -v`, `npm -v`, `python --version`, Next, React, FastAPI, pytest, Vitest), Install, Run, Check, Environment (`.env.example`), Fixture and demo path, Branch and commit.
- **AC6.5** APPROACH sections: Scope, Assumptions, Decisions, Trade-offs, Checks and evidence, Mock boundaries, Manual keyboard checks, Limitations, Not verified, Time spent, Agent interactions (each **Exact excerpt** or **Retrospective summary**), Contract revisions. Point to `tasks/` instead of duplicating.
- **AC6.6** No `_TODO_` left. No secrets or personal data. The hygiene gate passes.

## 3. Implement
1. Fill `README.md` and `APPROACH.md` (skeletons with `_TODO_` markers are provided).
2. Capture the runtime versions with `node -v && npm -v && python --version && (cd web && npm ls next react vitest --depth=0) && (cd api && pip show fastapi pytest | grep -E 'Name|Version')`.
3. Write the commit hash last: `git rev-parse --short HEAD`, after your final docs commit. Note that the hash in README refers to the commit *before* the README commit, or use the tag you submit.

## 4. Verify
`scripts/gate.sh 06-evidence-docs`

## 5. Review
Run `/review 06-evidence-docs`. Ask the agent to act as the Serko reviewer. Can they run everything from README alone? Is every claim in APPROACH backed by a file in `evidence/` or a test? Is anything overstated?

## Definition of done
Gate passes. You stopped at the time cap and APPROACH says what remains.

## Decisions & agent notes
-
