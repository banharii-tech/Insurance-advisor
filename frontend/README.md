# ClearCover frontend

A Next.js App Router application for Jira issues KAN-6, KAN-7, and KAN-8. A
clearly labelled fake login opens a disposable backend demo session without
authentication. A guided AI chat then collects the minimum non-medical
planning details in the user's own words. The user reviews and can correct the
structured criteria before the unchanged deterministic comparison checks
three fictional KAN-5 plans.

Chat messages are sent to the local backend and processed by OpenRouter on a
Cerebras zero-data-retention endpoint. The prototype does not persist or log
the answers. Plan evaluation and PDF creation happen in the browser. Names,
contact details, identification numbers, and medical information must not be
entered and are not required.

## Run locally

The preferred full-stack workflow from the repository root is:

```bash
./scripts/start.sh
./scripts/stop.sh
```

For frontend-only development, start the backend separately and run:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

Set `NEXT_PUBLIC_API_URL` when the backend is not available at
`http://localhost:8000`.

The backend pins `openrouter/openai/gpt-oss-120b` to the Cerebras provider,
disables provider fallback, and validates every extraction against explicit
Pydantic schemas. Configuration is documented in
[`../backend/.env.example`](../backend/.env.example); never commit credentials.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Backend schema tests:

```bash
cd backend
PYTHONPATH=. python3 -m unittest discover -s tests -v
```

## Recommendation rules

The LLM only collects and structures answers. After user confirmation, each
fictional plan is checked against:

1. inclusive age range;
2. every selected coverage category; and
3. the entered annual budget.

A plan is a candidate only if all three checks pass. When critical illness is
selected, the candidate with the greatest fictional CI coverage is recommended.
Otherwise, the candidate with the lowest annual premium is recommended. Ties
use lower premium and then plan ID.

## Important disclaimer

This is a fictional learning prototype, not financial advice. It contains no
real insurer, product, customer, premium, or coverage data and does not assess
real eligibility, underwriting, exclusions, waiting periods, claims, pricing,
or policy terms.
