# Approach

## Scope
Built: the core journey on local fixture data. A traveller sends a request, sees loading, then results, an empty state or a recoverable error, chooses one hotel, and sees a focused summary. It uses Next.js App Router, TypeScript, Tailwind and FastAPI, from a contract written first (`openapi/openapi.yaml`).

Left out, as the brief allows: natural-language interpretation, a live model, streaming, booking, authentication, a database and deployment. The same hotels come back whatever the request says.

The work was split into six tasks. Each has its acceptance criteria, questions and decisions in `tasks/done/`. The brief-to-task trace is in `tasks/README.md`.

## Assumptions
The answered questions are in the Plan section of each task doc. These shape the product most:
- `scenario` is optional and defaults to `success`, because a traveller's request should not need a demo control.
- A `message` must be non-blank and at most 500 characters. The brief sets no limit.
- All three scenarios wait for the short delay, so the loading state shows for each. Invalid requests do not wait.
- Retry resends the failed request's message with the scenario selected at that moment, so a demo can recover by switching to `success` (`AC4.6` tests).

## Decisions
Every decision is under "Decisions & agent notes" in the task docs. The main ones:
- **Contract first.** The YAML was committed in task 01, before any API code. See Contract revisions below.
- **One error shape.** 422 and 503 both use `ErrorResponse`, including for FastAPI's own validation failures, so the client has one error path.
- **Bad fixture data stops the API from starting**, rather than serving a broken response (`test_ac2_1_` tests).
- **Focus moves on purpose.** After a search, focus returns to **Find hotels**. After a choice, it moves to the **Your choice** summary.
- **One branch and one commit per task.** Test-first is shown by the `red:` and `green:` lines in each Status log and by the evidence files. Tasks 01 and 02 began under an older one-commit-per-phase flow.

## Trade-offs
- **Process over speed.** The plan, review and gate steps give a traceable record, and they add to the elapsed time below. Their share was not measured separately.
- **The fixture is read once at startup**, so changing the CSV needs a restart.
- **Response checking in the client is loose.** A 200 is checked only for a `message` string and a `hotels` array, and a string `code` outside the enum still shows the server's message (`AC3.2` and `AC3.3` tests).
- **The chosen card's badge adds a line**, so the Choose buttons move down when a hotel is first chosen. Accepted at the 05 review.

## Checks and evidence
| Check | Command | Result and evidence |
|---|---|---|
| API tests (pytest) | README Check | 137 passed: `evidence/06-evidence-docs-check.txt` |
| Frontend tests (Vitest, Testing Library), typecheck, lint | README Check | 90 passed in 6 files, typecheck and lint exit 0: same file |
| Journey probe, all stages, in Chromium against the real app and API | README Check | 0 failures, including no horizontal overflow at 360px: same file |
| API behaviour against the brief and the YAML | `python scripts/probes/api_contract.py` | 0 failures at task 02: `evidence/02-api-probe.txt`. Not re-run in task 06 |
| Contract shape | `python scripts/probes/contract_shape.py openapi/openapi.yaml` | 0 failures at task 01: `evidence/01-contract-probe.txt`. The YAML has not changed since |
| Red before green | per task | `evidence/0[2-5]-*-red.txt`, `evidence/0[2-5]-*-green.txt`, and the Status logs in `tasks/done/` |
| AI code review | `/review` | `reviews/01-contract.md` to `reviews/06-evidence-docs.md`, all APPROVE at the end of triage |

Screenshots in `evidence/`: `probe-results.png` (main journey), `probe-chosen.png` (choice and summary), `probe-error.png` (failure case), `probe-empty.png`, `probe-search-loading.png`, `probe-mobile-360.png` (small screen) and `03-search-focus.png` (focus outline). They show Next's dev tools badge, which comes from `next dev`. In `probe-mobile-360.png` the badge covers the start of the summary's last line.

Agent loading of `AGENTS.md`: `evidence/agent-memory.png` shows `/memory` listing `AGENTS.md` as @-imported under `./CLAUDE.md`. `evidence/agent-context-loaded.txt` holds the same menu text and a fresh `claude -p` answer that gives both contracts. The answer alone is weaker evidence, because the session-start hook also adds task notes to a fresh session.

Some checks were one-off browser scripts that were not kept, such as the focus outlines at tasks 03-05. Their results are written in the task docs' decisions, and only the screenshots remain from them, so they are weaker evidence than the rest of this section.

## Mock boundaries
- **API tests:** the real app through `TestClient`, nothing mocked. `FIXTURE_DELAY_MS` is set, to 0 except in the delay tests.
- **Client tests (`web/lib/api.test.ts`):** `fetch` stubbed.
- **Component tests (`web/components/HotelAssistant.*.test.tsx`):** `fetchRecommendations` from `@/lib/api` mocked. They run in jsdom, so they cannot show outlines or layout.
- **Journey probe:** nothing mocked. A real browser, the real web app and the real API.

## Manual keyboard checks
Run by hand with both servers running, no screen reader. Browser: Microsoft Edge.
1. Tab through the request field, Demo scenario and Find hotels: focus was visible on each.
2. With `success`, Tab to a Choose button and press Enter or Space: the choice is made and focus moves to the **Your choice** summary. Shift+Tab back to a different Choose button and press Enter: the choice and focus change again.
3. Set `error`, press Find hotels, change the scenario to `success`, Tab to Retry and press Enter: the hotels appear. With `error` still selected, Retry fails again, as the README describes.

In the first run Enter looked like it did nothing, and it passed on a retest with the steps above. Enter has no effect straight after a choice, because focus is then on the summary, and pressing it on the already chosen button leaves focus on that button. A person can read this as a failed key press. A one-off script in Chromium and Edge showed the same behaviour, and no code changed. The cause of the first result was not confirmed.

Automated checks cover part of this but do not replace it. The journey probe tabs to **Find hotels** and **Choose City Garden**, presses Enter on each, checks that the Choose button has an outline, and checks that focus moves to the summary. Vitest covers Tab order and Enter or Space on the controls, but cannot show visible focus (`AC3.8`, `AC4.6` and `AC5.5` tests).

## Limitations
- Fixture data only: the request is not interpreted and nothing is booked.
- The summary's outline and the chosen card's thick border have no automated check, only one-off browser checks and `evidence/probe-chosen.png`.
- The journey probe's fixture check passes without the "Fixture data" label, because the demo hint also contains "fixture". The exact label is checked by a Vitest test (`AC4.1`).
- A web server on a port other than 3000 cannot reach the API unless `ALLOWED_ORIGINS` is set.
- On Windows, `scripts/serve.sh stop` stops whatever listens on 3000 and 8000, including servers it did not start.

Next, I would finish the items under Not verified, then add probe checks for the summary outline and the chosen border.

## Not verified
- **Screen readers.** None was used, so no announcement has been tested. In particular:
  - Focus moves to **Find hotels** 2.5-13.5 ms after the reply is inserted (`reviews/04-results.md`), so a screen reader may cut off the polite reply.
  - Whether the summary's contents are read on focus, or only "Your choice, region". This limits the "announced" part of task 05's outcome.
  - On a blank submit, focus moves to the field before the error renders, and the error has no `role="alert"`.
- **Safari and Firefox.** The probes ran in Chromium only. This includes the reason for `role="list"` on the results list, which targets Safari.
- **A clean install, and the README's Run block as written.** The Check block was run in Git Bash on Windows with dependencies already installed, and `scripts/serve.sh` started the servers. Linux and macOS were not tried.
- **Some keyboard details by hand.** Visible focus on **Retry** and arrow keys in the **Demo scenario** select were not specifically checked. The journey probe checks the outline on a Choose button, and Retry uses the same focus classes.

## Time spent
**This is over the cap.** The brief allows four hours (240 min). About 295 min had elapsed before task 06 began.

These are elapsed times from commits and status logs, not measured working time. They may include idle time. They exclude any setup before the first commit and any untracked work on 03's review fixes before 22:35. All times are UTC.

| Task | Start | End | Minutes |
|---|---|---|---|
| harness + 01 | 11-01 06:44 | 11-01 07:33 | 49 |
| 02 | 11-01 07:33 | 11-01 08:37 | 64 |
| 03 | 11-01 08:38 | 11-01 09:08, plus about 5 at 22:35 | about 35 |
| 04 | 11-02 00:26 | 11-02 01:36 | 70 |
| 05 | 11-02 01:36 | 11-02 02:53 | 77 |
| Total before 06 | | | about 295 |
| 06 | 11-02 about 03:00, then 21:59 | 11-02 03:18, then 22:30 at the final gate | about 50, from the clock |
| Total | | | about 345, about 105 over the cap |

Task 06 was kept to the minimum because of the overrun. No corrections to the elapsed times were given. Remaining work is listed under Limitations and Not verified.

## Agent interactions
Harness: `AGENTS.md` (loaded via `CLAUDE.md`), `/plan`, `/implement`, `/review`, `scripts/gate.sh`. The full record is in `tasks/` and `tasks/done/` (Q/A, decisions, status log) and `reviews/*.md`.

**Retrospective summary: commits only with approval.** Direction given to the agent: one commit per task, after the task's final gate, and no commit or push without asking. I challenged the harness's original flow, where the agent commits, because I wanted to own the git history for this take-home. This replaced the one-commit-per-phase flow during task 02, in `AGENTS.md`, `tasks/README.md`, `.claude/commands/` and `scripts/`. As a result, test-first is shown by the Status log and evidence files, not by commit order. See the notes in `tasks/done/02-api.md`.

**Retrospective summary: path-only fix to the acceptance probe.** At task 03 the journey probe failed on Windows, because it built its output folder from `URL.pathname`. The probe is the independent acceptance check, so only a path fix with `fileURLToPath` was approved, with no check changed. See the decisions in `tasks/done/03-search.md`.

**Retrospective summary: a focus test that could not fail.** The 03 review found that the `AC3.7` focus assertion still passed with the focus line removed, because jsdom keeps focus on a disabled button and Chromium does not (`reviews/03-search.md`). The recommendation to change the test was accepted before the change was made, as `AGENTS.md` requires. The test now moves focus to a second button first, and the review records that it fails without the focus line.

## Contract revisions
Baseline: `openapi/openapi.yaml`, task 01, 2026-11-01. It adds the following to the brief on purpose. No revisions since.

| Date | Addition to the brief | Reason |
|---|---|---|
| 2026-11-01 | Required `source` field on the 200 body, only value `"fixture"` | The brief asks for the response to be labelled as a fixture. A field lets a client check it without reading text. |
| 2026-11-01 | `code` on errors, enum `validation_error`, `service_unavailable` | The brief asks for useful errors. A code lets a client tell failures apart without matching message text. |
| 2026-11-01 | `retryable` boolean on errors | Tells the client whether to offer Retry: `true` on 503, `false` on 422 (shown in the examples). |
| 2026-11-01 | `scenario` is optional, default `success` | The brief lists `{message, scenario}` without saying whether `scenario` is required. A traveller's request should not need a demo control. |
| 2026-11-01 | 422 status for invalid requests, with the shared `ErrorResponse` shape in place of FastAPI's default | The brief asks for validation but names no status. One error shape means one code path in the client. |
| 2026-11-01 | `GET /health` returning `{status: "ok"}` | `scripts/serve.sh` waits on it. |
| 2026-11-01 | `message` must be non-blank (`minLength: 1` and `pattern: "\\S"`), with `maxLength: 500` | `minLength` alone lets `"   "` through. The brief sets no length limit, and 500 gives a limit to test. |
| 2026-11-01 | `additionalProperties: false` on request and response schemas | Unknown fields are rejected, so drift from the contract shows up in checks. |
| 2026-11-01 | The short delay applies to all three scenarios | The brief requires it only for `success`. Applying it to all makes the loading state visible for `empty` and `error` too. |
