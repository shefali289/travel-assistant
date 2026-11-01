# 01 · API contract first
**Outcome:** `openapi/openapi.yaml` describes the whole API before any implementation exists.
**Brief criteria:** scenario demo control, fixture schema, validation, error responses, contract-first.
**Depends on:** nothing · **Verified by:** probe (`scripts/probes/contract_shape.py`)

## 1. Plan
Run `/plan 01-contract`. The agent restates the outcome, lists questions, and waits. Write the agreed plan here.

Plan: _TBD_

Questions (every `- Q:` needs an `A:`; add any the agent raises):
- Q: Is `scenario` required, or optional with default `success`? (Recommendation: optional, default `success`.)
  A:
- Q: How is the response "labelled as a fixture"? An extra field (`source: "fixture"`) or only the message text? (Recommendation: add `source: "fixture"` and record it as a deliberate addition to the brief's `{message, hotels}`.)
  A:
- Q: What shape do the 422 and 503 bodies share? (Recommendation: one `ErrorResponse {code, message, retryable}`, overriding FastAPI's default 422 shape.)
  A:

## 2. Spec: acceptance criteria
- **AC1.1** Valid OpenAPI 3.x document at `openapi/openapi.yaml`.
- **AC1.2** `POST /recommendations` request: `message` required, string, non-blank (`minLength: 1` and/or `pattern: "\\S"`), with a sensible `maxLength`. `scenario` enum is exactly `success|empty|error`.
- **AC1.3** Responses `200`, `422` and `503` are declared, each with a JSON schema and an example.
- **AC1.4** `Hotel` requires `id, name, nightlyPrice (number), currency, breakfastIncluded (boolean), explanation`.
- **AC1.5** 200 body requires `message` and `hotels` and is labelled as fixture data.
- **AC1.6** `scenario` is described as a **demo control** (info or schema description), with the three behaviours spelled out, including "short delay" for success.
- **AC1.7** Optional `GET /health` for scripts.

Out of scope: auth, pagination, NL parsing, servers other than localhost.

## 3. Implement
1. Write the YAML by hand or with the agent. Keep schemas under `components/schemas`: `RecommendationRequest`, `Scenario`, `Hotel`, `RecommendationResponse`, `ErrorResponse`.
2. Run `python scripts/probes/contract_shape.py openapi/openapi.yaml` until it shows 0 failures.
3. Commit **before touching `api/app/main.py`**: `docs(01-contract): draft OpenAPI contract`. The gate for 02 checks this ordering.

## 4. Verify
`scripts/gate.sh 01-contract`

## 5. Review
Run `/review 01-contract`. Ask the agent to check the YAML against the brief line by line, not against its own assumptions. Specifically:
- Does every brief field and status appear with the right type?
- Are errors useful to a traveller (message text) and to a client (`retryable`)?
- Is anything specified that the brief did not ask for? Keep it, but record it under "Contract revisions" in APPROACH.

## Definition of done
Gate passes. The contract commit is the first code-bearing commit. Your Q/A answers are recorded above.

## Decisions & agent notes (copy the notable ones into APPROACH.md)
-

## Status log (updated automatically)
- 2026-10-31 08:50 UTC - next: plan (agent)
- 2026-11-01 07:02 UTC - on branch task/01-contract
