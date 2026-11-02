# Review: 06-evidence-docs
Reviewer: AI agent (/review), triaged by: the human, who approved all fixes
Diff: 8315bf3..working tree (uncommitted)

## Spec compliance
| AC | Met? | Evidence (test / probe / file:line) |
|---|---|---|
| AC6.1 | yes | `evidence/06-evidence-docs-probe.txt` ends with `0 failure(s)` and `no horizontal overflow at 360px (overflow 0px)`. Viewed `evidence/probe-mobile-360.png`: one column, no overflow, summary visible, with Next's dev badge over the start of the last line, as `APPROACH.md:42` says. |
| AC6.2 | yes | `APPROACH.md:54-62` gives the browser, what was tabbed through, Enter and Space behaviour and the first failed Enter. `APPROACH.md:73-79` lists what was not verified. See the MINOR on visible focus for Retry. |
| AC6.3 | yes | `evidence/agent-memory.png` shows `AGENTS.md` as @-imported under `./CLAUDE.md`. `evidence/agent-context-loaded.txt` holds the menu text and the fresh answer. The menu text is a labelled copy from the screenshot, because the human supplied an image. |
| AC6.4 | yes | Every section is in `README.md`. The version table matches `node -v`, `npm -v`, `python --version`, `npm ls` and `pip show`, re-run in this review. `evidence/06-evidence-docs-check.txt` is a run of the Check block with exit 0 on each line. |
| AC6.5 | yes | Every section is in `APPROACH.md` and passes the gate. Interactions are labelled Retrospective summary and point to `tasks/`. Stale lines were updated in triage (see MINOR). |
| AC6.6 | yes | No `_TODO_` left and the hygiene gate passes. The username found in the first review pass is removed (see MAJOR). |

## Findings
- [x] MAJOR: `evidence/agent-context-loaded.txt` contained the local username in the pasted prompt line. Committing it would put a corporate username in a submitted record, which AC6.6 and the brief forbid. The hygiene gate does not catch it, because it scans for secrets and emails only. Fixed: the path is now `<repo>`, as in the other evidence files, and the label says so. A scan of tracked and new text files finds the username nowhere else.
- [x] MINOR: `APPROACH.md` still said task 06 had not been reviewed, showed it as about 18 minutes and open, and listed the review as still to do. Line 8 also pointed at a task doc path that the gate moves. Fixed: all updated, with the second session (from 21:59 UTC) and a total of about 345 minutes added, stated as approximate.
- [x] MINOR: the first agent interaction gave no reason, and the brief asks what was accepted or challenged "and why". Fixed: it now gives the reason held in the agent's saved memory, that the human wanted to own the git history. The human approved this wording in triage.
- [x] MINOR: `README.md` Run used `.venv/bin/activate`, which does not exist on Windows, and the Windows note sat only under Install. Fixed: a note under Run gives the Git Bash path and the PowerShell command.
- [x] MINOR: `APPROACH.md` did not list visible focus on Retry or arrow keys in the select as unchecked by hand. Fixed: added under Not verified. No code change.
- [x] MINOR: `debug.log` at the repo root is untracked and not ignored. It holds nine browser crash-reporter lines with no personal data. Its source was not confirmed. Accepted: the delete was approved but failed, because a running process holds the file. It stays out of the commit, because files are staged by name, and the human can delete it later.
- [x] NIT: `tasks/06-evidence-docs.md` has mixed line endings. Accepted: `core.autocrlf=true` normalises them on commit.

Question for the human:
- The README and `APPROACH.md` name the tag `submission`, which does not exist yet. The human has to create and push it after `main` moves, and give the hash in the submission message, as the task's Plan answer says. Is the route still allowed by the recruitment message, and does the reviewer have repository access?
- The reply giving the browser cut off after "edge and". No time correction followed, so `APPROACH.md` reports the elapsed figures uncorrected.

## Checks
- Correctness vs spec and OpenAPI: `git diff main` shows no changes under `openapi/`, `api/`, `web/` or `scripts/`, so "No revisions since" holds and this task changes docs and evidence only. Test counts in `APPROACH.md:34-35` match the evidence file (137 and 90).
- Tests: no test files changed, as planned. Nothing weakened. The API and contract probes were not re-run, and `APPROACH.md:37-38` says so.
- Accessibility: the manual Edge result and the journey probe agree after the retest. The first failed Enter is reported, with its cause stated as unconfirmed. Screen readers, Safari and Firefox are listed as not verified.
- Security/hygiene: no secrets. One username leak, now fixed (MAJOR). `agent-memory.png` and `probe-mobile-360.png` were viewed and hold no personal data. `shefali289` in the repository URL is accepted in the Plan answers. `BRIEF.md`, `CURRENT_TASK.md` and `web/.env.local` are ignored.
- Simplicity: docs point to `tasks/`, `reviews/` and `evidence/` and do not duplicate them. The README Check block is five lines.
- As the Serko reviewer: the README alone is enough to install and run on macOS or Linux. Windows is now covered under Run. A clean install is not verified, and `APPROACH.md:79` says so. The cap overrun is stated plainly and not excused.

Verdict: APPROVE
