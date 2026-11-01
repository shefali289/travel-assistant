# 03 · Search: request form, demo control, loading
**Outcome:** A traveller can type a request, choose a demo scenario, submit, and see progress while the API responds. The typed client turns every API outcome into data the UI can render.
**Brief criteria:** accept the message, non-empty validation (UI), show progress, scenario demo control, keyboard access.
**Depends on:** 01 (types mirror the contract) · **Verified by:** tests + probe (journey `search`)

## 1. Plan
Run `/plan 03-search`.

Plan: _TBD_

Questions:
- Q: Is the demo scenario control visible to travellers, or hidden behind a query param? (Recommendation: visible, but in a clearly labelled "Demo control" box. The brief asks for it to be documented as a demo control.)
  A:
- Q: Should the request field be prefilled with the Wellington example? (Recommendation: yes. It speeds up the demo, and the probe expects it.)
  A:
- Q: How should a network failure (API down) differ from a 503? (Recommendation: same retryable error UI, but with its own message: "We could not reach the recommendation service...")
  A:

## 2. Spec: acceptance criteria (put the AC id in each test title, e.g. `it("AC3.4 blocks a blank message", ...)`)
Client (`web/lib/api.ts`, test `web/lib/api.test.ts`, mock boundary **`fetch`**):
- **AC3.1** `fetchRecommendations({message, scenario})` POSTs JSON to `${NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/recommendations` and returns the typed body on 200.
- **AC3.2** Non-2xx with an `ErrorResponse` body → throws `ApiError {message, status, retryable}` using the server's message and `retryable`.
- **AC3.3** Network failure → `ApiError(status: null, retryable: true)` with a friendly message. A non-JSON error body → `ApiError(retryable: true)` with a generic message.

Component (`web/components/HotelAssistant.tsx`, mock boundary **the `@/lib/api` module**):
- **AC3.4** A textbox labelled **Your request** is prefilled with the Wellington example. A blank or whitespace-only submit shows inline "Please describe the hotel you need.", sets `aria-invalid`, and sends **no** request.
- **AC3.5** A select labelled **Demo scenario** with options `success`, `empty`, `error` (default success), plus visible "Demo control: ..." hint text linked with `aria-describedby`.
- **AC3.6** Submit sends the trimmed message and the chosen scenario.
- **AC3.7** While waiting: `role="status"` shows "Finding hotels for you…". The button reads "Finding hotels…" and is disabled with `aria-busy="true"`. Inputs are disabled. Everything is re-enabled afterwards.
- **AC3.8** Works by keyboard: Tab reaches the field, select and button in that order, Enter on the button submits, and the focus outline is visible.

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
-
