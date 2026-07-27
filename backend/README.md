# ClearCover information collection API

This FastAPI service powers the KAN-8 guided chat. LiteLLM sends the
conversation to `openrouter/openai/gpt-oss-120b`, pinned to the Cerebras
provider with fallback disabled. Routing also requires a zero-data-retention
endpoint and denies providers that collect request data. The response must
match an explicit Pydantic schema before it reaches the browser.

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

The service listens at `http://localhost:8000`. Use
`NEXT_PUBLIC_CHAT_API_URL` to configure a different frontend endpoint.

Never commit the OpenRouter key. Do not enter names, contact details,
identification numbers, or medical information. The service does not persist
chat requests or responses; technical failures are logged without user
answers.

## Tests

```bash
PYTHONPATH=. python3 -m unittest discover -s tests -v
```
