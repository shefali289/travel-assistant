# 01 · API contract first
**Outcome:** `openapi/openapi.yaml` describes the whole API before any implementation exists.
**Brief criteria:** scenario demo control, fixture schema, validation, error responses, contract-first.
**Depends on:** nothing · **Verified by:** probe (`scripts/probes/contract_shape.py`)

## 1. Plan
Run `/plan 01-contract`. The agent restates the outcome, lists questions, and waits. Write the agreed plan here.

Plan:
1. Write `openapi/openapi.yaml` (OpenAPI 3.1.0, ASCII only): `POST /recommendations`, `GET /health`, and the five schemas under `components/schemas`.
2. Add examples: `success` and `empty` for 200, one each for 422 and 503.
3. Replace the `_TODO_` under "Contract revisions" in `APPROACH.md` with the additions to the brief.
4. Run `scripts/probes/contract_shape.py` until 0 failures. No new test files: this task is probe-verified.
5. Run `scripts/gate.sh 01-contract`, then `/review 01-contract`, which checks what the probe misses line by line.

Questions (every `- Q:` needs an `A:`; add any the agent raises):
- Q: Is `scenario` required, or optional with default `success`? (Recommendation: optional, default `success`.)
  A: Optional, default `success`.
- Q: How is the response "labelled as a fixture"? An extra field (`source: "fixture"`) or only the message text? (Recommendation: add `source: "fixture"` and record it as a deliberate addition to the brief's `{message, hotels}`.)
  A: Required `source` field whose only value is `"fixture"`, recorded as a deliberate addition.
- Q: What shape do the 422 and 503 bodies share? (Recommendation: one `ErrorResponse {code, message, retryable}`, overriding FastAPI's default 422 shape.)
  A: One `ErrorResponse {code, message, retryable}`, overriding FastAPI's default 422 shape.
- Q: Which OpenAPI version? (Recommendation: 3.1.0, because `api_contract.py` validates with JSON Schema 2020-12.)
  A: 3.1.0.
- Q: What is the `maxLength` for `message`? (Recommendation: 500. AC2.7 needs a limit to test.)
  A: 500.
- Q: How is "non-blank" expressed? (Recommendation: both `minLength: 1` and `pattern: "\\S"`, because `minLength` alone lets `"   "` through.)
  A: Both `minLength: 1` and `pattern: "\\S"`.
- Q: Should schemas reject unknown fields? (Recommendation: `additionalProperties: false` on request and response schemas. Also settles the matching question in task 02.)
  A: Yes, `additionalProperties: false` on request and response schemas.
- Q: Which scenarios get the delay? (Recommendation: all three, described as a short delay with no fixed duration. Also settles the delay question in task 02.)
  A: All three, described as a short delay with no fixed duration.
- Q: How is what the probe misses covered? (Recommendation: leave the probe alone and check `maxLength`, examples, the three behaviours and `/health` line by line in `/review`.)
  A: Leave the probe alone and check them line by line in `/review`.
- Q: Should `code` be a fixed list? (Recommendation: enum of `validation_error` and `service_unavailable`; `retryable` stays a plain boolean, with examples showing `false` for 422 and `true` for 503.)
  A: Enum of `validation_error` and `service_unavailable`; `retryable` stays a plain boolean, with examples showing `false` for 422 and `true` for 503.
- Q: Should `/health` be in the contract? (Recommendation: yes, as `{status: "ok"}`. It is already in `api/app/main.py` and `scripts/serve.sh` waits on it.)
  A: Yes, as `{status: "ok"}`.
- Q: How tightly are `hotels` and `Hotel` constrained? (Recommendation: no `minItems`/`maxItems`, no currency pattern, no price minimum. The brief only specifies types, and `hotels` holds 0 or 3 items.)
  A: No `minItems`/`maxItems`, no currency pattern, no price minimum.
- Q: When are additions to the brief recorded? (Recommendation: now, in `APPROACH.md` under "Contract revisions", in the contract commit: `source`, `code`, `retryable`, optional `scenario`, the 422 status, `/health`.)
  A: Now, in `APPROACH.md` under "Contract revisions", in the contract commit.
- Q: "First code-bearing commit" cannot be literally true, because the starter commit already has `api/app/main.py` and `web/`. How should it read? (Recommendation: "committed before any `/recommendations` implementation", which is what the task 02 gate checks.)
  A: "Committed before any `/recommendations` implementation". Definition of done reworded.

## 2. Spec: acceptance criteria
- **AC1.1** Valid OpenAPI 3.1.0 document at `openapi/openapi.yaml`, ASCII only.
- **AC1.2** `POST /recommendations` request: `message` required, string, non-blank (`minLength: 1` and `pattern: "\\S"`), with `maxLength: 500`. `scenario` optional, default `success`, enum exactly `success|empty|error`. Unknown fields rejected (`additionalProperties: false`).
- **AC1.3** Responses `200`, `422` and `503` are declared, each with a JSON schema and an example. 200 has both a `success` and an `empty` example. 422 and 503 share `ErrorResponse {code, message, retryable}`, with `code` an enum of `validation_error|service_unavailable`.
- **AC1.4** `Hotel` requires `id, name, nightlyPrice (number), currency, breakfastIncluded (boolean), explanation`, and rejects unknown fields. No extra constraints beyond these types.
- **AC1.5** 200 body requires `message`, `hotels` and `source`, whose only value is `"fixture"`, and rejects unknown fields.
- **AC1.6** `scenario` is described as a **demo control** (info or schema description), with the three behaviours spelled out, including a "short delay" that applies to all three scenarios.
- **AC1.7** `GET /health` for scripts returns `{status: "ok"}`.
- **AC1.8** `APPROACH.md` "Contract revisions" records the additions to the brief: `source`, `code`, `retryable`, optional `scenario`, the 422 status, `/health`.

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
Gate passes. The contract is committed before any `/recommendations` implementation. Your Q/A answers are recorded above.

## Decisions & agent notes (copy the notable ones into APPROACH.md)
- Keep `openapi/openapi.yaml` ASCII-only. Both probes read it with `read_text()` and no encoding, so non-ASCII characters could be misread on Windows.
- No `test` or `feat` commits for this task: it is probe-verified, so `/implement` skips red and green.
- `contract_shape.py` does not check `maxLength`, examples, the three scenario behaviours or `/health`, so the gate can pass without them (see the probe coverage question in the Plan section).
- All plan recommendations accepted by the human. The answers on unknown fields and the delay also settle the matching questions in `tasks/02-api.md`, so carry them into `/plan 02-api`.

## Status log (updated automatically)
- 2026-10-31 08:50 UTC - next: plan (agent)
- 2026-11-01 07:02 UTC - on branch task/01-contract
- 2026-11-01 07:06 UTC - next: answers (human)
- 2026-11-01 07:10 UTC - next: commit-plan (human)
