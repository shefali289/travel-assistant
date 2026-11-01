# 02 · FastAPI recommendations API
**Outcome:** `POST /recommendations` validates input and serves the three demo scenarios from the CSV fixture, exactly as `openapi/openapi.yaml` says.
**Brief criteria:** non-empty validation, success/empty/error(503), short delay, fixture CSV types, fixture label, API validation/contract checks.
**Depends on:** 01 · **Verified by:** tests + probe (`scripts/probes/api_contract.py`)

## 1. Plan
Run `/plan 02-api`. Record the plan and the answers here.

Plan: _TBD_

Questions:
- Q: Should a whitespace-only message be rejected (422) or trimmed and accepted? (Recommendation: reject. "Non-empty" means non-blank.)
  A:
- Q: Is the delay applied to every scenario or only success? (Recommendation: every scenario, so loading is visible for empty and error too. The brief only requires it for success.)
  A:
- Q: Reject unknown request fields (strict) or ignore them? (Recommendation: reject, `extra="forbid"`, so it matches `additionalProperties: false`.)
  A:

## 2. Spec: acceptance criteria (put the AC id in each pytest name, e.g. `test_ac2_3_success_returns_three_fixtures`)
- **AC2.1** The CSV at `api/fixtures/hotels.csv` is parsed into hotels with `nightlyPrice` as a number and `breakfastIncluded` as a boolean. An invalid boolean raises an error.
- **AC2.2** Missing, empty, whitespace-only, `null` or non-string `message` → **422** `ErrorResponse` (`code: validation_error`, `retryable: false`) whose message names the field.
- **AC2.3** `scenario=success` → 200 with exactly h1, h2, h3 (all fields equal to the CSV), a non-empty `message`, and `source: "fixture"`.
- **AC2.4** No `scenario` → treated as `success`.
- **AC2.5** `scenario=empty` → 200 with `hotels: []` and a helpful message.
- **AC2.6** `scenario=error` → **503** `ErrorResponse` (`code: service_unavailable`, `retryable: true`) with a traveller-friendly message that says to try again.
- **AC2.7** Unknown scenario, unknown field, too-long message, or non-JSON body → 422.
- **AC2.8** Every response body validates against the matching schema in `openapi/openapi.yaml`. Load the YAML in the test and validate with `jsonschema`, using a `referencing` registry for `$ref`.
- **AC2.9** Delay comes from `FIXTURE_DELAY_MS` (default 800ms). Tests set it to 0.
- **AC2.10** CORS allows `ALLOWED_ORIGINS` (default `http://localhost:3000`) for POST with `Content-Type`.

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
-
