#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
RUN_DIR="$PROJECT_ROOT/.run"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] && kill -0 "$(tr -d '[:space:]' < "$pid_file")" 2>/dev/null
}

if is_running "$BACKEND_PID_FILE" || is_running "$FRONTEND_PID_FILE"; then
  echo "ClearCover is already running. Use ./scripts/stop.sh first."
  exit 1
fi

mkdir -p "$RUN_DIR"

if [[ ! -x "$PROJECT_ROOT/backend/.venv/bin/uvicorn" ]]; then
  echo "Preparing backend dependencies..."
  python3 -m venv "$PROJECT_ROOT/backend/.venv"
  "$PROJECT_ROOT/backend/.venv/bin/pip" install \
    --requirement "$PROJECT_ROOT/backend/requirements-dev.txt"
fi

if [[ ! -x "$PROJECT_ROOT/frontend/node_modules/.bin/next" ]]; then
  echo "Preparing frontend dependencies..."
  npm ci --prefix "$PROJECT_ROOT/frontend"
fi

if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
fi

export DATABASE_PATH="${DATABASE_PATH:-$RUN_DIR/clearcover.sqlite3}"
export FRONTEND_ORIGINS="${FRONTEND_ORIGINS:-http://localhost:3000,http://127.0.0.1:3000}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://127.0.0.1:8000}"

(
  cd "$PROJECT_ROOT/backend"
  exec nohup .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
) >"$RUN_DIR/backend.log" 2>&1 &
echo "$!" >"$BACKEND_PID_FILE"

(
  cd "$PROJECT_ROOT/frontend"
  exec nohup ./node_modules/.bin/next dev --hostname 127.0.0.1 --port 3000
) >"$RUN_DIR/frontend.log" 2>&1 &
echo "$!" >"$FRONTEND_PID_FILE"

wait_for_url() {
  local name="$1"
  local url="$2"
  local pid_file="$3"

  for _ in {1..30}; do
    if curl --silent --fail "$url" >/dev/null 2>&1; then
      return 0
    fi
    if ! is_running "$pid_file"; then
      echo "$name stopped before it became ready."
      return 1
    fi
    sleep 1
  done

  echo "$name did not become ready within 30 seconds."
  return 1
}

if ! wait_for_url "Backend" "http://127.0.0.1:8000/health" "$BACKEND_PID_FILE" ||
  ! wait_for_url "Frontend" "http://127.0.0.1:3000" "$FRONTEND_PID_FILE"; then
  "$SCRIPT_DIR/stop.sh"
  echo "Startup failed. Review logs in $RUN_DIR."
  exit 1
fi

echo "ClearCover is ready:"
echo "  Frontend: http://127.0.0.1:3000"
echo "  Backend:  http://127.0.0.1:8000"
echo "  Logs:     $RUN_DIR"
