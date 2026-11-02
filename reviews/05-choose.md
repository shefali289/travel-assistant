# Review: 05-choose
Reviewer: AI agent (/review), triaged by: <you>
Diff: 86cfe2d..working tree (uncommitted), including untracked `web/components/HotelAssistant.choose.test.tsx` and `evidence/`

## Spec compliance
The reviewer's checks came from throwaway scripts outside the repo. "Live" means a temporary copy of `web/` with its own `.next` on port 3002 and the real API on port 8002 (`FIXTURE_DELAY_MS=100`), driven by Playwright in Chromium. Both were stopped afterwards. "Mutation" means changing a temporary copy of `web/` and running the Vitest suite against it. `npm test` (90 passed), typecheck and lint were re-run and are clean. `scripts/gate.sh` was not run, as instructed, because of the `npm run dev` that shares `web/.next`, so the final gate is still to come. The `choose` probe was not re-run, so `evidence/probe-chosen.png` was not overwritten: the live script covered the same steps. `pytest` was not re-run, because `git diff main` shows no change under `api/` or `openapi/`.

| AC | Met? | Evidence (test / probe / file:line) |
|---|---|---|
| AC5.1 | yes | `web/components/HotelAssistant.tsx:168-177`, `:185`. Two `AC5.1` tests in `HotelAssistant.choose.test.tsx`. Mutations always showing the badge and removing `type="button"` were caught. Probe: `aria-pressed` and the button name. |
| AC5.2 | yes, border by eye only | `HotelAssistant.tsx:164`, `:170-171`, `web/components/HotelCard.tsx:9-10`, `:17-21`. Five `AC5.2` tests in the choose file and one in `HotelCard.test.tsx`. Mutations fixing `aria-pressed`, changing the button text, toggling off on a second press, and putting the badge in the heading were caught. The border is visible in `evidence/probe-chosen.png`, but a mutation removing it left all 90 tests passing (first finding). |
| AC5.3 | yes | `HotelAssistant.tsx:185-208`. Five `AC5.3` tests. Mutations on the note, the price text, `aria-live` and the summary's position were caught. Live: the accessibility tree has region "Your choice", heading level 2, four term and definition pairs, and the note. |
| AC5.4 | yes, mouse outline by eye only | `HotelAssistant.tsx:48-51`, `:191`. Four `AC5.4` tests. Mutations removing the effect, running it on every render, focusing only the first choice and `tabIndex={0}` were caught. Live: the keyboard path matches `:focus-visible` with a solid 2px blue-700 outline, and pressing the chosen button again leaves focus on it. The outline after a mouse click shows in `evidence/probe-chosen.png` and in the reviewer's 360px screenshot, but no test or probe checks it (first finding). |
| AC5.5 | yes | Three `AC5.5` tests. Probe: Tab to City Garden, outline, Enter, summary focused. Live: Enter and Space both move focus to the summary. |
| AC5.6 | yes | `HotelAssistant.tsx:68`. Seven `AC5.6` tests. Mutations clearing on an edit, on a scenario change and on a blocked blank submit were each caught, and removing the reset was caught by four tests. Live: choice, error scenario, Find hotels, error (no summary), success scenario, Retry gives no summary, nothing pressed, focus on Find hotels. See the first point below on Retry. |

Task section 5:
- **Do the button text and name stay "Choose <name>" when chosen, with the badge outside the button?** Yes. `HotelAssistant.tsx:176` and `HotelCard.tsx:17-21`. A mutation changing the text failed 12 tests.
- **Is focus moved only on a new choice?** Yes. The effect depends on `selectedId` alone. A mutation running it on every render failed `AC5.4 does not move back to the summary when the page re-renders for another reason`, and one that focused only the first choice failed the change-of-choice test.

Points the implement agent raised:
- **Retry case of AC5.6: does the test add anything?** Yes, but less than its AC reads. Moving the reset so only Find hotels clears left all 90 tests passing, which confirms the note: the test cannot show that Retry itself clears. That is not a gap, because a choice and the error cannot exist together, so no test could tell the two apart. The test still has a job of its own. It is the only test of choice, failed search, then recovery, and removing the reset fails it. It would catch a choice coming back after a failed search. Its title, "leaves no choice after it recovers", is accurate. Keep it (second finding covers the AC wording).
- **Shift+Tab from the summary lands on Quay Rooms, not the chosen hotel: acceptable?** Yes, no finding. Live: Shift+Tab reaches Quay Rooms with a visible ring, and a second press reaches City Garden. It is the previous control in DOM order, so it is the logical Tab order `AGENTS.md` asks for, and it meets the plan answer's "goes back to the cards", which names no particular card. With three cards the cost is at most two extra presses. Sending focus to the chosen button would need custom key handling that overrides what keyboard users expect.
- **`formatBreakfast` added to `web/lib/format.ts`, not in the plan's file list: acceptable?** Yes, no finding. The plan answer asks to reuse the card's strings, and without it the two strings would be written twice. It is recorded under Decisions. It has no test of its own, but a mutation swapping the strings failed five tests across AC4.3 and AC5.3.

Layout, live: no horizontal overflow at 360, 800 or 1280px after choosing. At 360x800 the focused summary is on screen in full (top 426px, bottom 768px). In dev the Next tools badge overlaps the note at the bottom left of a full-page 360px screenshot. That badge comes from `next dev`, not the app.

### Contrast, measured
Colours read with `getComputedStyle` in the live app, converted to sRGB by the browser's canvas, and put through the WCAG 2.x formula. All pass. The screenshot of the focused chosen button shows the ring separate from the blue fill, with a white gap.

| Pair | Foreground | Background | Ratio | Needs |
|---|---|---|---|---|
| Chosen button text (white on blue-700) | `#ffffff` | `#1447e6` | 6.83 | 4.5 |
| Unchosen button text (blue-800 on white) | `#193cb8` | `#ffffff` | 8.82 | 4.5 |
| Unchosen button text on hover | | | 8.11 | 4.5 |
| "Chosen" badge (white on blue-700) | `#ffffff` | `#1447e6` | 6.83 | 4.5 |
| Chosen card border on white | `#1447e6` | `#ffffff` | 6.83 | 3 |
| Summary outline on the page (blue-700 on slate-50), computed only | `#1447e6` | `#f8fafc` | 6.53 | 3 |
| Summary note (slate-700 on white) | `#314158` | `#ffffff` | 10.36 | 4.5 |
| Summary values (slate-900 on white) | `#0f172b` | `#ffffff` | 17.83 | 4.5 |

## Findings
No BLOCKER or MAJOR.

- [ ] MINOR: `web/components/HotelAssistant.tsx:191`, `web/components/HotelCard.tsx:10` Two things AC5.2 and AC5.4 ask for by name have no automatic check. Changing the summary's `focus:` to `focus-visible:`, removing its outline altogether, or removing the thick border each left all 90 tests passing, and the `choose` probe checks none of them. If `focus:` became `focus-visible:`, mouse users would lose the outline and the gate would still pass. Both work today, and jsdom cannot see them, so the proof is the screenshot and one-off browser checks. Fix if wanted: after the click on Quay Rooms in `scripts/probes/journey.mjs`, one check that the summary's `outlineStyle` is not `none`, and one that the chosen `listitem`'s `borderTopWidth` is `4px`. Recommendation: accept without a change and keep the screenshot as the evidence, because the decisions already say so, only task 06 follows, and the probe is meant to stay independent of the implementation. The human decides.
- [ ] NIT: `web/components/HotelCard.tsx:8`, `:17-21` The comment says the reduced padding means "the card's contents do not move". That holds for the border only: the badge adds a line. Measured live on the first choice, all three Choose buttons move down 29px at 1280px and 5px at 800px, and at 360px the buttons in the cards below move 29px. The chosen card's price and text also sit 29px lower than its neighbours, as `evidence/probe-chosen.png` shows. The decision notes the extra line and the alignment, but not that the buttons move. No click is lost in normal use, because focus moves to the summary and, with these fixtures, a later change of choice should not change the row height (inferred from the card text, not measured). Fix: reword the comment to "so the thicker border does not move the contents". Optional: put the badge on the breakfast row with `flex flex-wrap gap-2`, which removes the shift at 1280px. Recommendation: reword the comment and leave the layout, which the 4-hour cap favours.
- [ ] NIT: `tasks/05-choose.md` AC5.6 "Find hotels and Retry clear the choice" reads as though Retry has a choice to clear, and it never does. Fix: "Find hotels clears the choice, and none comes back after Retry." Recommendation: optional. Changing the wording needs the human's agreement. The code and the test stay as they are either way.
- [ ] NIT: `evidence/05-choose-red.txt` This is 468 KB and goes into the commit. The task note gives the reason and says `/implement` asks for the full output, and a search for the username and user paths found nothing in any of the three `evidence/05-choose-*.txt` files (reviewer re-ran it: 0 hits). Recommendation: accept without a change.

Question for the human:
- The task's outcome line says "a clear, announced summary". Focus moves to the region and the Chromium accessibility tree is right, but nothing shows what a screen reader says. It may read only "Your choice, region", not the hotel. The plan already accepted this as unverified. Try it with NVDA, or list it in `APPROACH.md` (task 06) as the plan says? If NVDA reads only the name, adding `aria-live` is ruled out by AC5.3, so any fix would need a new decision.

## Checks
- Correctness vs spec and OpenAPI: every AC met. `openapi/openapi.yaml` did not change, and the UI contract row for the summary and Choose button in `AGENTS.md` holds. `BRIEF.md` "Select one hotel and show a clear summary" holds.
- Tests: assert behaviour, carry AC ids, and every mutation that jsdom can see and that changes behaviour was caught. The reset moved to Find hotels only survived, because the two cannot be told apart (see the Retry point above). Existing assertions were not weakened: `git diff main` shows `HotelCard.test.tsx` only gained cases. `selectedId` resets, focus and all "keeps it" cases have failure-path checks. One mutation, resetting only on a successful response, gave no test result and is not counted.
- Accessibility: labels, roles, focus and keyboard checked live, and contrast measured above. Screen reader speech is unverified (see the question). Only Chromium was tried.
- Security/hygiene: no secrets or personal data in the diff or the evidence text files. Hotel text is rendered as React text, so it is escaped. No new dependencies.
- Simplicity: small change. `chosenHotel` is derived from the result, so a stale summary cannot show without a result. `formatBreakfast` is justified above.

Verdict: APPROVE
