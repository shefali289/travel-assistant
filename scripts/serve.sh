#!/usr/bin/env bash
# Start API (8000) and web (3000) in the background for probes. Usage: scripts/serve.sh start|stop
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; RUN="$ROOT/.run"; mkdir -p "$RUN"
wait_for() { for _ in $(seq 1 90); do curl -fsS -o /dev/null "$1" && return 0; sleep 1; done; echo "timeout waiting for $1"; tail -20 "$RUN"/*.log; return 1; }
case "${1:-start}" in
  start)
    ( cd "$ROOT/api" && { [ -d .venv ] && . .venv/bin/activate || true; } && nohup python -m uvicorn app.main:app --port 8000 > "$RUN/api.log" 2>&1 & echo $! > "$RUN/api.pid" )
    ( cd "$ROOT/web" && nohup npx next dev -p 3000 > "$RUN/web.log" 2>&1 & echo $! > "$RUN/web.pid" )
    wait_for http://localhost:8000/health || wait_for http://localhost:8000/docs
    wait_for http://localhost:3000 ;;
  stop)
    for f in "$RUN"/*.pid; do [ -f "$f" ] && { pkill -P "$(cat "$f")" 2>/dev/null || true; kill "$(cat "$f")" 2>/dev/null || true; rm -f "$f"; }; done ;;
esac
