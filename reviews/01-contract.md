# Review: 01-contract
Reviewer: AI agent (/review), triaged by: human (pending)
Diff: 0c7c4b2..e672aaf

## Spec compliance
The reviewer's checks came from a throwaway script outside the repo, not the implement agent's. "Script" below means that run: 0 failures.

| AC | Met? | Evidence (test / probe / file:line) |
|---|---|---|
| AC1.1 | yes | `openapi/openapi.yaml:1` is 3.1.0. `evidence/01-contract-probe.txt`: "document is valid OpenAPI". Script: the file decodes as ASCII. |
| AC1.2 | yes | `openapi/openapi.yaml:136-147`, Scenario at `:117-123`. Script: 500 chars accepted; 501, empty, spaces, tab and newline, null, number, missing message, bad scenario and extra field rejected. |
| AC1.3 | yes | `openapi/openapi.yaml:37-96`. 200 has `success` and `empty` examples (`:44`, `:68`). 422 and 503 both reference `ErrorResponse` (`:82`, `:92`), with the `code` enum at `:197-201`. Script: every example validates, and the `success` hotels equal `api/fixtures/hotels.csv`. |
| AC1.4 | yes | `openapi/openapi.yaml:148-170`. Probe: "Hotel: all six fields required". Script: string price, string breakfast and an extra field rejected. No constraints beyond types. |
| AC1.5 | yes | `openapi/openapi.yaml:171-189`, `const: fixture` at `:187`. Script: wrong source, missing source and an extra field rejected. |
| AC1.6 | yes | Read in full: `openapi/openapi.yaml:124-133` names the demo control and all three behaviours, each "after a short delay". Also `:11-12` and `:21-29`. |
| AC1.7 | yes | `openapi/openapi.yaml:97-114`. Script: the real app's `GET /health` validates against the declared schema. |
| AC1.8 | yes | `APPROACH.md:43-55` records all six required additions and three more. The `_TODO_` is gone. |

### Brief, line by line
| Brief line | Contract | Result |
|---|---|---|
| POST /recommendations accepts {message, scenario} | `:17-35`, `:134-147` | Match. `scenario` optional is a recorded addition. |
| Validate a non-empty message | `:141-143`, 422 at `:74-86` | Match. The 422 status is a recorded addition. |
| scenario documented as a demo control | `:11-12`, `:124-133` | Match. |
| success returns {message, hotels} with all three fixtures after a short delay | `:25`, `:44-67`, `:128-129` | Match. `source` is a recorded addition. |
| empty returns {message, hotels} with hotels: [] | `:26`, `:68-73`, `:130-131` | Match. |
| error returns HTTP 503 with a useful message | `:27`, `:87-96`, `:132-133` | Match in the example. See the message finding below. |
| Hotel fields, nightlyPrice number, breakfastIncluded boolean | `:148-170` | Match. |
| Label the response as a fixture | `:185-188` | Match. |
| Endpoints, schemas, validation and error responses in OpenAPI | whole file | Match. |

Nothing in the contract goes beyond the brief without being recorded in `APPROACH.md`. Errors are useful to a traveller (`message`) and to a client (`code`, `retryable`).

## Findings
<!-- One line each. Severity: BLOCKER | MAJOR | MINOR | NIT. Tick [x] when fixed or consciously accepted, and say why. -->
- [ ] MINOR: `AGENTS.md:28` still gives the delay only on the `success` line, while the contract applies it to all three (`openapi/openapi.yaml:126`). An agent on task 02 or 03 reading the summary could skip the delay on `empty` and `error`, and nothing would catch it, because the probes and tests set `FIXTURE_DELAY_MS=0`. Fix: update the summary, and carry the answer into `/plan 02-api` with a test that the delay applies to each scenario.
- [ ] MINOR: `openapi/openapi.yaml:178` and `:202`: `message` has no `minLength` on `RecommendationResponse` or `ErrorResponse`, so `{"code":"service_unavailable","message":"","retryable":true}` validates, although the brief asks for a useful message. AC2.3 and AC2.6 would catch this in tests, but the contract does not promise it. Fix: add `minLength: 1` to both, while no implementation depends on the schema.
- [ ] NIT: `openapi/openapi.yaml:47`: the example says "three Wellington hotels", but `:9` says the message text is not interpreted. If task 02 copies the text, a request for Auckland gets a Wellington answer. Fix: "Here are three hotels to consider."
- [ ] NIT: `tasks/01-contract.md:87` is stale. It lists moving `main` as open for the human, but `main` is now at `0c7c4b2`. Fix: add a line saying it is resolved.

Question for the human, not a defect: a 422 returns without the delay (`openapi/openapi.yaml:22`, decision at `tasks/01-contract.md:83`). The plan only covered the three scenarios. The reviewer agrees with this reading, but it was the agent's call.

Not verified:
- No real `/recommendations` response has been checked against the contract, because the endpoint does not exist until task 02. `scripts/probes/api_contract.py` loads this contract without a traceback and reports 19 failures, none of which were inspected individually. They are expected at this stage, and it is expected to pass after task 02.
- The delay is described only in prose, and no probe measures it.
- `contract_shape.py` still does not cover `maxLength`, examples, the three behaviours or `/health`, as agreed in the plan. This review's check of them does not stop a later edit from breaking them.
- The gate has not been re-run since the contract commit. The reviewer checked by hand that the branch has only `docs(01-contract)` commits, is up to date with `main`, and does not touch `api/`, `web/` or `scripts/`.

## Checks
- Correctness vs spec and OpenAPI: all ACs met, and the brief matched line by line.
- Tests: no new tests, because this task is probe-verified. Nothing was weakened, and the probes are unchanged.
- Accessibility: not applicable, no UI in this task.
- Security/hygiene: no secrets or personal data in the diff. Input limits are declared.
- Simplicity: five shared schemas as planned, plus one small inline `/health` schema.

Verdict: APPROVE
