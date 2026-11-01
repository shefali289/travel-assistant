# Review: 02-api
Reviewer: AI agent (/review), triaged by: human
Diff: f519045..235aa24, plus the uncommitted review fixes

## Spec compliance
The reviewer's checks came from throwaway scripts outside the repo, not the implement agents'. "Script" below means an edge-case comparison of the app with the YAML. "Live" means `uvicorn` on a spare port with `curl`. "Mutation" means changing a temporary copy of `api/app/main.py` and running the test suite against it.

| AC | Met? | Evidence (test / probe / file:line) |
|---|---|---|
| AC2.1 | yes | `api/app/main.py:56-87`, loaded at import at `:130`. `test_ac2_1_*`, including `test_ac2_1_bad_fixture_data_stops_the_app_importing`. Mutations on the int price and the `nan`/`inf` price check were caught. See the first finding for rows the AC does not name. |
| AC2.2 | yes | `api/app/main.py:29-33`, `:42-53`, `:114-127`. `test_ac2_2_invalid_message_returns_422_naming_the_field` (9 cases), `test_ac2_2_several_errors_report_only_the_first`. Probe: "whitespace message -> 422". The test checks only that the text names the field: see the second finding. |
| AC2.3 | yes | `api/app/main.py:168`. `test_ac2_3_success_returns_exactly_the_three_fixtures` compares values and JSON types. Probe: "success -> exactly the three fixtures with correct types". Live: `nightlyPrice` is `220`, not `220.0`. |
| AC2.4 | yes | `api/app/main.py:46`. `test_ac2_4_no_scenario_is_treated_as_success`. |
| AC2.5 | yes | `api/app/main.py:166-167`. `test_ac2_5_empty_scenario_returns_no_hotels`. Probe: "empty -> 200 with hotels: [] and a message". |
| AC2.6 | yes | `api/app/main.py:164-165`. `test_ac2_6_error_scenario_returns_retryable_503`. Probe: "error -> 503". Live: 503 with the exact body. |
| AC2.7 | yes | `test_ac2_7_*`, including 500 and 501 characters, invalid UTF-8 and validation before scenario. `api/app/main.py:148-153` maps the 400. Live: invalid UTF-8 returns the 422 `ErrorResponse`. Mutations on the 400 mapping and the length limit were caught. |
| AC2.8 | yes | `test_ac2_8_*` validate 200, 503, 422 and `/health` bodies against the YAML, and each rejected JSON payload against `RecommendationRequest`. Script: the app and the YAML agree on 12 further messages, including Unicode whitespace and 500 and 501 emoji. |
| AC2.9 | yes | `api/app/main.py:95-103`, `:163`. `test_ac2_9_*`, using real time. Mutation limiting the delay to `success` was caught. Live: the 503 took 0.81 s and a 422 took 0.003 s. Non-finite values are met but untested: see the third finding. |
| AC2.10 | yes | `api/app/main.py:90-92`, `:134-140`. `test_ac2_10_*`. Mutations on credentials and methods were caught. Live: the preflight and the 503 both carry the allow-origin header. |
| AC2.11 | yes | `api/app/main.py:133`. `test_ac2_11_generated_docs_routes_are_off` (3 cases). Live: `/docs` returns 404. |

Task section 5:
- **Does the 422 body match `ErrorResponse`?** Yes. `assert_validation_error` checks the exact keys, and `test_ac2_8_rejected_json_responses_match_the_contract` validates the body against the YAML.
- **Do tests assert exact fixture values and types?** Yes, through `assert_exact`, which also compares the JSON text.
- **Do tests hit the real app?** Yes. There are no mocks, and only `FIXTURE_DELAY_MS` and `ALLOWED_ORIGINS` are configured.

## Findings
No BLOCKER or MAJOR. All four are hardening or test gaps, and none breaks an AC.

- [x] MINOR (fixed: wrong columns and no rows now raise `ValueError`, covered by `test_ac2_1_wrong_columns_or_no_rows_raises` and added to AC2.1): `api/app/main.py:75` `load_fixtures` catches short rows but not long ones, and its docstring overstates what it raises. Script results: an unquoted comma (`...,true,Good, cheap`) loads with `explanation: "Good"`, silently losing text. A CSV with only a header loads as `[]`, so `success` returns 200 with no hotels, the same as `empty`. A missing column raises `KeyError`, not the documented `ValueError`. The check at `:75` has no test: removing it survived the mutation run. Fix: compare each row's keys with the expected six columns, raise `ValueError` on a mismatch or on no rows, and add tests.
- [x] MINOR (fixed: `test_ac2_2_invalid_message_has_its_exact_text`, `test_ac2_2_blank_message_text_is_the_contract_example`, `test_ac2_7_scenario_error_has_its_exact_text`, `test_ac2_7_message_over_500_characters_has_its_exact_text`): `api/tests/test_recommendations.py:238-240` The chosen 422 texts are not pinned. A mutation that changed the blank-message text to "The message field must be text." survived, because the test checks only that the text contains `message`. These strings can reach the traveller, and the blank text is meant to match the contract's example. Fix: assert the exact text per case, as the AC2.7 tests already do for their two messages.
- [x] MINOR (fixed: `test_ac2_9_non_finite_delay_falls_back_to_800ms`, which also covers `1e400`): `api/tests/test_recommendations.py:394` The `nan` and `inf` fallback is untested. Removing `isfinite` at `api/app/main.py:101` survived the mutation run. The recorded reason for skipping them, that a request could hang the run, does not apply to a direct call. Fix: parametrize `nan`, `inf` and `-inf`, setting the variable and asserting `main.delay_seconds() == 0.8`.
- [x] NIT (fixed: `test_ac2_2_scenario_error_is_reported_before_an_unknown_field`): `api/tests/test_recommendations.py:243-255` "Reports only the first" is not tested for `scenario` before unknown fields. Swapping those two branches at `api/app/main.py:123-126` survived the mutation run. Fix: add `{"message": MSG, "scenario": "nope", "hiddenField": 1}`, expecting the scenario text.

Re-review after the fixes: line numbers above are from the first review. 137 tests pass, the probe shows 0 failures, and all 16 mutations are caught (15 from the first run, with the column check split into two). Before the loader fix, 5 of the 6 new bad-CSV cases failed; the short row already raised. The other new tests passed straight away, because they pin behaviour that already worked. No existing assertion changed.

Question for the human, kept as it is at triage:
- An empty `ALLOWED_ORIGINS=` refuses every origin (`api/app/main.py:91`), while an empty `FIXTURE_DELAY_MS=` falls back to the default. AC2.10 gives the default only for an unset variable, so this meets the spec, and refusing is the safer behaviour. The two settings do behave differently.

## Checks
- **Correctness vs spec and OpenAPI:** all 11 ACs met. `openapi/openapi.yaml` is unchanged in this diff. Script: `scenario` values `1`, `true`, `["success"]`, `"SUCCESS"` and `"success "` all return 422, and `null`, `42`, `"hi"` and deep nesting return the 422 `ErrorResponse`. Bodies in UTF-16 or with a BOM are accepted (200): the contract does not bar them and they do no harm. Framework 404 and 405 stay `{detail}`, as the plan answer says.
- **Tests:** they assert behaviour, cover failure paths and carry AC ids. `git diff c41f176 235aa24 -- api/tests openapi` is empty, so nothing was weakened between red and green. The first run caught 11 of 15 mutations, and the four survivors became the findings above. Timing bounds could need widening on a very slow machine (recorded in the task doc). They held on every run in this review.
- **Accessibility:** not applicable, API only.
- **Security/hygiene:** no secrets, no logging of input, and error messages do not echo input. CORS has no credentials and allows POST only. Starlette's preflight also lists the safelisted `Accept`, `Accept-Language` and `Content-Language` headers, which browsers allow anyway. `evidence/02-api-red.txt`, `02-api-green.txt` and `02-api-probe.txt` contain no username or local path.
- **Simplicity:** one module of 168 lines with no new dependencies. Mapping every `HTTPException` 400 is broader than the one case it exists for, but nothing else in the app raises a 400, and a mutation mapping every status was caught.

Verdict: APPROVE
