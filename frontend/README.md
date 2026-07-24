# ClearCover frontend

A Next.js App Router application for Jira issue KAN-6. It lets a user enter
non-medical planning details, compare the three fictional KAN-5 plans, see a
transparent recommendation, and download a completed PDF summary locally.

All processing happens in the browser. The application does not send, store, or
log planning details.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Recommendation rules

Each fictional plan is checked against:

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
