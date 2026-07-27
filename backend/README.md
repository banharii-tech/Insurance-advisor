# ClearCover V1 foundation API

This FastAPI service provides the KAN-7 V1 backend foundation and powers the
KAN-8 guided chat. It owns a disposable SQLite demo-session store, health
checks, and server-side AI extraction.

LiteLLM sends the conversation to `openrouter/openai/gpt-oss-120b`, pinned to
the Cerebras provider with fallback disabled. Routing also requires a
zero-data-retention endpoint and denies providers that collect request data.
The response must match an explicit Pydantic schema before it reaches the
browser.

The model only extracts planning criteria. It cannot access the fictional
plans and does not make the recommendation; that remains in the frontend's
deterministic `evaluatePlans` function.

## Local setup

Use Python 3.9 or newer:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
set -a
source ../.env
set +a
uvicorn app.main:app --reload
```

The service listens at `http://localhost:8000`. Use `DATABASE_PATH` to choose
the disposable SQLite file and `FRONTEND_ORIGINS` to configure CORS. The
repository-level `scripts/start.sh` sets both for the complete local stack.

Never commit the OpenRouter key. Do not enter names, contact details,
identification numbers, or medical information. The service does not persist
chat requests or responses; technical failures are logged without user
answers.

## Foundation endpoints

- `GET /health` verifies the API and temporary database.
- `POST /api/demo-sessions` creates a disposable session without credentials
  or authentication.
- `DELETE /api/demo-sessions/{session_id}` removes a disposable session.
- `POST /api/chat` performs schema-validated AI criteria extraction.

## Tests

```bash
PYTHONPATH=. python3 -m unittest discover -s tests -v
```
