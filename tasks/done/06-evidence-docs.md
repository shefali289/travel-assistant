# 06 · Journey evidence and submission docs
**Outcome:** A reviewer can install, run, check and understand the work without asking, and sees evidence of the main journey, a failure case, small screens, keyboard use, and that the agent really loaded AGENTS.md.
**Brief criteria:** small-screen layout, keyboard access, evidence, README, APPROACH, AGENTS.md loaded, runtime versions, branch/commit, no secrets, time spent.
**Depends on:** 01–05 · **Verified by:** probe (journey `all`) + doc checks

## 1. Plan
Run `/plan 06-evidence-docs`.

Plan:
1. Evidence: the human runs the manual keyboard check and `/memory`. The agent runs a fresh `claude -p` and saves both to `evidence/agent-context-loaded.txt`, each labelled as an exact excerpt. The gate's `all` probe saves `evidence/06-evidence-docs-probe.txt` and `probe-mobile-360.png`, and the agent looks at the screenshot.
2. `README.md`: runtime versions from the task's commands, the fixture and demo path, branch and tag, and a Check block that works when followed literally (subshells, venv activated).
3. `APPROACH.md`: fill every section, pointing to `tasks/`, `reviews/` and `evidence/` instead of duplicating, with the gaps from tasks 03-05 under Limitations and Not verified, and the overrun stated under Time spent.
4. No new test files, because this task is verified by the probe and doc checks. Order: evidence, then docs, then `scripts/gate.sh 06-evidence-docs`, `/review 06-evidence-docs`, triage, final gate, one commit.

Questions:
- Q: Which agent interactions go into APPROACH (2–3)? Pick ones where you **challenged** the agent, e.g. a wrong-reason red run, a test that was weakened, or a contract shortcut.
  A: Recommendation accepted. Three, each labelled **Retrospective summary**: one commit per task with no commits unless approved; the path-only fix to the journey probe, so the acceptance checks stayed the same; the AC3.7 focus test that could not fail in jsdom. No wrong-reason red run or weakened test is claimed.
- Q: Which browser and screen reader (if any) did you use for manual keyboard checks?
  A: Recommendation accepted. Edge or Chrome with no screen reader. NVDA, Safari and Firefox go under "Not verified". The human still has to run the check and report the browser used and the results.
- Q: What is the delivery route: a branch on a repo, or a zip? (This decides the "Branch and commit" section.)
  A: Recommendation accepted. `main` on the GitHub repo with a tag `submission`, if the recruitment message allows it. The human makes sure the reviewer has access.
- Q: What time goes in APPROACH, given that commits and status logs show about 295 elapsed minutes before task 06, over the 4-hour cap?
  A: Recommendation accepted. Report the elapsed figures, state the overrun plainly, apply any corrections the human gives for setup and idle time, and keep this task to the minimum and list what remains.
- Q: How does the README identify the commit, given that it cannot contain its own hash?
  A: Recommendation accepted. The README names `main` and the tag. The human gives the exact hash in the submission message and creates and pushes the tag after the final commit.
- Q: Is personal information OK to include (`shefali289` in the repo URL, name and email in commit history)? The hygiene gate scans file contents only.
  A: Recommendation accepted. Keep the repo URL and the history. History is not rewritten.
- Q: How is the AGENTS.md loading evidence captured: `/memory` output, a fresh `claude -p` answer, or both?
  A: Recommendation accepted. Both: the human pastes the `/memory` output and the agent runs the fresh session. The session-start hook adds task notes to a fresh session, which could weaken its answer on its own.

## 2. Spec: acceptance criteria
- **AC6.1** Journey probe `all` passes against the real app. `evidence/06-evidence-docs-probe.txt` and screenshots include `probe-mobile-360.png` (no horizontal overflow at 360px).
- **AC6.2** Manual keyboard check: write down in APPROACH what you tabbed through, the focus visibility, Enter/Space behaviour, and what you did **not** verify (e.g. screen reader).
- **AC6.3** `evidence/agent-context-loaded.txt` holds the output of `/memory` in Claude Code showing CLAUDE.md → AGENTS.md, and a fresh session's answer to "What is the API contract and the UI contract?" Label each as an exact excerpt.
- **AC6.4** README sections: Runtime versions (`node -v`, `npm -v`, `python --version`, Next, React, FastAPI, pytest, Vitest), Install, Run, Check, Environment (`.env.example`), Fixture and demo path, Branch and commit. The Check commands work when run in order from the repo root.
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
- All plan recommendations accepted by the human. Scope changed: AC6.3 now needs both the `/memory` output and the fresh session's answer, and AC6.4 adds that the Check commands work in order from the repo root.
- Fix the README Check block (it runs `cd api` then `cd web` without returning to the root, and never activates the venv), and carry the known gaps from tasks 03-05 into APPROACH.
- The "No revisions since" line in APPROACH stays only if `openapi/openapi.yaml` is unchanged since task 01. Check this before writing it.
- The manual keyboard results (AC6.2) must come from the human. The agent does not write them up as done without those results.
- The records show no wrong-reason red run or weakened test, so APPROACH does not claim either.
- `claude -p` could not run from the agent: Claude Code refuses to start inside another session, warning that nested sessions can crash all active sessions, and names unsetting `CLAUDECODE` as the bypass. The agent did not bypass it, because no one approved that and the warning names a real risk. So the fresh session's answer is also owed by the human, and `evidence/agent-context-loaded.txt` holds two placeholders and the exact refusal.
- `_TODO_` stays in two places in `APPROACH.md` (manual keyboard check, agent-loading evidence), so the gate's `_TODO_` check fails on purpose until the human's inputs arrive.
- The gate's check on `evidence/agent-context-loaded.txt` only tests that the file is not empty, so it passes on placeholders. It proves nothing yet. The gate does not scan that file for `_TODO_`, so it needs checking by hand.
- `evidence/06-evidence-docs-check.txt` is one literal run of the README Check block, with the local repo path and username replaced and colour codes removed, as in earlier tasks. Its test counts back the Checks table in `APPROACH.md`. Install and Run were not re-run as written.
- Check block changed from the plan's wording only by adding the journey probe through `scripts/serve.sh`, and it uses `python -m pytest`, as the gate does. `api_contract.py` was not re-run in this task, and APPROACH says so.
- Looked at `evidence/probe-mobile-360.png`: one column, no overflow, summary shown. Next's dev tools badge covers the start of the summary's last line, which comes from `next dev` and is noted in APPROACH.
- First-person motives were left out of the three agent interactions, because the records do not state them. The human may add their reasons.
- Task 06's time is from the clock at the time of writing (about 18 min at 03:18 UTC) and needs updating before the final commit.
- Human's first keyboard report: Tab and focus visible yes, Space yes, Enter no, and Retry fails again. Not written to APPROACH yet, because the Enter result conflicts with the probe and tests. The agent ran a one-off Playwright script in Chromium and Edge against the running app. Enter on a Choose button that is not already chosen selects it and moves focus to the summary. Enter right after a choice does nothing, because focus is on the summary, and Enter on the already chosen button leaves focus on the button (AC5.4). No code change. The human is asked to retest Enter, one button at a time. Retry with `error` still selected fails again as documented in the README. Retry from the keyboard after switching to `success` showed hotels in that script.
- Human's retest reply was "yes als", read by the agent as yes to both the Enter and Retry retests. Recorded in APPROACH. Browser, `/memory` output and the time check are still owed, so the `_TODO_` markers stay.
- Human reported Edge and supplied the `/memory` screenshot, saved as `evidence/agent-memory.png` with its menu text in `evidence/agent-context-loaded.txt`. The reply cut off after "edge and", so no time correction was received. The elapsed figures stand as the plan's answer allows, and the human is told so.
- First review of task 06: CHANGES_REQUESTED, with one MAJOR (local username in `evidence/agent-context-loaded.txt`, from the agent saving the pasted prompt line unredacted) and five MINOR. Findings are not fixed yet, and the human decides. The agent recommends applying all of them.
- Triage: the human approved all review fixes, and no time correction was given. All are applied. The first interaction in APPROACH now states the reason from the agent's saved memory. `debug.log` could not be deleted, because a running process holds it, so it stays out of the commit. Total time in APPROACH is about 345 min, from the clock, updated before the final gate.

## Status log (updated automatically)
- 2026-11-02 03:00 UTC - on branch task/06-evidence-docs
- 2026-11-02 03:00 UTC - next: plan (agent)
- 2026-11-02 03:03 UTC - next: answers (human)
- 2026-11-02 03:06 UTC - next: implement (agent)
- 2026-11-02 03:14 UTC - implement: claude -p refused by the nested-session check, fresh-session answer left as a placeholder for the human
- 2026-11-02 03:17 UTC - gate FAILED [TEST,REVIEW] 39 passed, 2 failed: README/APPROACH still contain _TODO_; no review: run /review 06-evidence-docs (writes reviews/06-evidence-docs.md)
- 2026-11-02 22:23 UTC - gate FAILED [REVIEW] 40 passed, 1 failed: no review: run /review 06-evidence-docs (writes reviews/06-evidence-docs.md)
- 2026-11-02 22:25 UTC - review: CHANGES_REQUESTED, 1 MAJOR (username in evidence), 5 MINOR, waiting on human triage
- 2026-11-02 22:25 UTC - next: triage (human)
- 2026-11-02 22:30 UTC - gate PASSED (42 checks)
- 2026-11-02 22:33 UTC - gate PASSED (42 checks)
- 2026-11-02 22:33 UTC - next: commit-done (human)
