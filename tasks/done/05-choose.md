# 05 · Choose a hotel and see a summary
**Outcome:** A traveller selects exactly one hotel by mouse or keyboard and gets a clear, announced summary.
**Brief criteria:** select one hotel and show a clear summary, keyboard access.
**Depends on:** 04 · **Verified by:** tests + probe (journey `choose`)

## 1. Plan
Run `/plan 05-choose`.

Plan:
- `web/components/HotelAssistant.choose.test.tsx` first (red), using the fixtures in `test-utils.tsx` and mocking `@/lib/api`.
- `web/components/HotelCard.tsx`: add a `chosen` prop for the border and "Chosen" badge, and add a `HotelCard.test.tsx` case for it and for `children`.
- `web/components/HotelAssistant.tsx`: `selectedId` state reset in `search()`, a `type="button"` Choose button as the card's child, and a summary below the list.
- Focus: a `useEffect` on `selectedId` focuses the summary when it is set, so re-renders and repeat presses do not move focus.
- Then `scripts/gate.sh 05-choose`, a one-off check of the outline after a mouse click, and `/review 05-choose`.

Questions:
- Q: Toggle buttons (`aria-pressed`) or a radio group? (Recommendation: one "Choose <name>" button per card with `aria-pressed`. It is simple to reach by Tab, and Enter/Space just work.)
  A: Accepted. One Choose button per card with `aria-pressed`.
- Q: Should the summary compute a 2-night total from the message? (Recommendation: no. The brief excludes NL interpretation, so show the nightly price only and say no booking was made.)
  A: Accepted. No total: nightly price only, and the summary says no booking was made.
- Q: Where does focus go after choosing? (Recommendation: move it to the summary region (`tabIndex=-1`) so screen readers and keyboard users land on the result.)
  A: Accepted. Focus moves to the summary region (`tabIndex=-1`).
- Q: How does a chosen card look, and does the button text change? (Recommendation: the button always reads "Choose <name>", with `aria-pressed` and a filled style when chosen. The card gets a thicker blue border and a "Chosen" text badge. Visible "Chosen" with the name "Choose <name>" would fail WCAG 2.5.3 Label in Name, and the probe needs the name to stay stable.)
  A: Accepted. The button text and name stay "Choose <name>", with a filled style when chosen. The card gets a thicker blue border and a "Chosen" badge.
- Q: What happens when the already chosen button is pressed again? (Recommendation: nothing. It stays chosen and focus stays on the button. Un-choosing is not in the brief, and picking another hotel or searching again already changes the choice.)
  A: Accepted. Pressing it again changes nothing, and focus stays on the button.
- Q: Does focus also move when the choice changes, and is focus the only announcement? (Recommendation: yes to both. Focus moves on every new choice, and there is no `aria-live` on the summary, because that could announce it twice. Whether a screen reader reads the contents on focus stays unverified unless tried with NVDA, and goes in `APPROACH.md`.)
  A: Accepted. Focus moves on every new choice, and the summary has no `aria-live`. Screen reader behaviour is listed as unverified in `APPROACH.md` unless tried with NVDA.
- Q: What is the exact summary note and layout? AC5.3 only gives "Fixture data ... No booking has been made." (Recommendation: "Fixture data for this demo. No booking has been made." A `<dl>` with Hotel, Price, Breakfast and Why this hotel, reusing the card's strings and `formatPrice`.)
  A: Accepted. Note: "Fixture data for this demo. No booking has been made." A `<dl>` with Hotel, Price, Breakfast and Why this hotel, reusing the card's strings and `formatPrice`.
- Q: Where does the summary sit, and how is its focus shown? (Recommendation: below the list at all widths, which keeps the Tab order logical. Shift+Tab goes back to the cards. Use a `focus:` outline rather than `focus-visible:`, because after a mouse click `focus-visible` may not match and sighted users would lose the jump.)
  A: Accepted. Below the list at all widths, with a `focus:` outline.
- Q: What exactly clears the choice under AC5.6? (Recommendation: anything that starts a request, so Find hotels and Retry, by resetting in `search()`. A blocked blank submit, editing the field and changing the demo scenario do not clear it, because the results on screen stay the same.)
  A: Accepted. Find hotels and Retry clear it, by resetting in `search()`. A blocked blank submit, editing the field and changing the demo scenario do not.

## 2. Spec: acceptance criteria (mock boundary: the `@/lib/api` module)
- **AC5.1** Each card has a button named **Choose <hotel name>**, `aria-pressed="false"` initially. There is no summary before a choice.
- **AC5.2** Choosing sets `aria-pressed="true"` on that button only (exactly one chosen) and highlights the card with a thicker border and a "Chosen" badge, on that card only. The button text and name stay **Choose <hotel name>**. Pressing the chosen button again changes nothing.
- **AC5.3** A region labelled **Your choice**, below the list, shows the name, `NZD 220 per night`, breakfast, the explanation, and "Fixture data for this demo. No booking has been made." It has no nightly total and no `aria-live`.
- **AC5.4** The summary receives focus after every new choice, including a change of choice, and changing the choice updates it. Pressing the chosen button again leaves focus on the button. The focused summary has a visible outline after a mouse click as well as after the keyboard.
- **AC5.5** Works with the keyboard: focus a Choose button, press Space or Enter, and the summary appears.
- **AC5.6** Find hotels and Retry clear the choice. A blocked blank submit, editing the field and changing the demo scenario do not.

## 3. Implement (test-first)
1. **Red:** `web/components/HotelAssistant.choose.test.tsx`. Save `evidence/05-choose-red.txt`, then commit `test(05-choose): ...`.
2. **Green:** `selectedId` state (reset in `search()`), the button as a `HotelCard` child, a summary `<section aria-labelledby tabIndex={-1}>` with a `<dl>`, and focus via `useRef` + `useEffect`. Save `evidence/05-choose-green.txt`, then commit `feat(05-choose): ...`.

## 4. Verify
`scripts/gate.sh 05-choose`. The Playwright `choose` stage is keyboard-only: Tab to Find hotels → Enter → Tab to "Choose City Garden" → checks the focus outline → Enter → summary focused.

## 5. Review
Run `/review 05-choose`. Push on:
- Do the button text and accessible name stay "Choose <name>" when chosen, with the "Chosen" badge outside the button?
- Is focus management happening only on a new choice, not on every render?

## Definition of done
Gate passes. `evidence/probe-chosen.png` exists.

## Decisions & agent notes
- One commit after the final gate, as `AGENTS.md` and `tasks/README.md` say. The per-phase `test(...)` and `feat(...)` commits in section 3 are out of date. Red and green are proven by the Status log and evidence files.
- No journey probe step checks AC5.6, so the Vitest tests are its only check. The probe stays as it is.
- All plan recommendations accepted by the human. Scope changed: AC5.2, AC5.3, AC5.4 and AC5.6 were extended. The first review question in section 5 was reworded to match the stable button text.
- Vitest in jsdom cannot show the outline or the highlight. The AC5.2 test checks the badge. The border is checked by eye in `evidence/probe-chosen.png`, and the outline after a mouse click by a one-off browser check.
- Red: 27 new tests fail, 26 with "Unable to find an accessible element" and 1 with "Unable to find an element with the text: Chosen", so all on missing behaviour. No stubs were needed. `AC5.1 renders its children inside the card` passes at red and is not in the 27, because task 04 already built `children`. It stays as the coverage the 04 notes asked for.
- `evidence/05-choose-red.txt` is 468 KB (19,710 lines), against 96 KB for task 04, because each of the 26 failures prints the page's DOM and every test here renders the full results first. It is the full output, as `/implement` asks. The local repo path and username are replaced with `<repo>` and `<user>`, and colour codes removed, as in earlier tasks. A search of all three `evidence/05-choose-*.txt` files for the username, user paths and email found nothing.
- `formatBreakfast` is added to `web/lib/format.ts`, so the card and the summary share the breakfast strings, as the plan answer on reusing them says. `HotelCard` now uses it. It has no test of its own: the AC4.3 and AC5.3 tests pin both strings.
- The chosen card has a 4px border and 13px padding, against 1px and 16px, so its contents do not move when the border thickens. The 13px is not asked for by any AC.
- The "Chosen" badge sits on its own line under the `h3`, outside the heading and the button, so neither accessible name changes. It adds a line, so the chosen card's text sits lower than its neighbours. Choose buttons stay aligned by `mt-auto`.
- The Choose button is outlined when not chosen and filled blue when chosen. It uses the existing `focus-visible:` ring. Only the summary uses `focus:`, as the plan answer says.
- The price in the summary is one string, so "NZD 220 per night" is findable as one text and has no separate bold part as on the card.
- The Retry case of AC5.6 cannot fail on its own: a choice cannot exist while the error shows, because the Find hotels press that led to the error already cleared it. Both go through the one reset in `search()`, so the test pins the outcome and the shared reset is what covers Retry.
- One-off check, run with a throwaway script outside the repo against the real app and API (Chromium via Playwright). After a mouse click the summary has focus, does not match `:focus-visible`, and has a solid 2px blue outline with a 2px offset, so `focus:` was needed. The same holds after a mouse change of choice. After Space it has the same outline and does match `:focus-visible`. Pressing the chosen button again leaves focus on the button. Shift+Tab from the summary lands on the last Choose button (Quay Rooms), not the chosen one (City Garden), because that is the previous control in DOM order. No horizontal overflow at 360px. The outline after a mouse click also shows in `evidence/probe-chosen.png`, which the probe takes after clicking Quay Rooms.
- That check ran on port 3001, with `FIXTURE_DELAY_MS=100` and `ALLOWED_ORIGINS=http://localhost:3001` set for one temporary API process, stopped afterwards. An `npm run dev` from a VS Code terminal, not started by the agent, was running on 3001 and was left running. A first attempt through `scripts/serve.sh` failed because its `next dev` exited with ENOENT on `web/.next/prerender-manifest.json`. Both dev servers share `web/.next`, which is the likely cause, not confirmed.
- No existing test assertion was edited, `HotelCard.test.tsx` only gained cases, and `openapi/openapi.yaml` did not change. Whether a screen reader reads the summary on focus is unverified: list it in `APPROACH.md` (task 06) unless the human tries it with NVDA.
- The gate wrote `evidence/05-choose-probe.txt` and `evidence/probe-chosen.png`, both untracked. The Definition of done requires the screenshot, so they belong in this task's commit. It shows Next's dev tools badge, which comes from `next dev`.
- Review verdict APPROVE with 1 MINOR and 3 NIT findings and one question (`reviews/05-choose.md`). The review checked the three points from implement: the Retry test stays (it cannot show Retry itself clears, but it is the only test of choice, failed search, recovery), Shift+Tab landing on Quay Rooms is acceptable, and `formatBreakfast` is fine. Final gate held until the human triages them, because a pass moves this doc to `tasks/done/`.
- The human accepted every recommendation at triage. Finding 1: no probe checks added, so the summary outline and the thick border stay checked by eye and by one-off browser checks. Finding 2: the `HotelCard.tsx` comment is reworded and the layout stays, so the badge still moves the Choose buttons down when first chosen. Finding 3: AC5.6 stays as written. Finding 4: the full 468 KB red evidence stays.
- The human did not report an NVDA run, so list this in `APPROACH.md` (task 06) as unverified: whether a screen reader reads the summary's contents on focus, or only "Your choice, region". This limits the "announced" part of the outcome. A fix would need a new decision, because AC5.3 rules out `aria-live`.

## Status log (updated automatically)
- 2026-11-02 01:36 UTC - on branch task/05-choose
- 2026-11-02 01:37 UTC - next: plan (agent)
- 2026-11-02 01:39 UTC - plan: questions asked, waiting on the human
- 2026-11-02 01:39 UTC - next: answers (human)
- 2026-11-02 01:46 UTC - plan: answers recorded, plan written
- 2026-11-02 01:46 UTC - next: implement (agent)
- 2026-11-02 01:49 UTC - red: 27 tests fail for the right reason (evidence/05-choose-red.txt)
- 2026-11-02 01:50 UTC - green: all tests pass (evidence/05-choose-green.txt)
- 2026-11-02 01:55 UTC - gate FAILED [REVIEW] 23 passed, 1 failed: no review: run /review 05-choose (writes reviews/05-choose.md)
- 2026-11-02 02:02 UTC - next: review (agent)
- 2026-11-02 02:29 UTC - review: APPROVE, 1 MINOR, 3 NIT, 1 question, waiting on human triage (reviews/05-choose.md)
- 2026-11-02 02:30 UTC - next: gate (agent)
- 2026-11-02 02:41 UTC - gate PASSED (25 checks)
- 2026-11-02 02:41 UTC - next: commit-done (human)
