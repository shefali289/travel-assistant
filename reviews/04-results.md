# Review: 04-results
Reviewer: AI agent (/review), triaged by: human
Diff: 65fcb07..working tree (uncommitted), including untracked `web/components/`, `web/lib/format*` and `evidence/`

## Spec compliance
The reviewer's checks came from throwaway scripts outside the repo. "Live" means the real app and API on spare ports, driven by Playwright in Chromium. "Mutation" means changing a temporary copy of `web/` and running the Vitest suite against it. `npm test` (60 passed), typecheck and lint were re-run and are clean. The `results` probe was re-run from a scratch copy against the live app, so the committed-to-be screenshots were not overwritten: 17 checks, 0 failures. `scripts/gate.sh` was not run, because the review must not change the Status log or move the task doc. `pytest` was not re-run, because `git diff main` shows no change under `api/` or `openapi/`.

| AC | Met? | Evidence (test / probe / file:line) |
|---|---|---|
| AC4.1 | yes | `web/components/HotelAssistant.tsx:136-140`. Two `AC4.1` tests, with an exact-text label check. Mutations on the heading level and the label were caught. Live: heading and label in the accessibility tree. |
| AC4.2 | yes | `HotelAssistant.tsx:150-154`. `AC4.2 lists one listitem per hotel in API order`. Mutations reversing the order and changing the label were caught. Probe: list and three cards. |
| AC4.3 | yes | `web/components/HotelCard.tsx:12-25`, `web/lib/format.ts:2`. `AC4.3` tests in three files. Mutations on the breakfast text, decimals and `h3` were caught. |
| AC4.4 | yes | `HotelAssistant.tsx:141-143`. `AC4.4` test. Mutation removing the text was caught. Probe: empty text and no cards. |
| AC4.5 | yes | `HotelAssistant.tsx:159-170`. Two `AC4.5` tests. Mutations on `role`, the message and the `retryable` check were caught. Live: the 503 text equals the API's `message`, a real 422 shows its message with no Retry, and a network failure shows the network message with Retry. |
| AC4.6 | yes | `HotelAssistant.tsx:56-65`, `:165`. Four `AC4.6` tests. Mutations using the field, clearing the field, storing the wrong `sentMessage` and removing the focus effect were caught. Live: focus returns to Find hotels, and Tab from there reaches Retry after a failed retry. |
| AC4.7 | yes | `HotelAssistant.tsx:35`, `:46-50`. Five `AC4.7` tests. Mutations keeping cards during loading and clearing results on a blank submit were caught. See the first finding for the stale blank error. |
| AC4.8 | yes | `HotelAssistant.tsx:133-146`. Three `AC4.8` tests with element identity. Mutations removing it, making it assertive and remounting it were caught. Live: Chromium exposes `live=polite atomic=false`, and a second identical reply is inserted again. Actual speech is unverified (see the question). |

Task section 5:
- **Is the error text the API's useful message?** Yes. Live: exact match with the API's 503 `message`, and the real 422 text is shown.
- **Is Retry reachable by keyboard, with visible focus?** Yes. Live: next Tab stop after Find hotels, matches `:focus-visible`, solid 2px outline with 2px offset, and Space and Enter both work. A double click sends one request.
- **Badge contrast?** Measured, and all pass WCAG AAA (table below).

Layout, live: no horizontal overflow at 360, 767, 768 or 1280px on the results or error screens. One column at 360 and 767px, three at 768 and 1280px, as `md:grid-cols-3` should give. At 360x800 the alert is on screen without scrolling (top 510px, bottom 558px).

### Contrast, measured
Tailwind 4 gives `oklch()` colours. Each pair was read with `getComputedStyle` in the live app and converted to sRGB by the browser's canvas. The same ratio was then found independently from screenshot pixels at 4x scale, where the most common colour is the background and the furthest from it is the text. The two methods agree on every row that has both. The ratio is the WCAG 2.x formula.

| Pair | Foreground | Background | Ratio | Needs |
|---|---|---|---|---|
| Fixture data badge, 14px/500 (amber-900 on amber-100) | `#7b3306` | `#fef3c6` | 8.13 | 4.5 |
| Breakfast included, 14px/500 (green-900 on green-100) | `#0d542b` | `#dbfce7` | 8.23 | 4.5 |
| Breakfast not included, 14px/500 (slate-900 on slate-200) | `#0f172b` | `#e2e8f0` | 14.46 | 4.5 |
| Alert text (red-900 on red-50) | `#82181a` | `#fef2f2` | 9.16 | 4.5 |
| Retry (white on blue-700) | `#ffffff` | `#1447e6` | 6.83 | 4.5 |
| Retry on hover (white on blue-800), computed only | `#ffffff` | `#193cb8` | 8.82 | 4.5 |
| Retry focus ring on the red-50 box, computed only | `#1447e6` | `#fef2f2` | 6.25 | 3 |
| Explanation (slate-800 on white) | `#1d293d` | `#ffffff` | 14.62 | 4.5 |
| Heading, message and empty text on the page (slate-900 on slate-50) | `#0f172b` | `#f8fafc` | 17.04 | 4.5 |
| `h3` on a card (slate-900 on white) | `#0f172b` | `#ffffff` | 17.83 | 4.5 |

## Findings
No BLOCKER or MAJOR.

- [x] MINOR (fixed: `search()` clears the blank error, AC4.6 says so, and a new `AC4.6` test pins it): `web/components/HotelAssistant.tsx:56-57` (decision: the blank error stays while Retry runs) Reproduced live: after an error, clear the field, press Find hotels (blocked), then press Retry. While Retry runs and after it succeeds, "Please describe the hotel you need." stays on screen above the new cards, and the field keeps `aria-invalid="true"` and its `aria-describedby`. The traveller sees a red error next to a successful result, about a request they did not make. The decision says no AC pins this, but AC4.7's "a new search clears previous results or errors" can be read to cover it. Fix: call `setBlankError(false)` at the top of `search()`, say so in AC4.6, and add one test. The submit path cannot be affected, because it only reaches `search()` with a non-blank field, where `onChange` has already cleared the flag. Checked on a temporary copy: a candidate test fails against the current code, and with the one line added all 61 tests pass, including both `AC4.7` blocked-submit tests. The field stays blank with no error until the next submit, which is correct because validation runs on submit. Recommendation: fix it. Extending the AC needs a human decision.
- [x] NIT (fixed: a new `AC4.8` test uses `EMPTY`): `web/components/HotelAssistant.results.test.tsx:296-338` (decision: what the live container holds) AC4.8's tests use only `SUCCESS`, so nothing pins the empty reply. A mutation moving the empty text out of the container left all 60 tests passing. Fix: one `AC4.8` test with `EMPTY` that finds the message and the empty text inside the region. Recommendation: fix it, as it is the behaviour the decision gives as its reason.
- [x] NIT (fixed: the retryable `AC4.5` test checks there is no button in the alert, and the `AGENTS.md` row is reworded): `web/components/HotelAssistant.results.test.tsx:112-122` (decision: `role="alert"` on the message only) Nothing pins Retry being outside the alert. A mutation making the whole red box the alert, with Retry inside, left all 60 tests passing. Fix: add `expect(within(screen.getByRole("alert")).queryByRole("button")).not.toBeInTheDocument()` to the retryable test. Also, the UI contract row in `AGENTS.md` ("`role="alert"` with the API message and a **Retry** button") can be read as Retry inside the alert. Reword it to "`role="alert"` with the API message, and a **Retry** button beside it". Recommendation: do both.
- [x] NIT (accepted without a change, as the human chose): `web/components/HotelAssistant.tsx:140-142` The real empty reply reads "I could not find any hotels for that request. Try changing your request." followed straight away by "No hotels to show. Try changing your request or the demo scenario." (`evidence/probe-empty.png`). The advice appears twice on screen and is read out twice. The test fixture has a different message, so the tests do not show this. The human chose this wording and AC4.4 and the probe need it. Recommendation: accept it without a change.

Question for the human (answered at triage: no code change, listed as unverified in `APPROACH.md` unless tried with NVDA):
- `web/components/HotelAssistant.tsx:38-41` Focus moves to Find hotels straight after the reply is inserted. Live: 13.5 ms later on the first search and 2.5 ms later on the second. A screen reader may announce the focus change and cut off or drop the polite reply, which is the whole purpose of AC4.8. The DOM and Chromium's accessibility tree are correct, but no screen reader was run, so this is a risk and not a defect. The alert goes through the same effect, though its timing was not measured. Recommendation: try success, empty and error once with NVDA during the manual keyboard checks. If the reply is lost, decide the fix then. If it cannot be tried, list this specific risk as unverified in `APPROACH.md`.

The points the implementer asked about:
- **`role="alert"` on the message only, with Retry beside it:** fits. AC4.5 asks for the alert to contain the message and only says to show the button. The probe looks for Retry on the whole page (`scripts/probes/journey.mjs:75`). It is also the better design, because an alert is announced as one piece of text and is not meant to hold controls. Live: the accessibility tree shows the alert holding only the message, with the button as its sibling. Keep it, with the NIT above.
- **The `aria-live` container holding the heading, label, message and empty text:** fits. AC4.8 requires the message inside a mounted polite container and does not limit what else is in it. Including the label means the fixture status is announced too, and keeping cards out avoids reading the whole list. Live: the reply is added as one batch, and the two nodes are removed when a search starts. Keep it, subject to the question above.
- **Explicit `role="list"`:** keep it. It costs one attribute, lint accepts it and the comment explains it. In Chromium the list has its role either way, so a mutation removing it survives, and the Safari reason could not be checked here. It rests on known WebKit behaviour, not on anything seen in this review. No test is worth adding, because jsdom cannot show the difference.

Notes, not findings:
- Removing `md:grid-cols-3` and dropping `children` from `HotelCard` both leave all tests passing. The column layout was checked live instead, and the decisions already say task 05 will cover `children`.
- The "Fixture data" label is fixed text and does not read `source`. The contract makes `source` a constant, so this cannot be wrong today.
- 20 of 20 AC mutations were caught. The decision mutations that survived are in the findings and notes above. A first version of the "Retry inside the alert" mutation was caught only because it added a second Retry button, so it was replaced by the version reported in the finding.
- `evidence/04-results-red.txt` shows 27 failures on missing behaviour (stub errors and absent elements), and 33 existing tests passing.

## Checks
- Correctness vs spec and OpenAPI: met. No contract change. The UI contract names, texts and roles match `AGENTS.md`, with the wording point in the second NIT.
- Tests: assert behaviour, carry AC ids, cover failure paths, reject with a real `ApiError` and mock at `@/lib/api`. No existing test was edited.
- Accessibility: roles, names, focus, keyboard and contrast are good in Chromium, and contrast was measured. Screen readers and Safari are unverified.
- Security/hygiene: the gate's secrets pattern finds nothing in tracked or untracked files. No local paths or usernames in the new text files, and the three screenshots show only the app.
- Simplicity: small. `search()` is shared by submit and Retry, and `sentMessage` lives in the error state, so there is no extra ref.

Not verified: NVDA, VoiceOver or any other screen reader; Safari or Firefox; the full `scripts/gate.sh` run for this review (the implementer's result is in the Status log).

## Re-review after triage
Done by the session that made the fixes, not by a separate reviewer. Changes: one line in `search()`, two new tests and one new assertion, the AC4.6 wording, and the Error row in `AGENTS.md`. Three mutations were run on the working tree, which was then restored and compared with a backup, and each failed exactly one test:
- Removing `setBlankError(false)` from `search()`: the new `AC4.6` test fails.
- Making the whole red box the alert: the retryable `AC4.5` test fails.
- Moving the empty text out of the live container: the new `AC4.8` test fails.

Verdict: APPROVE
