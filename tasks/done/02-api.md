# 02 · FastAPI recommendations API
**Outcome:** `POST /recommendations` validates input and serves the three demo scenarios from the CSV fixture, exactly as `openapi/openapi.yaml` says.
**Brief criteria:** non-empty validation, success/empty/error(503), short delay, fixture CSV types, fixture label, API validation/contract checks.
**Depends on:** 01 · **Verified by:** tests + probe (`scripts/probes/api_contract.py`)

## 1. Plan
Run `/plan 02-api`. Record the plan and the answers here.

Plan:
1. Red: write `api/tests/test_recommendations.py` from the ACs below, with a `load_fixtures` stub in `api/app/main.py` so collection works. Save `evidence/02-api-red.txt`. Human commits `test(02-api)`.
2. Green: in `api/app/main.py`, add the CSV loader, request and response models, the delay, the three scenarios, the error mapping (validation errors and the invalid UTF-8 400 become the 422 `ErrorResponse`), CORS, and turn off the generated docs. Save `evidence/02-api-green.txt`. Human commits `feat(02-api)`.
3. Run `scripts/gate.sh 02-api`, including `scripts/probes/api_contract.py`, then `/review 02-api`.
4. No contract change is expected. If one is needed, stop and ask, then change the YAML first in its own commit and log it in `APPROACH.md`.

Questions:
- Q: Should a whitespace-only message be rejected (422) or trimmed and accepted? (Recommendation: reject. "Non-empty" means non-blank.)
  A: Reject with a 422. AC1.2 already requires this.
- Q: Is the delay applied to every scenario or only success? (Recommendation: every scenario, so loading is visible for empty and error too. The brief only requires it for success.)
  A: All three scenarios, but not a 422, as confirmed in the 01 triage.
- Q: Reject unknown request fields (strict) or ignore them? (Recommendation: reject, `extra="forbid"`, so it matches `additionalProperties: false`.)
  A: Reject, with `extra="forbid"`.
- Q: An invalid UTF-8 body gets FastAPI's `400 {"detail":...}` before validation, which breaks AC2.7 and the contract. What should it return? (Recommendation: the 422 `ErrorResponse`, and add no body and a JSON array to AC2.7.)
  A: The 422 `ErrorResponse`. No body and a JSON array are added to AC2.7.
- Q: Should framework 404 and 405 responses, and a JSON body with no `Content-Type`, change? (Recommendation: no. The contract does not declare those statuses and a missing header does no harm.)
  A: No change.
- Q: FastAPI's generated `/docs` and `/openapi.json` show a different 422 shape from the YAML. Keep them? (Recommendation: turn them off so the YAML is the only contract. `serve.sh` only uses `/docs` if `/health` fails.)
  A: Turn them off.
- Q: Should the contract checks go further than the listed ACs? (Recommendation: yes: 500 and 501 character boundary, validation before scenario, `scenario: null` rejected, rejected JSON payloads also fail the YAML request schema, `/health` matches its schema.)
  A: Yes, all five, added to AC2.7 and AC2.8.
- Q: How is the delay tested? (Recommendation: real timing, no mocks: 100 ms on each scenario, 800 ms when unset, and a quick 422 with 2000 ms set.)
  A: Real timing, as recommended.
- Q: What happens with a non-numeric or negative `FIXTURE_DELAY_MS`? (Recommendation: fall back to 800 ms rather than return a 500 on every request.)
  A: Fall back to 800 ms. Added to AC2.9.
- Q: What JSON number format does `nightlyPrice` use? (Recommendation: whole numbers stay integers, matching the contract example, and the test checks the type, because `220 == 220.0` hides the difference from the probe.)
  A: Whole numbers stay integers, and the test checks the type.
- Q: How is bad fixture data handled? (Recommendation: only `true` or `false` as booleans, raise on a non-numeric, `nan` or `inf` price, and load at import so bad data stops the API from starting.)
  A: As recommended. Added to AC2.1.
- Q: What does a 422 say when there are several errors? (Recommendation: the first error only, in plain wording. `message` and `scenario` errors name their field, an unknown field gets "Send only message and scenario", and an unreadable body gets "The request body must be JSON with a message field".)
  A: As recommended. Added to AC2.2 and AC2.7.
- Q: What are the response texts, given that the YAML example says "Wellington" and the API does not read the request? (Recommendation: success says "Here are three hotels to consider."; empty and 503 use the contract's example wording; no contract change.)
  A: As recommended. Added to AC2.3, AC2.5 and AC2.6.
- Q: What are the CORS details? (Recommendation: comma-separated `ALLOWED_ORIGINS` with spaces trimmed, POST and `Content-Type` only, no credentials, real environment variables only, and 422 and 503 responses carry the allow-origin header.)
  A: As recommended. Added to AC2.10.
- Q: `AGENTS.md:28` gives the delay only on `success`, which conflicts with the contract. Fix it? (Recommendation: yes, in the plan commit, because agents load that file every session.)
  A: Yes, corrected in the plan commit.

## 2. Spec: acceptance criteria (put the AC id in each pytest name, e.g. `test_ac2_3_success_returns_three_fixtures`)
- **AC2.1** The CSV at `api/fixtures/hotels.csv` is parsed into hotels with `nightlyPrice` as a number (whole numbers stay integers) and `breakfastIncluded` as a boolean. Only `true` and `false` are valid booleans. An invalid boolean, a non-numeric, `nan` or `inf` price, a row or header with the wrong columns, or a file with no rows raises `ValueError`. Fixtures load at import, so bad data stops the API from starting.
- **AC2.2** Missing, empty, whitespace-only, `null` or non-string `message` → **422** `ErrorResponse` (`code: validation_error`, `retryable: false`) whose message names the field. A request with several errors reports only the first, in plain wording.
- **AC2.3** `scenario=success` → 200 with exactly h1, h2, h3 (all fields equal to the CSV), the message "Here are three hotels to consider.", and `source: "fixture"`.
- **AC2.4** No `scenario` → treated as `success`.
- **AC2.5** `scenario=empty` → 200 with `hotels: []` and the message "I could not find any hotels for that request. Try changing your request."
- **AC2.6** `scenario=error` → **503** `ErrorResponse` (`code: service_unavailable`, `retryable: true`) with the message "Hotel recommendations are unavailable right now. Please try again."
- **AC2.7** These → 422 `ErrorResponse`: unknown or `null` scenario (message names `scenario`); unknown field ("Send only message and scenario", without echoing the field); message over 500 characters (exactly 500 is accepted); non-JSON body, invalid UTF-8 body, no body or a JSON array ("The request body must be JSON with a message field"). Validation runs before the scenario, so `{"message":"","scenario":"error"}` → 422.
- **AC2.8** Every response body, including `/health`, validates against the matching schema in `openapi/openapi.yaml`. Each rejected JSON payload from AC2.2 and AC2.7 also fails the YAML's `RecommendationRequest` schema. Load the YAML in the test and validate with `jsonschema`, using a `referencing` registry for `$ref`.
- **AC2.9** All three scenarios wait for the delay from `FIXTURE_DELAY_MS`, read on each request (default 800ms). A non-numeric or negative value falls back to 800ms. A 422 returns without waiting. Tests set it to 0, except the delay tests, which measure real time.
- **AC2.10** CORS allows `ALLOWED_ORIGINS` (comma-separated, spaces trimmed, default `http://localhost:3000`) for POST with `Content-Type`, with no credentials. Other origins are refused. 422 and 503 responses carry the allow-origin header. Only real environment variables are read.
- **AC2.11** The generated `/docs`, `/redoc` and `/openapi.json` routes are turned off, so `openapi/openapi.yaml` is the only contract.

Out of scope: filtering by budget or parsing the message, persistence, auth, rate limiting.

## 3. Implement (test-first)
1. **Red:** create `api/tests/test_recommendations.py`. Use `TestClient(app)`, an autouse fixture that sets `FIXTURE_DELAY_MS=0`, and `pytest.mark.parametrize` for the invalid payloads (AC2.2/2.7). Run `pytest -q 2>&1 | tee ../evidence/02-api-red.txt`. Tests must fail on **missing behaviour** (404/assertions), not on import errors. Keep a stub `app` so collection works. Commit `test(02-api): ...`.
2. **Green:** in `api/app/main.py`:
   - Pydantic model with `StrictStr` message, a `field_validator` that rejects blank values, `Scenario` enum default `success`, and `ConfigDict(extra="forbid")`.
   - `@app.exception_handler(RequestValidationError)` that maps errors to `{code, message, retryable}` with status 422.
   - `load_fixtures()` using `csv.DictReader`, converting the types explicitly.
   - `await asyncio.sleep(delay)` then branch on scenario. The 503 is a `JSONResponse`.
   - `CORSMiddleware` from env.
   Run `pytest -q -p no:warnings | tee ../evidence/02-api-green.txt`. Commit `feat(02-api): ...`.
3. If the implementation forces a contract change, edit the YAML first in its own commit and log it under "Contract revisions".

## 4. Verify
`scripts/gate.sh 02-api`. This also runs the independent API probe, which checks your app against the brief and your YAML. Manual check: `curl -s -XPOST localhost:8000/recommendations -H 'content-type: application/json' -d '{"message":"hi","scenario":"error"}' -w '\n%{http_code}\n'`.

## 5. Review
Run `/review 02-api`. Points to push on:
- Does the 422 body really match `ErrorResponse`? FastAPI's default `{detail:[...]}` does not.
- Are tests asserting exact fixture values and types, not just lengths?
- Do the tests hit the real app (no mocks)? The mock boundary for the API is none: only the delay is configured.

## Definition of done
Gate passes. The red commit precedes green. Any contract revisions are recorded.

## Decisions & agent notes
- The red commit includes a `load_fixtures` stub that raises `NotImplementedError`, so tests fail on missing behaviour rather than an import error.
- The CSV path is resolved from `__file__`, because the probe runs from the repo root and pytest runs from `api/`.
- `FIXTURE_DELAY_MS` is read on each request, because tests set it after import.
- Checked with a throwaway script outside the repo (FastAPI 0.115.14): an invalid UTF-8 body returns `400 {"detail":...}` before validation runs. The probe does not cover this. The human chose the 422 `ErrorResponse`, so green needs a handler for it.
- All plan recommendations accepted by the human. Scope changed: AC2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 2.8, 2.9 and 2.10 were tightened, and AC2.11 is new (generated docs off).
- Turning off the generated docs is not a contract revision, because the YAML never declared those routes. So `APPROACH.md` "Contract revisions" does not change.
- `AGENTS.md` contract summary corrected: the delay applies to all three scenarios, not only `success`.
- Test interface, set by the red tests: `load_fixtures(path=FIXTURES_CSV)` returns a list of dicts with the contract's field names. The stub is not called at import yet, or collection would fail. Green must call it at import.
- Bad fixture data must raise `ValueError` specifically. The AC only says "an error", but `pytest.raises(Exception)` would pass against the stub's `NotImplementedError`.
- "Only `true` and `false`" is read as exact and case-sensitive: `True` and `FALSE` are invalid. Whether `220.0` becomes an integer is not pinned, because the AC does not say.
- "Stops the API from starting" is tested by importing a copy of `api/app` in a subprocess next to a bad CSV. "Only real environment variables" is tested the same way with a `.env` beside the copy. No mocks.
- "Reports only the first" error is read as field order: `message`, then `scenario`, then unknown fields.
- The two exact 422 texts in AC2.7 are compared with equality and no trailing full stop, as written in the AC.
- "Refused" and "not allowed" CORS tests first assert that the allowed case works. Without that control they would pass against the stub, which has no CORS at all.
- Delay tests use real time with slack for timer resolution: lower bounds of 90 ms for 100 ms and 780 ms for 800 ms, and upper bounds of 700 ms and 1.6 s. They may need widening on a very slow machine.
- `FIXTURE_DELAY_MS` values `nan` and `inf` were not tested at red, because a parser that accepts them could hang the run. Review finding 3 added them by calling `delay_seconds()` directly, which cannot hang.
- Passing at red, because the behaviour needs no new code: `test_ac2_8_health_response_matches_the_contract` and the 15 cases of `test_ac2_8_rejected_payloads_also_fail_the_contract_request_schema`, which check only the YAML.
- `evidence/02-api-red.txt` has the local repo path and username replaced with `<repo>` and `<user>`, because `AGENTS.md` bars personal data in files. Nothing else in the output changed.
- Green: `/recommendations` keeps FastAPI's body parsing, as section 3 says, instead of reading the raw body. The invalid UTF-8 case is mapped by a handler that turns any `HTTPException` 400 into the 422 `ErrorResponse`. FastAPI raises a 400 only there, and no route in the app raises one. Framework 404 and 405 stay as they are, as the plan answer says.
- The 422 texts the AC leaves open: missing "The message field is required. Describe the hotel you need."; blank is the contract's example text; non-string "The message field must be text. Describe the hotel you need."; over 500 "The message field must be 500 characters or fewer."; scenario "The scenario field must be success, empty or error."
- A blank message over 500 characters gets the length error, because the length check runs before the blank check. Both name `message`.
- `FIXTURE_DELAY_MS` is parsed with `float()`, so `1.5` means 1.5 ms. `nan`, `inf`, `-inf` and values that overflow (`1e400`) fall back to 800 ms. Checked once with a throwaway script outside the repo, as they stay untested on purpose. There is no upper limit, so a very large finite value waits that long: the AC only names non-numeric and negative values, and the value comes from the operator.
- `parse_price` goes through `float()`, so `220.0` in the CSV becomes the integer 220, following "whole numbers stay integers". The AC does not bar negative prices and the contract has no minimum, so they load.
- `load_fixtures` raises `ValueError` on a row with missing columns, because a short row would otherwise serve `explanation: null`, which breaks the contract. Review finding 1 widened this to wrong columns and no rows, added tests, and added it to AC2.1.
- Triage: the human chose to fix all four review findings. The fixes only add tests, apart from the loader check in `api/app/main.py`. No existing test assertion changed. `csv_with` in the test file now builds on a shared `CSV_HEADER`, with the same output. The empty `ALLOWED_ORIGINS` question stays as it is, because it meets AC2.10 and refusing is the safer behaviour.
- Checked with the same throwaway script, not covered by tests: a lone surrogate in `message`, a JSON `null`, number or string body, very deep nesting and a `text/plain` body all return a 422 `ErrorResponse`. JSON with no `Content-Type` returns 200, as the plan answer says.
- No test was edited and `openapi/openapi.yaml` did not change.
- Review verdict APPROVE with 3 MINOR and 1 NIT findings and one question (`reviews/02-api.md`). Final gate held until the human triages them, because a pass moves this doc to `tasks/done/`.
- The harness changed to one commit per task during this review (uncommitted edits to `AGENTS.md`, `tasks/README.md`, `.claude/commands/` and `scripts/`). So the review is not committed on its own: it goes in the final commit.

## Status log (updated automatically)
- 2026-11-01 07:33 UTC - on branch task/02-api
- 2026-11-01 07:33 UTC - next: plan (agent)
- 2026-11-01 07:37 UTC - next: answers (human)
- 2026-11-01 07:39 UTC - next: commit-plan (human)
- 2026-11-01 07:40 UTC - next: implement (agent)
- 2026-11-01 07:45 UTC - red: 99 failed, 17 passed; evidence saved, waiting on the test(02-api) commit
- 2026-11-01 07:46 UTC - next: commit-red (human)
- 2026-11-01 07:50 UTC - next: implement (agent)
- 2026-11-01 07:53 UTC - green: 116 passed, probe 0 failures; evidence saved, waiting on the feat(02-api) commit
- 2026-11-01 07:53 UTC - next: commit-green (human)
- 2026-11-01 07:56 UTC - gate FAILED [REVIEW] 30 passed, 1 failed: no review: run /review 02-api (writes reviews/02-api.md)
- 2026-11-01 07:57 UTC - next: commit-work (human)
- 2026-11-01 08:03 UTC - next: gate (agent)
- 2026-11-01 08:20 UTC - gate PASSED (31 checks)
- 2026-11-01 08:21 UTC - next: commit-done (human)
