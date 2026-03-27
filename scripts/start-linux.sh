#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."
PIDS_DIR="$ROOT/.pids"

mkdir -p "$PIDS_DIR"

echo "Starting Prelegal backend..."
cd "$ROOT/backend"
uv sync --quiet
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
echo $! > "$PIDS_DIR/backend.pid"

echo "Starting Prelegal frontend..."
cd "$ROOT/frontend"
npm install --silent
npm run dev &
echo $! > "$PIDS_DIR/frontend.pid"

echo ""
echo "Prelegal is running:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo ""
echo "Run scripts/stop-mac.sh to stop."
