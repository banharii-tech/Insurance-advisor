#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
RUN_DIR="$PROJECT_ROOT/.run"

stop_process() {
  local name="$1"
  local pid_file="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "$name is not running."
    return
  fi

  local pid
  pid="$(tr -d '[:space:]' < "$pid_file")"
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    for _ in {1..20}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.25
    done
    if kill -0 "$pid" 2>/dev/null; then
      kill -KILL "$pid"
    fi
    echo "Stopped $name."
  else
    echo "$name was not running."
  fi
  rm -f "$pid_file"
}

stop_process "frontend" "$RUN_DIR/frontend.pid"
stop_process "backend" "$RUN_DIR/backend.pid"

if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
fi

DATABASE_PATH="${DATABASE_PATH:-$RUN_DIR/clearcover.sqlite3}"
if [[ -f "$DATABASE_PATH" ]]; then
  rm -f "$DATABASE_PATH"
  echo "Removed the temporary demo database."
fi

echo "ClearCover is stopped."
