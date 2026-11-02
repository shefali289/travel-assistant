# Review: 03-search
Reviewer: AI agent (/review), triaged by: human
Diff: df92d01..working tree (uncommitted), including untracked `web/lib/`, `web/components/` and `evidence/`

## Spec compliance
The reviewer's checks came from throwaway scripts outside the repo. "Live" means the real app and API on spare ports, driven by Playwright in Chromium. "Mutation" means changing a temporary copy of `web/` and running the Vitest suite against it. `npm test` (33 passed), typecheck and lint were re-run and are clean. `scripts/gate.sh` was not run, because the review must not change the Status log or move the task doc. Its results are the implementer's (`evidence/03-search-probe.txt`), and the live run covers the same behaviour independently.

| AC | Met? | Evidence (test / probe / file:line) |
|---|---|---|
| AC3.1 | yes | `web/lib/api.ts:44-52`, `:63`. Two `AC3.1` tests check the URL, method, header, body and returned value. Live: `success` sends the expected JSON and gets a 200. |
| AC3.2 | yes | `web/lib/api.ts:59`. `AC3.2` tests cover a 503 with `retryable: true` and a 422 with `retryable: false`. Mutation hardcoding `retryable` was caught. See the second finding for a body with an unknown `code`. |
| AC3.3 | yes, with one reading to confirm | `web/lib/api.ts:54`, `:60`, `:62`. 14 `AC3.3` test cases. Mutations on the retryable flag and the 200 check were caught. A non-2xx body with an unknown `code` is the open reading (second finding). The generic text is not pinned (third finding). |
| AC3.4 | yes | `web/components/HotelAssistant.tsx:45-49`, `:72-84`. `AC3.4` tests, including `expect(fetchMock).not.toHaveBeenCalled()`. Mutations on trim, focus, `aria-describedby` and clearing were caught. Live: settled accessibility tree has description "Please describe the hotel you need.", invalid and focused. See the question on focus timing. |
| AC3.5 | yes | `web/components/HotelAssistant.tsx:86-108`. Two `AC3.5` tests. Live: all three options work. |
| AC3.6 | yes | `web/components/HotelAssistant.tsx:53`. `AC3.6` test. Mutation removing the trim was caught. |
| AC3.7 | yes in the real app, but the focus part is not protected by a test | `web/components/HotelAssistant.tsx:37-40`, `:51`, `:71`, `:93`, `:113-122`. `AC3.7` tests. Live: after `success`, `empty`, `error` and a refused connection, the status is empty, inputs are enabled and focus is on the button. The first finding explains the test gap. |
| AC3.8 | yes | `AC3.8` tests for order and Enter. Live: Tab reached the field, select and button in order, and each matched `:focus-visible` with a solid 2px outline. This confirms the field and select outlines, which `evidence/03-search-focus.png` does not show. |

Task section 5:
- **Do tests query by role or label?** Yes, with one exception (see the NIT at `HotelAssistant.search.test.tsx:81`).
- **Is the status region always mounted?** Yes (`HotelAssistant.tsx:120-122`). `AC3.7 keeps the status region mounted...` checks element identity, and a mutation unmounting it was caught.
- **Does the "no request on blank" test assert the mock was not called?** Yes (`HotelAssistant.search.test.tsx:59`). A real-browser check also exists (probe: "blank message sends no request").

Brief and UI contract: the accessible names, button text, `aria-busy`, status text and "Demo control" text match `AGENTS.md`. Live at 360px with the blank error showing: no horizontal overflow and a full-width button (328px). `evidence/03-search-red.txt` shows 32 failures on missing behaviour. No personal data or secrets in the new files or evidence text. The `journey.mjs` change is the approved path fix only.

## Findings
No BLOCKER or MAJOR. No defect a traveller would see was found.

- [x] MINOR (fixed: the test moves focus to a second button before settling): `web/components/HotelAssistant.search.test.tsx:146-161` The focus assertion in `AC3.7 re-enables everything and returns focus...` cannot fail. Removing the focus line at `HotelAssistant.tsx:38` left all 33 tests passing. jsdom keeps focus on a button when it is disabled, but Chromium does not: a direct check showed `document.activeElement` become `BODY` on disable and stay there after re-enabling. So the effect is needed, and if it were removed keyboard users would lose their place while the suite and probe stayed green. This clause was added to AC3.7 by the human during planning. Fix: render a second button next to the component and move focus to it before settling, for example `render(<><button>Elsewhere</button><HotelAssistant /></>)` then `act(() => screen.getByRole("button", { name: "Elsewhere" }).focus())`. Checked on a temporary copy: this passes against the real component and fails both cases with the focus line removed. Calling `blur()` on the disabled button instead was tried and does not catch the removal.
- [x] MINOR (accepted: the human kept the loose check, AC3.2 now says so, and `AC3.2 keeps the server's message and retryable when the code is outside the contract's enum` pins it): `web/lib/api.ts:25` (decision: loose `ErrorResponse` check) A non-2xx body such as `{code: "x", message: "...", retryable: false}` gets the server's message and `retryable: false`. The contract's `code` is an enum (`openapi/openapi.yaml:197-201`), so that body is not an `ErrorResponse`, and read literally AC3.3 requires the generic retryable error. The behaviour is also untested: every `code: "x"` case at `web/lib/api.test.ts:109-120` has a second defect, and a mutation to a strict enum check survived. It cannot happen with the current API, and the client does not use `code` beyond this check. Being loose is reasonable: the contract says `message` can be shown to the traveller, and it is simpler. Recommendation: keep it loose, confirm this reading of AC3.3, and add one test case that pins it. This needs a human decision (see below). The type guard claims more than it checks, which is harmless here because `code` is never read.
- [x] MINOR (fixed: the `AC3.3` table test asserts the exact string): `web/lib/api.test.ts:132` (decision: generic error text) The wording is good: it is honest, tells the traveller what to do, leaks no server text and differs from the network message. But it is not pinned. A mutation to "Oops, try again." survived, because the test only looks for "try again". Task 02's review raised the same gap for the 422 texts, and the human chose to fix it. The AC leaving the wording open was the reason for the loose test, but the wording is now decided under Decisions. Fix: assert the exact string in the `AC3.3` table test, keeping the existing assertions. Generic errors always being retryable is what AC3.3 says, even for a 404 where retrying will not help. This is accepted behaviour, not a finding.
- [x] NIT (accepted without a change: the client can only throw `ApiError` today): `web/components/HotelAssistant.tsx:57` (decision: casting caught errors to `ApiError`) The stated reason holds. Reading `web/lib/api.ts`, `fetch` and `JSON.stringify` are inside the `try`, `readJson` catches its own errors and the guards cannot throw, so the cast cannot be wrong today. The decision compares it only with a rethrow, and there is a third option: `error instanceof ApiError ? error : new ApiError(...)`. That would need the generic message exported, and would guard against a path that does not exist. Recommendation: accept the cast as it is. If `fetchRecommendations` gains another way to throw, change it then. Until then, task 04's tests must reject with a real `ApiError`, because a plain `Error` would have no `retryable` and would hide the Retry button.
- [x] NIT (fixed: uses `within(scenario()).getAllByRole`): `web/components/HotelAssistant.search.test.tsx:81` The options are read with `querySelectorAll` and `option.value`, while section 5 asks for role or label queries. Fix: `within(scenario()).getAllByRole("option")`. Recommendation: fix it, as it is a one-line change.

Question for the human (answered at triage: no code change, listed as unverified in `APPROACH.md` unless tried with NVDA):
- `web/components/HotelAssistant.tsx:46-47` Focus moves to the field before React renders the error. Live: at the focus event, `aria-invalid` and `aria-describedby` are both absent. They are present immediately afterwards, and Chromium's accessibility tree is correct once settled. Both happen within one browser event, so a screen reader may well read the final state, but no screen reader was run. There is no `role="alert"` on this text, so the focus announcement is the only way a screen reader user learns of the error. If it is not read out, the fix is to move the focus into an effect that runs after `blankError` becomes true. Recommendation: try the blank submit once with NVDA during the manual keyboard checks. If that is not possible, list it as unverified in `APPROACH.md`. No code change for now.

Notes, not findings:
- Three other mutations survived for accepted reasons. Dropping the stored `success` data or `error` is not visible until task 04 renders them, so task 04's tests must cover both. Removing `event.preventDefault()` passes Vitest because jsdom does not navigate. The probe's blank-message check should catch it, but that mutation was not run against the probe.
- For task 04: the effect at `HotelAssistant.tsx:37-40` runs after every request, so after Retry focus will go to **Find hotels**. Task 04 should decide whether that is what it wants.
- Live: a 501-character message gets a 422 and the UI shows nothing yet. This is the planned behaviour until task 04 renders errors.

## Checks
- Correctness vs spec and OpenAPI: met, apart from the AC3.3 reading in the second finding. Hotel fields and `source` are not validated, as the plan answer says.
- Tests: carry AC ids, cover failure paths, mock at the agreed boundaries, and nothing was weakened. 15 of 21 mutations were caught. The gaps are the first three findings and the notes above.
- Accessibility: labels, status region, focus, keyboard order and outlines are good in Chromium. Screen reader behaviour is unverified (see the question). Colours were judged from the Tailwind palette and screenshots, not measured.
- Security/hygiene: no secrets or personal data. `tasks/03-search.md` and the evidence text have no local paths. `.env.example` holds placeholders only and did not change.
- Simplicity: small. The only additions beyond the spec are the `ErrorResponse` type and the plan's extra AC cases.

## Re-review after triage
Done by the session that made the fixes, not by a separate reviewer. Only test files changed, plus the agreed deletion of `web/app/sanity.test.ts` and the AC3.2 wording. `npm test` (33 passed), typecheck and lint are clean. Three of the mutations that survived the first review were repeated on the working tree, which was then restored and compared with a backup:
- Removing the focus line at `HotelAssistant.tsx:38`: both `AC3.7` focus cases fail.
- Changing the generic text to "Oops, try again.": 13 `AC3.3` cases fail.
- A strict enum check on `code`: the new `AC3.2` test fails.

Verdict: APPROVE
