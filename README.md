# Hotel recommendation assistant (Serko take-home)

A traveller asks for a hotel, reviews fixture-based recommendations, and chooses one.
Next.js App Router + TypeScript + Tailwind frontend, FastAPI backend, local fixture data only.

**This repo is built task by task with a spec-driven AI-SDLC harness. Start at [`tasks/README.md`](tasks/README.md).**

## Runtime versions
_TODO_ (task 06: paste the output of the version commands)

## Install
```bash
cd api && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && cd ..
cd web && npm install && npx playwright install chromium && cd ..
cp .env.example web/.env.local   # placeholders only; adjust if ports differ
```

## Run
```bash
cd api && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000   # terminal 1
cd web && npm run dev                                                        # terminal 2 → http://localhost:3000
```

## Check
```bash
cd api && pytest -q
cd web && npm test && npm run typecheck && npm run lint
scripts/gate.sh <task-id>          # per-task quality gate (see tasks/README.md)
```

## Environment
See `.env.example` (placeholders only). `NEXT_PUBLIC_API_BASE_URL`, `ALLOWED_ORIGINS`, `FIXTURE_DELAY_MS`. No secrets are needed to run the app.

## Fixture and demo path
_TODO_ (task 06: where the fixture lives, how the Demo scenario control maps to success / empty / error 503, and a 1-minute demo script)

## Branch and commit
_TODO_ (task 06)
