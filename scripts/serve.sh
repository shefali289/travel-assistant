#!/usr/bin/env bash
# Start API (8000) and web (3000) in the background for probes. Usage: scripts/serve.sh start|stop
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; RUN="$ROOT/.run"; mkdir -p "$RUN"
# --noproxy: these URLs are always local, and a corporate proxy would answer them with a 403.
wait_for() { for _ in $(seq 1 90); do curl --noproxy '*' -fsS -o /dev/null "$1" && return 0; sleep 1; done; echo "timeout waiting for $1"; tail -20 "$RUN"/*.log; return 1; }
case "${1:-start}" in
  start)
    ( cd "$ROOT/api" && { [ -f .venv/Scripts/activate ] && . .venv/Scripts/activate; [ -f .venv/bin/activate ] && . .venv/bin/activate; true; } && nohup python -m uvicorn app.main:app --port 8000 > "$RUN/api.log" 2>&1 & echo $! > "$RUN/api.pid" )
    ( cd "$ROOT/web" && nohup npx next dev -p 3000 > "$RUN/web.log" 2>&1 & echo $! > "$RUN/web.pid" )
    wait_for http://localhost:8000/health || wait_for http://localhost:8000/docs
    wait_for http://localhost:3000 ;;
  stop)
    for f in "$RUN"/*.pid; do [ -f "$f" ] && { pkill -P "$(cat "$f")" 2>/dev/null || true; kill "$(cat "$f")" 2>/dev/null || true; rm -f "$f"; }; done
    # On Windows, kill does not reach the real server processes, so stop whatever listens on our ports.
    if command -v taskkill >/dev/null; then
      for port in 8000 3000; do
        netstat -ano | awk -v p=":$port\$" '/LISTEN/ && $2 ~ p {print $5}' | sort -u | while read -r pid; do taskkill //F //T //PID "$pid" >/dev/null 2>&1 || true; done
      done
    fi ;;
esac
