# 04 · Results: assistant message, hotel cards, empty and error states
**Outcome:** A traveller reviews the assistant's reply and one card per hotel. No results and API failure are both clear, and failure is recoverable without retyping.
**Brief criteria:** assistant message + cards (name, nightly price, currency, breakfast, explanation), fixture label, empty result, recoverable API failure.
**Depends on:** 03 · **Verified by:** tests + probe (journey `results`)

## 1. Plan
Run `/plan 04-results`.

Plan:
1. Add stubs so red fails on behaviour rather than imports: `web/lib/format.ts` (`formatPrice`) and `web/components/HotelCard.tsx`, plus fixtures in `web/components/test-utils.tsx`.
2. Red: write `web/lib/format.test.ts`, `web/components/HotelCard.test.tsx` and `web/components/HotelAssistant.results.test.tsx`, then save `evidence/04-results-red.txt`.
3. Green: implement `formatPrice` and `HotelCard` (accepts `children` for 05). In `HotelAssistant.tsx`, add the success, empty and error branches and keep the sent message for Retry. Results and the error sit outside the form, and the `aria-live` container is always mounted. Save `evidence/04-results-green.txt`.
4. Run `scripts/gate.sh 04-results`, then `/review 04-results`, triage, the final gate, and the task's one commit.

Questions:
- Q: How should price be formatted: `NZD 220`, or `$220.00` via Intl currency? (Recommendation: `NZD 220` plus "per night". The currency code is unambiguous and the brief lists currency as its own field. A non-whole price shows two decimals, `NZD 220.50`.)
  A: `NZD 220` plus "per night". A non-whole price shows two decimals. AC4.3 extended.
- Q: Does Retry resend the original scenario or the currently selected one? (Recommendation: the current one, so a demo can go error → switch to success → Retry. The message is the one originally sent, even if the field has since been edited, and the field is left as it is.)
  A: The current scenario and the message from the failed request. The field is left as it is. AC4.6 extended.
- Q: Should a non-retryable error (e.g. 422) show a Retry button? (Recommendation: no. Show the message only.)
  A: No. Message only. AC4.5 extended.
- Q: Where does focus go after Retry? The Retry button disappears once clicked. (Recommendation: Find hotels, the same as every other request. The existing effect already does this, a failed retry is one Tab away from the new Retry button, and 05's keyboard journey tabs from there to the cards.)
  A: Find hotels. AC4.6 extended.
- Q: How do screen reader users learn that results arrived? Focus returns to Find hotels and the status region empties, and a task 03 test requires it to be empty. (Recommendation: an always-mounted `aria-live="polite"` container around the assistant message. It reads the reply once and needs no change to the 03 test. Adds AC4.8.)
  A: An always-mounted `aria-live="polite"` container around the assistant message. AC4.8 added.
- Q: What should the empty text say? AC4.4 leaves "Try changing ..." open, and the API does not interpret the message, so changing the request alone never changes the outcome. (Recommendation: "No hotels to show. Try changing your request or the demo scenario.")
  A: "No hotels to show. Try changing your request or the demo scenario." AC4.4 updated.
- Q: Does the Fixture data label also show on an empty result? AC4.1 only says success, but the empty response is fixture data too and the brief says to label the response. (Recommendation: yes. Extends AC4.4.)
  A: Yes. AC4.4 extended.
- Q: What is the heading in AC4.1? (Recommendation: an `h2` reading "Assistant's reply", which suits both success and empty, with the cards' `h3`s under it.)
  A: An `h2` reading "Assistant's reply". AC4.1 and AC4.4 updated.
- Q: What happens to results or an error on screen when a blank submit is blocked? (Recommendation: they stay, because no new search started. Only the inline error is added. Extends AC4.7.)
  A: They stay. Only the inline error is added. AC4.7 extended.

## 2. Spec: acceptance criteria (mock boundary: the `@/lib/api` module; `HotelCard` is pure)
- **AC4.1** On success, the assistant message is shown under an `h2` reading **Assistant's reply**, with a visible **Fixture data** label.
- **AC4.2** A list labelled **Recommended hotels** has one `listitem` per hotel, in API order.
- **AC4.3** Each card shows the name as an `h3`, the price as `NZD 220` + "per night" (a non-whole price shows two decimals, `NZD 220.50`), "Breakfast included" or "Breakfast not included", and the explanation.
- **AC4.4** Empty: the assistant message under the same heading, the **Fixture data** label, "No hotels to show. Try changing your request or the demo scenario.", and no list.
- **AC4.5** Error: `role="alert"` containing the API message. If `retryable`, show a **Retry** button. If not, show the message only.
- **AC4.6** Retry resends the message from the failed request, even if the field has since been edited, with the current scenario, and leaves the field unchanged. Retry also clears the inline blank error and the field's invalid state. On success the alert disappears and cards show. Focus then returns to **Find hotels**.
- **AC4.7** A new search clears previous results or errors (no stale cards next to a new error). A blocked blank submit is not a new search: what is on screen stays, and only the inline error is added.
- **AC4.8** The assistant message renders inside an `aria-live="polite"` container that stays mounted across idle, loading and results, so screen readers hear the reply once it arrives. The `role="status"` region still empties after a search (AC3.7).

## 3. Implement (test-first)
1. **Red:** `web/components/HotelCard.test.tsx` (pure render) and `web/components/HotelAssistant.results.test.tsx`. Use shared fixtures in `web/components/test-utils.tsx`: the three hotels plus SUCCESS and EMPTY responses. Mind the `beforeEach` block-body gotcha in AGENTS.md. Save `evidence/04-results-red.txt`, then commit `test(04-results): ...`.
2. **Green:** `web/lib/format.ts` `formatPrice(amount, currency)`, a `HotelCard` component (accepts `children` for the Choose button in 05), and the success, empty and error branches in `HotelAssistant`. Save `evidence/04-results-green.txt`, then commit `feat(04-results): ...`.
3. Layout: cards in a `grid gap-4 md:grid-cols-3` (one column on mobile).

## 4. Verify
`scripts/gate.sh 04-results`. The Playwright `results` stage covers success, empty, and error → switch scenario → Retry → recovered, against the real API.

## 5. Review
Run `/review 04-results`. Push on:
- Is the error text the API's useful message, not a generic one?
- Is Retry reachable by keyboard, with visible focus?
- Colour contrast of the badges (e.g. green-900 on green-100).

## Definition of done
Gate passes. Screenshots `evidence/probe-results.png`, `probe-empty.png` and `probe-error.png` exist.

## Decisions & agent notes
- All plan recommendations accepted by the human. Scope changed: AC4.1, AC4.3, AC4.4, AC4.5, AC4.6 and AC4.7 were extended, and AC4.8 was added.
- Results and the error sit outside the form, because the form is capped at `max-w-2xl`, too narrow for three columns. Retry is a `type="button"` right after the alert text.
- One commit after the final gate, as `AGENTS.md` and `tasks/README.md` say. The per-phase `test(...)` and `feat(...)` commits in section 3 are out of date. Red and green are proven by the Status log and evidence files.
- The probe's fixture check (`journey.mjs:62`) passes without any label, because the demo hint already contains "fixture". The exact-text Vitest test is the real check for AC4.1. The probe stays as it is.
- Test notes from the 03 review: reject with a real `ApiError`, because a plain `Error` has no `retryable` and would hide Retry. Cover the stored success and error data, which task 03 stored but did not display.
- `web/lib/format.test.ts` is added to section 3's test list, to pin the two price formats.
- `HotelCard` renders the `<li>` itself, so its pure-render tests wrap it in a `<ul>`. It accepts `children` as section 3 says. No test covers `children` yet, because no AC does: task 05's Choose button will.
- `deferred()` is in `test-utils.tsx` for the new tests. The copy in `HotelAssistant.search.test.tsx` stays, because no existing test file was edited.
- The list has an explicit `role="list"`, because Tailwind's preflight removes the list style and Safari then stops announcing a list. Lint accepts it. Not checked in Safari or with VoiceOver.
- The `aria-live` container holds the heading, the Fixture data label, the message and the empty text, so an empty result is announced in full. Cards stay outside it, so the reply is read without the whole list. The container has no margin of its own and is not hidden when empty, because hiding a live region can stop it announcing. It empties while a new search runs, so an identical reply is announced again (pinned in an AC4.8 test).
- `role="alert"` is on the message paragraph only, and Retry is its sibling inside the red box, so the button is not read as part of the alert. AC4.5 asks for the alert to contain the message and does not place the button.
- The failed request's message is stored in the error state (`sentMessage`) rather than a ref, so Retry cannot read a message from any other request.
- Superseded at triage (see the last decision): if a blank submit is blocked and Retry is then pressed, the inline blank error stayed, because the field was still blank. Retry still ran.
- Badge colours are green-900 on green-100, slate-900 on slate-200 and amber-900 on amber-100. Contrast was not measured with a tool: `/review` should check it, as section 5 asks.
- One-off check, run with a throwaway script outside the repo against the real app (Chromium via Playwright) at 360px: after an error, focus is on Find hotels and Tab moves to Retry, which matches `:focus-visible` with a 2px solid outline. Enter on Retry recovers and focus returns to Find hotels. No horizontal overflow on the error or results screens, and the cards are in one column. The three-column layout at 1280px was checked by eye in `evidence/probe-results.png`.
- Red and green evidence have the local repo path and username replaced with `<repo>` and `<user>`, and colour codes removed, as in tasks 02 and 03. Nothing else in the output changed.
- No existing test was edited and `openapi/openapi.yaml` did not change. Screen reader behaviour of the live region and the alert is unverified: list it in `APPROACH.md` (task 06) unless the human tries it with NVDA.
- The gate writes `evidence/probe-results.png`, `probe-empty.png` and `probe-error.png` as untracked files. The Definition of done requires them, so they belong in this task's commit.
- Review verdict APPROVE with 1 MINOR and 3 NIT findings and one question (`reviews/04-results.md`). Contrast was measured: the lowest badge ratio is 8.13. Final gate held until the human triages them, because a pass moves this doc to `tasks/done/`.
- The human accepted every recommendation at triage. `search()` now clears the blank error, AC4.6 says so, and a new test pins it. New assertions pin the empty reply in the live region and Retry outside the alert. No existing assertion was weakened. The Error row of the UI contract in `AGENTS.md` now says Retry sits beside the alert. The repeated advice in the empty state stays as it is.
- The human did not report an NVDA run, so list this in `APPROACH.md` (task 06) as unverified unless that changes: focus moves to Find hotels 2.5-13.5 ms after the reply is inserted, so a screen reader may cut off the polite reply.

## Status log (updated automatically)
- 2026-11-02 00:26 UTC - on branch task/04-results
- 2026-11-02 00:26 UTC - next: plan (agent)
- 2026-11-02 00:28 UTC - next: answers (human)
- 2026-11-02 00:31 UTC - next: implement (agent)
- 2026-11-02 00:35 UTC - red: 27 tests fail for the right reason (evidence/04-results-red.txt)
- 2026-11-02 00:36 UTC - green: all tests pass (evidence/04-results-green.txt)
- 2026-11-02 00:38 UTC - gate FAILED [REVIEW] 25 passed, 1 failed: no review: run /review 04-results (writes reviews/04-results.md)
- 2026-11-02 00:40 UTC - next: review (agent)
- 2026-11-02 00:58 UTC - next: gate (agent)
- 2026-11-02 01:28 UTC - fixes after triage: blank error cleared on Retry, tests added, evidence/04-results-green.txt refreshed
- 2026-11-02 01:31 UTC - gate PASSED (27 checks)
- 2026-11-02 01:32 UTC - next: commit-done (human)
