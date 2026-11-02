# Hotel recommendation assistant (Serko take-home)

A traveller asks for a hotel, reviews fixture-based recommendations, and chooses one.
Next.js App Router + TypeScript + Tailwind frontend, FastAPI backend, local fixture data only.

**This repo is built task by task with a spec-driven AI-SDLC harness. Start at [`tasks/README.md`](tasks/README.md).**

## Runtime versions
Captured on Windows 11 in Git Bash, on the machine used to build this:

| Tool | Version |
|---|---|
| Node (`node -v`) | v23.1.0 |
| npm (`npm -v`) | 11.15.0 |
| Python (`python --version`) | 3.12.7 |
| Next (`npm ls next`) | 15.5.28 |
| React (`npm ls react`) | 19.1.0 |
| Vitest (`npm ls vitest`) | 3.2.7 |
| FastAPI (`pip show fastapi`) | 0.115.14 |
| pytest (`pip show pytest`) | 8.4.2 |

`jsdom` is pinned to 26 because newer versions crash Vitest on Node 23.

## Install
```bash
cd api && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && cd ..
cd web && npm install && npx playwright install chromium && cd ..
cp .env.example web/.env.local   # placeholders only; adjust if ports differ
```
On Windows, run these in Git Bash and use `.venv/Scripts/activate` instead of `.venv/bin/activate`.

## Run
```bash
cd api && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000   # terminal 1
cd web && npm run dev                                                        # terminal 2 → http://localhost:3000
```
On Windows in Git Bash, use `.venv/Scripts/activate` here too. In PowerShell, start the API from `api` with `.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000`, with no activation step.

## Check
Run these in order from the repo root, in Git Bash on Windows. The subshells return you to the root after each line.
```bash
(cd api && { . .venv/bin/activate 2>/dev/null || . .venv/Scripts/activate; } && python -m pytest -q)
(cd web && npm test && npm run typecheck && npm run lint)
scripts/serve.sh start                 # starts the API on 8000 and the web app on 3000
node scripts/probes/journey.mjs all    # browser journey against the real app, writes screenshots to evidence/
scripts/serve.sh stop                  # on Windows, stops whatever listens on 3000 and 8000, even servers it did not start
```
`scripts/gate.sh <task-id>` is the per-task quality gate used during the build (see `tasks/README.md`). It checks that you are on the branch `task/<id>`, so it reports a BRANCH failure on `main`.

## Environment
See `.env.example` (placeholders only). `NEXT_PUBLIC_API_BASE_URL`, `ALLOWED_ORIGINS`, `FIXTURE_DELAY_MS`. No secrets are needed to run the app. The web app reads `web/.env.local`. The API reads real environment variables only, not a `.env` file. Its defaults work with the commands above.

## Fixture and demo path
The hotels come from `api/fixtures/hotels.csv`, loaded when the API starts. No request text is interpreted, so the same hotels come back whatever you type. The **Demo scenario** select sets the `scenario` field on `POST /recommendations`:

| Demo scenario | API response | What the page shows |
|---|---|---|
| `success` | 200 with three hotels | Assistant reply, "Fixture data" label, three hotel cards |
| `empty` | 200 with no hotels | "No hotels to show" |
| `error` | 503, `retryable: true` | The API's message in an alert, with a **Retry** button |

One-minute demo, with both servers running, at http://localhost:3000:
1. Leave the Wellington example and `success`, and press **Find hotels**. A loading message shows, then three hotels.
2. Press **Choose City Garden**. The **Your choice** summary appears and takes focus.
3. Set the scenario to `empty` and press **Find hotels**.
4. Set the scenario to `error` and press **Find hotels**. The alert and **Retry** appear.
5. Set the scenario back to `success` and press **Retry**. Retry uses the scenario selected at that moment, so it recovers. Pressing **Retry** while `error` is still selected fails again.
6. Clear the request field and press **Find hotels** to see the inline blank-message error.

## Branch and commit
Repository: https://github.com/shefali289/travel-assistant. The submission is `main` at the tag `submission`. The README cannot hold its own commit hash, so the exact hash is in the submission message.
