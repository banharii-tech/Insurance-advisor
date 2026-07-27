# ClearCover V1 foundation API

This FastAPI service provides the V1 backend foundation and powers the guided
chat. It owns disposable local accounts, bearer sessions, per-user draft
history, health checks, and server-side AI extraction.

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
The database resets on every backend start.

Never commit the OpenRouter key. Account names and emails are kept separate
from the planning chat and are never sent to the model. Do not enter contact
details, identification numbers, or medical information in the chat. The
service does not persist raw chat requests or responses; technical failures
are logged without user answers.

## Foundation endpoints

- `GET /health` verifies the API and temporary database.
- `POST /api/auth/sign-up` creates a temporary account and bearer session.
- `POST /api/auth/sign-in` verifies a salted password hash and creates a
  session.
- `DELETE /api/auth/sessions/current` signs out the bearer session.
- `GET /api/suggestions` lists the signed-in user's saved drafts.
- `POST /api/suggestions` saves a validated comparison snapshot.
- `POST /api/chat` performs schema-validated AI criteria extraction.

## Tests

```bash
PYTHONPATH=. python3 -m unittest discover -s tests -v
```
