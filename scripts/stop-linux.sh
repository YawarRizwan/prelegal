#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIDS_DIR="$SCRIPT_DIR/../.pids"

stop_pid() {
  local file="$1"
  if [ -f "$file" ]; then
    local pid
    pid=$(cat "$file")
    if kill -0 "$pid" 2>/dev/null; then
      # Kill the process and any direct children (e.g. node spawned by npm)
      pkill -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
      echo "Stopped PID $pid"
    fi
    rm -f "$file"
  fi
}

stop_pid "$PIDS_DIR/backend.pid"
stop_pid "$PIDS_DIR/frontend.pid"

echo "Prelegal stopped."
