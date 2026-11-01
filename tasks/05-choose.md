# 05 · Choose a hotel and see a summary
**Outcome:** A traveller selects exactly one hotel by mouse or keyboard and gets a clear, announced summary.
**Brief criteria:** select one hotel and show a clear summary, keyboard access.
**Depends on:** 04 · **Verified by:** tests + probe (journey `choose`)

## 1. Plan
Run `/plan 05-choose`.

Plan: _TBD_

Questions:
- Q: Toggle buttons (`aria-pressed`) or a radio group? (Recommendation: one "Choose <name>" button per card with `aria-pressed`. It is simple to reach by Tab, and Enter/Space just work.)
  A:
- Q: Should the summary compute a 2-night total from the message? (Recommendation: no. The brief excludes NL interpretation, so show the nightly price only and say no booking was made.)
  A:
- Q: Where does focus go after choosing? (Recommendation: move it to the summary region (`tabIndex=-1`) so screen readers and keyboard users land on the result.)
  A:

## 2. Spec: acceptance criteria (mock boundary: the `@/lib/api` module)
- **AC5.1** Each card has a button named **Choose <hotel name>**, `aria-pressed="false"` initially. There is no summary before a choice.
- **AC5.2** Choosing sets `aria-pressed="true"` on that button only (exactly one chosen) and highlights the card.
- **AC5.3** A region labelled **Your choice** shows the name, `NZD 220 per night`, breakfast, the explanation, and "Fixture data ... No booking has been made."
- **AC5.4** The summary receives focus after choosing, and changing the choice updates it.
- **AC5.5** Works with the keyboard: focus a Choose button, press Space or Enter, and the summary appears.
- **AC5.6** A new search clears the choice.

## 3. Implement (test-first)
1. **Red:** `web/components/HotelAssistant.choose.test.tsx`. Save `evidence/05-choose-red.txt`, then commit `test(05-choose): ...`.
2. **Green:** `selectedId` state (reset in `send`), the button as a `HotelCard` child, a summary `<section aria-labelledby tabIndex={-1}>` with a `<dl>`, and focus via `useRef` + `useEffect`. Save `evidence/05-choose-green.txt`, then commit `feat(05-choose): ...`.

## 4. Verify
`scripts/gate.sh 05-choose`. The Playwright `choose` stage is keyboard-only: Tab to Find hotels → Enter → Tab to "Choose City Garden" → checks the focus outline → Enter → summary focused.

## 5. Review
Run `/review 05-choose`. Push on:
- Does the button text change ("Chosen") while the accessible name stays stable?
- Is focus management happening only on a new choice, not on every render?

## Definition of done
Gate passes. `evidence/probe-chosen.png` exists.

## Decisions & agent notes
-
