# 03 · Search: request form, demo control, loading
**Outcome:** A traveller can type a request, choose a demo scenario, submit, and see progress while the API responds. The typed client turns every API outcome into data the UI can render.
**Brief criteria:** accept the message, non-empty validation (UI), show progress, scenario demo control, keyboard access.
**Depends on:** 01 (types mirror the contract) · **Verified by:** tests + probe (journey `search`)

## 1. Plan
Run `/plan 03-search`.

Plan:
1. Fix the output path in `scripts/probes/journey.mjs` with `fileURLToPath`, changing no checks, so the gate can run on Windows.
2. Add `web/lib/types.ts` (including `ErrorResponse`), plus stub exports in `web/lib/api.ts` and `web/components/HotelAssistant.tsx`, so red fails on behaviour rather than imports.
3. Red: write `web/lib/api.test.ts` and `web/components/HotelAssistant.search.test.tsx`, then save `evidence/03-search-red.txt`.
4. Green: implement the client, the component and `web/app/page.tsx`, with Tailwind for 360px and `focus-visible`, then save `evidence/03-search-green.txt`.
5. Run the one-off Playwright focus check (saved as `evidence/03-search-focus.png`), then `scripts/gate.sh 03-search`, then `/review 03-search`.

Questions:
- Q: Is the demo scenario control visible to travellers, or hidden behind a query param? (Recommendation: visible, but in a clearly labelled "Demo control" box. The brief asks for it to be documented as a demo control.)
  A: Visible, in a box labelled "Demo control".
- Q: Should the request field be prefilled with the Wellington example? (Recommendation: yes. It speeds up the demo, and the probe expects it.)
  A: Yes, with the brief's exact sentence.
- Q: How should a network failure (API down) differ from a 503? (Recommendation: same retryable error UI, but with its own message: "We could not reach the recommendation service...")
  A: Same retryable error UI, with the message "We could not reach the recommendation service. Please try again."
- Q: `scripts/probes/journey.mjs:11` crashes on Windows before any check runs. Can it be fixed, given the probe belongs to the harness? (Recommendation: yes, use `fileURLToPath`, a one-line change that leaves every check as it is.)
  A: Yes. Change the path only, and leave every check as it is.
- Q: Should the field be a `<textarea>` or an `<input>`? (Recommendation: a 3-row `<textarea>`, so the example stays readable at 360px.)
  A: A 3-row `<textarea>`. Enter adds a new line, and only the button submits.
- Q: What should a blank submit do beyond showing the error? (Recommendation: move focus to the field, link the error with `aria-describedby`, and clear the error once the traveller types.)
  A: As recommended. AC3.4 extended.
- Q: Where should focus go after loading? (Recommendation: back to the submit button, because disabling a focused button can drop focus.)
  A: Back to the submit button. AC3.7 extended.
- Q: How should the "focus outline is visible" part of AC3.8 be checked, given jsdom cannot evaluate `focus-visible`? (Recommendation: a one-off Playwright run against the real app, with a saved screenshot.)
  A: One-off Playwright run, saved as `evidence/03-search-focus.png` and noted for the manual keyboard checks in APPROACH. AC3.8 updated.
- Q: What should happen with a message over 500 characters? (Recommendation: no client-side check. The API's 422 message is shown by task 04's non-retryable error UI.)
  A: No client-side check and no `maxLength` attribute. The API's 422 message is shown by task 04.
- Q: How should unexpected response bodies be handled? (Recommendation: the same generic retryable `ApiError` as a non-JSON error body, with no per-hotel validation.)
  A: As recommended, for a non-2xx JSON body that is not an `ErrorResponse`, a 200 that is not JSON, and a 200 without a `message` string and `hotels` array. AC3.3 extended.
- Q: Should requests time out? (Recommendation: no. The API is local with a short fixed delay.)
  A: No timeout. Listed as a limitation in APPROACH, because a hung API would leave the progress message up indefinitely.

## 2. Spec: acceptance criteria (put the AC id in each test title, e.g. `it("AC3.4 blocks a blank message", ...)`)
Client (`web/lib/api.ts`, test `web/lib/api.test.ts`, mock boundary **`fetch`**):
- **AC3.1** `fetchRecommendations({message, scenario})` POSTs JSON to `${NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/recommendations` and returns the typed body on 200.
- **AC3.2** Non-2xx with an `ErrorResponse` body → throws `ApiError {message, status, retryable}` using the server's message and `retryable`. A `code` outside the contract's enum still counts as an `ErrorResponse` body, as long as it is a string.
- **AC3.3** Network failure → `ApiError(status: null, retryable: true)` with a friendly message. A non-JSON error body, a non-2xx JSON body that is not an `ErrorResponse`, a 200 that is not JSON, or a 200 without a `message` string and `hotels` array → `ApiError(retryable: true)` with a generic message. The network failure message is "We could not reach the recommendation service. Please try again."

Component (`web/components/HotelAssistant.tsx`, mock boundary **the `@/lib/api` module**):
- **AC3.4** A textbox labelled **Your request** is prefilled with the Wellington example. A blank or whitespace-only submit shows inline "Please describe the hotel you need.", sets `aria-invalid`, links the error with `aria-describedby`, moves focus to the field, and sends **no** request. The error clears once the traveller types.
- **AC3.5** A select labelled **Demo scenario** with options `success`, `empty`, `error` (default success), plus visible "Demo control: ..." hint text linked with `aria-describedby`.
- **AC3.6** Submit sends the trimmed message and the chosen scenario.
- **AC3.7** While waiting: `role="status"` shows "Finding hotels for you…". The button reads "Finding hotels…" and is disabled with `aria-busy="true"`. Inputs are disabled. Everything is re-enabled afterwards, and focus returns to the submit button.
- **AC3.8** Works by keyboard: Tab reaches the field, select and button in that order, Enter on the button submits, and the focus outline is visible. Vitest covers the order and Enter. The outline is checked by a one-off Playwright run against the real app, because jsdom cannot evaluate `focus-visible` (`evidence/03-search-focus.png`).

Out of scope here: rendering results, empty and error UI (task 04).

## 3. Implement (test-first)
1. `web/lib/types.ts`: `Scenario`, `Hotel`, `RecommendationRequest`, `RecommendationResponse`, mirroring the YAML.
2. **Red:** write `web/lib/api.test.ts` (stub `fetch` with `vi.stubGlobal`) and `web/components/HotelAssistant.search.test.tsx` (`vi.mock("@/lib/api", ...)` keeping the real `ApiError`, plus a deferred promise to hold the loading state). Use stub exports so the tests fail on behaviour, not imports. `npm test 2>&1 | tee ../evidence/03-search-red.txt`. Commit `test(03-search): ...`.
3. **Green:** implement the client, then a `"use client"` component with a `useState` discriminated union `idle | loading | success | error`. Render it from `web/app/page.tsx` inside `<main>` with an `<h1>`. `npm test 2>&1 | tee ../evidence/03-search-green.txt`. Commit `feat(03-search): ...`.
4. Tailwind: single column, full-width button under `sm`, and `focus-visible:outline` on every control.

## 4. Verify
`scripts/gate.sh 03-search`. This starts both servers and runs the Playwright `search` stage against the real app.

## 5. Review
Run `/review 03-search`. Push on:
- Are tests querying by role or label (what a user perceives), not by class or test id?
- Is the status region always mounted (so screen readers announce changes) with only its content changing?
- Does the "no request on blank" test actually assert the mock was not called?

## Definition of done
Gate passes. The red run fails for the right reason.

## Decisions & agent notes
- All plan recommendations accepted by the human. Scope changed: AC3.3, AC3.4, AC3.7 and AC3.8 were extended.
- `scripts/probes/journey.mjs:11` builds its output folder from `URL.pathname`, and `mkdirSync` fails on Windows with `ENOENT` (`C:\C:\Users\...`). Reproduced with the same path and call. This blocks the gate for tasks 03-06 until fixed. The human approved a path-only fix with `fileURLToPath`, which changes no checks.
- One commit after the final gate, as `AGENTS.md` and `tasks/README.md` say. The per-phase `test(...)` and `feat(...)` commits in section 3 of this doc are out of date. Red and green are proven by the Status log and evidence files.
- In this task the UI stores the API outcome, clears the status message and re-enables the form, but shows nothing else. Showing results and errors is task 04.
- The status region stays mounted and only its content changes, so screen readers announce updates.
- The field has no `required` attribute, so a blank submit reaches the app's own error message rather than the browser's.
- `web/lib/types.ts` also gets `ErrorResponse`, which section 3 leaves out but the client needs.
- The `journey.mjs` fix is line 11 plus the `fileURLToPath` import it needs. No check changed.
- Red and green evidence have the local repo path and username replaced with `<repo>` and `<user>`, and colour codes removed, as in task 02. Nothing else in the output changed.
- The red stub keeps the real `ApiError` class, because the component tests need it and it holds no behaviour. Only `fetchRecommendations` and the component are stubs.
- Generic message, which the AC leaves open: "Something went wrong while finding hotels. Please try again." Generic errors keep the response's status, so a malformed 200 has `status: 200`.
- A body counts as an `ErrorResponse` when `code` and `message` are strings and `retryable` is a boolean. `code` is not checked against the enum, so a new server code still shows the server's message.
- The 200 check covers only the `message` string and `hotels` array, as AC3.3 says. `source` and the hotel fields are not validated. Any other 2xx goes through the same check.
- AC3.3 tests assert the generic text mentions "try again", differs from the network message and leaks no server text, because the AC gives no exact wording.
- Added to AC3.8's tests from the plan answer on the `<textarea>`: Enter in the field adds a new line and does not submit.
- The component casts its caught error to `ApiError` instead of rethrowing others, because a rethrow would leave the form stuck in loading. `fetchRecommendations` only throws `ApiError`.
- `app/sanity.test.ts` says to delete it once real tests exist. It stays, because this task does not ask for it and `AGENTS.md` says not to delete tests without the human agreeing. So the suite has 33 tests: 32 for this task and 1 sanity test.
- One-off focus check, run with a throwaway script outside the repo against the real app (Chromium via Playwright): Tab reached the field, select and button in order. Each matched `:focus-visible` with a 2px solid outline. Enter submitted, focus returned to the button, and there was no horizontal overflow at 360px. `evidence/03-search-focus.png` shows the button focused. The field and select outlines were checked by computed style and by eye in screenshots that were not kept.
- The screenshot shows Next's dev tools badge in the corner, which comes from `next dev` and not from the app.
- The gate writes `evidence/probe-search-loading.png`, so it appears as untracked and belongs in this task's commit if the evidence is kept.
- Review verdict APPROVE with 3 MINOR and 2 NIT findings (`reviews/03-search.md`). The human accepted every recommendation at triage: fix the focus test, the generic text test and the option query, and accept the `ApiError` cast.
- The human chose to keep the loose `ErrorResponse` check, so a string `code` outside the enum keeps the server's message. AC3.2 now says so, and one new test pins it.
- The human agreed to change the AC3.7 focus test, which could not fail in jsdom, and to delete `web/app/sanity.test.ts`, whose own comment says to delete it once real tests exist. Neither weakens coverage.
- The human chose to keep `evidence/probe-search-loading.png` in this task's commit.
- Screen reader behaviour on a blank submit is unverified: focus moves to the field before the error renders, and the error has no `role="alert"`. No code change. List it as unverified in `APPROACH.md` (task 06) unless the human tries it with NVDA.
- Final gate held until triage, although the Stop hook asked for it, because `tasks/README.md` says the chain stops at review triage and a pass moves this doc to `tasks/done/`. Task 01 did the same.
- For task 04: tests must reject with a real `ApiError`, because a plain `Error` would hide the Retry button. Tests must also cover the stored success and error data, which nothing displays yet. Decide where focus goes after Retry, because it currently returns to **Find hotels**.

## Status log (updated automatically)
- 2026-11-01 08:38 UTC - on branch task/03-search
- 2026-11-01 08:38 UTC - next: plan (agent)
- 2026-11-01 08:41 UTC - next: answers (human)
- 2026-11-01 08:44 UTC - next: implement (agent)
- 2026-11-01 08:46 UTC - red: 32 tests fail for the right reason (evidence/03-search-red.txt)
- 2026-11-01 08:49 UTC - green: all tests pass (evidence/03-search-green.txt)
- 2026-11-01 08:52 UTC - gate FAILED [REVIEW] 25 passed, 1 failed: no review: run /review 03-search (writes reviews/03-search.md)
- 2026-11-01 08:54 UTC - next: review (agent)
- 2026-11-01 09:08 UTC - next: gate (agent)
- 2026-11-01 22:35 UTC - fixes after triage: tests only, sanity test deleted, evidence/03-search-green.txt refreshed
- 2026-11-01 22:37 UTC - gate PASSED (27 checks)
- 2026-11-01 22:38 UTC - next: commit-done (human)
