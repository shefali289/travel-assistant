# Approach

## Scope
_TODO_

## Assumptions
_TODO_ (copy the answered questions from the Plan sections in tasks/done/*.md)

## Decisions
_TODO_

## Trade-offs
_TODO_

## Checks and evidence
_TODO_ (pytest, Vitest, API probe, journey probe, screenshots; link files in evidence/)

## Mock boundaries
_TODO_ (API tests: real app, delay set to 0 · client tests: `fetch` stubbed · component tests: `@/lib/api` module mocked · journey probe: nothing mocked)

## Manual keyboard checks
_TODO_

## Limitations
_TODO_

## Not verified
_TODO_

## Time spent
| Task | Start | End | Minutes |
|---|---|---|---|
| setup + harness | | | |
| 01 | | | |
| _TODO_ | | | |

## Agent interactions
Harness: `AGENTS.md` (loaded via `CLAUDE.md`), `/plan`, `/implement`, `/review`, `scripts/gate.sh`. The full record is in `tasks/` and `tasks/done/` (Q/A, decisions, status log) and `reviews/*.md`.

_TODO_ 2–3 entries, each starting with **Exact excerpt** or **Retrospective summary**: what you asked, what the agent did, what you accepted or challenged, and why.

## Contract revisions
Baseline: `openapi/openapi.yaml`, task 01, 2026-11-01. It adds the following to the brief on purpose. No revisions since.

| Date | Addition to the brief | Reason |
|---|---|---|
| 2026-11-01 | Required `source` field on the 200 body, only value `"fixture"` | The brief asks for the response to be labelled as a fixture. A field lets a client check it without reading text. |
| 2026-11-01 | `code` on errors, enum `validation_error`, `service_unavailable` | The brief asks for useful errors. A code lets a client tell failures apart without matching message text. |
| 2026-11-01 | `retryable` boolean on errors | Tells the client whether to offer Retry: `true` on 503, `false` on 422 (shown in the examples). |
| 2026-11-01 | `scenario` is optional, default `success` | The brief lists `{message, scenario}` without saying whether `scenario` is required. A traveller's request should not need a demo control. |
| 2026-11-01 | 422 status for invalid requests, with the shared `ErrorResponse` shape in place of FastAPI's default | The brief asks for validation but names no status. One error shape means one code path in the client. |
| 2026-11-01 | `GET /health` returning `{status: "ok"}` | `scripts/serve.sh` waits on it. |
| 2026-11-01 | `message` must be non-blank (`minLength: 1` and `pattern: "\\S"`), with `maxLength: 500` | `minLength` alone lets `"   "` through. The brief sets no length limit, and 500 gives a limit to test. |
| 2026-11-01 | `additionalProperties: false` on request and response schemas | Unknown fields are rejected, so drift from the contract shows up in checks. |
| 2026-11-01 | The short delay applies to all three scenarios | The brief requires it only for `success`. Applying it to all makes the loading state visible for `empty` and `error` too. |
