# 04 · Results: assistant message, hotel cards, empty and error states
**Outcome:** A traveller reviews the assistant's reply and one card per hotel. No results and API failure are both clear, and failure is recoverable without retyping.
**Brief criteria:** assistant message + cards (name, nightly price, currency, breakfast, explanation), fixture label, empty result, recoverable API failure.
**Depends on:** 03 · **Verified by:** tests + probe (journey `results`)

## 1. Plan
Run `/plan 04-results`.

Plan: _TBD_

Questions:
- Q: How should price be formatted: `NZD 220`, or `$220.00` via Intl currency? (Recommendation: `NZD 220` plus "per night". The currency code is unambiguous and the brief lists currency as its own field.)
  A:
- Q: Does Retry resend the original scenario or the currently selected one? (Recommendation: the current one, so a demo can go error → switch to success → Retry. The message is the one originally sent.)
  A:
- Q: Should a non-retryable error (e.g. 422) show a Retry button? (Recommendation: no. Show the message only.)
  A:

## 2. Spec: acceptance criteria (mock boundary: the `@/lib/api` module; `HotelCard` is pure)
- **AC4.1** On success, the assistant message is shown under a heading, with a visible **Fixture data** label.
- **AC4.2** A list labelled **Recommended hotels** has one `listitem` per hotel, in API order.
- **AC4.3** Each card shows the name as an `h3`, the price as `NZD 220` + "per night", "Breakfast included" or "Breakfast not included", and the explanation.
- **AC4.4** Empty: the assistant message plus "No hotels to show. Try changing ...", and no list.
- **AC4.5** Error: `role="alert"` containing the API message. If `retryable`, show a **Retry** button.
- **AC4.6** Retry resends the original message with the current scenario. On success the alert disappears and cards show.
- **AC4.7** A new search clears previous results or errors (no stale cards next to a new error).

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
-
