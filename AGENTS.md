# AGENTS.md: repository context for coding agents

**How it is loaded:** Claude Code (CLI or VS Code extension) reads `CLAUDE.md` at session start, and `CLAUDE.md` imports this file with `@AGENTS.md`. To check, run `/memory` in Claude Code, or ask a fresh session "What is the API contract?" (task 06 asks you to save that as evidence). GitHub Copilot in VS Code and Codex read `AGENTS.md` directly.

## Product
A traveller asks for a hotel, reviews the assistant's recommendations, and chooses one. Local fixture data only. There is no NL parsing, live model, streaming, booking, auth, database or deployment.

## Repo map
- `openapi/openapi.yaml`: the API contract and **source of truth**. Change it first, then code, then record the revision in `APPROACH.md` under "Contract revisions".
- `api/`: FastAPI (`app/main.py`), fixtures in `fixtures/hotels.csv`, pytest in `tests/`.
- `web/`: Next.js App Router + TypeScript + Tailwind. Put components in `web/components/`, the API client in `web/lib/`, and Vitest tests next to the code as `*.test.ts(x)`.
- `tasks/`: the harness. Task docs are long-term, committed memory. `CURRENT_TASK.md` at the repo root is short-term, **git-ignored** memory.
- `scripts/gate.sh <task>`: the quality gate. `scripts/probes/` holds independent acceptance probes. `reviews/` holds AI code reviews. `evidence/` holds saved test runs and screenshots.

## Workflow (spec-driven, test-first)
`/plan <task>` (ask questions) → human answers and approves → `/implement <task>` (red commit → green commit) → `scripts/gate.sh <task>` → `/review <task>` → fix → gate passes → Done.
- **At session start, read `CURRENT_TASK.md` if it exists. Update it at every phase change. Never commit it.**
- **If anything is unclear or the spec conflicts with the brief, stop and ask. Do not guess.** Record each question and answer in the task doc's Plan section.
- Write tests from the acceptance criteria only, and put the AC id in the test title (`AC3.2 ...` or pytest `test_ac2_3_...`).
- Never weaken or delete a test to get green. If a test is wrong, explain why and fix it in its own commit.

## API contract (summary; the YAML is authoritative once written)
`POST /recommendations` with body `{ message: string (non-blank), scenario?: "success"|"empty"|"error" }`
- `success` → 200 `{ message, hotels: [h1,h2,h3], source: "fixture" }` after a short delay (`FIXTURE_DELAY_MS`, default 800)
- `empty` → 200 `{ message, hotels: [], source: "fixture" }`
- `error` → 503 `{ code, message, retryable: true }`
- invalid → 422 `{ code, message, retryable: false }`
- `Hotel = { id, name, nightlyPrice: number, currency, breakfastIncluded: boolean, explanation }`

## UI contract (accessible names the probes and tests rely on)
| Element | Role / name |
|---|---|
| Request field | textbox labelled **Your request**, prefilled with the Wellington example |
| Demo control | select labelled **Demo scenario** with options `success`, `empty`, `error` and visible text containing "Demo control" |
| Submit | button **Find hotels**. While loading its text is **Finding hotels…** and it is disabled with `aria-busy` |
| Blank message error | inline text containing "describe the hotel", textbox gets `aria-invalid` |
| Progress | `role="status"` containing "Finding hotels" |
| Results | assistant message, a "Fixture data" label, list labelled **Recommended hotels**, one `listitem` per hotel with an `h3` name, `NZD 220` + "per night", "Breakfast included" / "Breakfast not included", explanation |
| Empty | text containing "No hotels to show" |
| Error | `role="alert"` with the API message and a **Retry** button (only when retryable) |
| Choose | button named **Choose <hotel name>** with `aria-pressed` |
| Summary | region labelled **Your choice** that gets focus and shows name, `NZD 220 per night`, breakfast, explanation, and a fixture/no-booking note |

## Commands
```bash
cd api && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000      # API
pytest -q
cd web && npm install && npx playwright install chromium
npm run dev                                     # http://localhost:3000
npm test && npm run typecheck && npm run lint
scripts/gate.sh <task-id>                       # from repo root
```

## Constraints
- No secrets, keys or personal data in any file. Use env vars; `.env.example` holds placeholders only.
- Keyboard access: visible focus on every control, logical Tab order. Usable at 360px wide.
- 4-hour total cap. Prefer a working end-to-end path and evidence over polish.

## Known gotchas (found while validating this harness)
- `beforeEach(() => mock.mockReset())` returns the mock, and Vitest runs a returned function as teardown, so it calls the mock again. Use a block body: `beforeEach(() => { mock.mockReset(); })`.
- Vitest needs `esbuild.jsx = "automatic"` (already set in `web/vitest.config.mts`). Otherwise tests fail with "React is not defined", which is the wrong reason for a red run.
- Next.js dev renders its own empty `role="alert"` route announcer. In browser checks, filter alerts by text.
- The API needs CORS for `http://localhost:3000` (`ALLOWED_ORIGINS`).
