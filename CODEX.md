# Singapore Insurance Plan Finder

## Project purpose

Build a SaaS product that helps users find potentially suitable insurance plans available in Singapore.

The product initially covers:

- Hospitalisation insurance
- Critical illness insurance

The product must provide transparent plan suggestions based on information supplied by the user. It is a comparison and planning tool, not a replacement for regulated financial advice.

## Current implementation status

Keep this section current when a Jira ticket completes an implementation
phase.

- **KAN-5 — completed:** fictional client, plan, and recommendation datasets
  established the deterministic comparison rules.
- **KAN-6 — completed:** the responsive Next.js frontend, transparent
  comparison results, validation, and local PDF export are implemented.
- **KAN-8 — completed:** freeform AI-guided information collection is
  implemented through FastAPI, LiteLLM, OpenRouter, and Cerebras. Users review
  and edit structured criteria before the unchanged deterministic engine runs.
- **KAN-7 — completed:** the V1 technical foundation now includes the existing
  frontend and backend, a disposable SQLite data layer, a no-auth demo login,
  and unified local start/stop scripts. Recommendation features remain
  unchanged.
- **KAN-9 — completed:** the AI chat classifies hospital, critical illness,
  combined, and unsupported requests. Life-plan and financial-advice requests
  receive a clear boundary and guided choices for the closest supported
  fictional planning summaries.
- **KAN-10 — completed:** temporary sign-up/sign-in, isolated user workspaces,
  saved suggestion and document history, draft-only disclaimers, and
  professional SaaS interface polish are implemented.

## Delivery phases

### Phase 1: Frontend-only prototype

This phase was completed by KAN-5 and KAN-6.

The completed frontend-only prototype:

- let users compare hospitalisation and critical illness categories;
- collected age, residency, spouse citizenship, annual budget, and coverage
  needs;
- used three clearly fictional local plans;
- applied deterministic age, coverage, and budget checks;
- explained every plan result; and
- produced a local PDF summary.

The historical Phase 1 implementation did not include AI chat.

### Phase 2: AI-guided information collection

This phase was completed by KAN-8. The AI chat:

- Explains what information the user needs to provide.
- Asks only relevant follow-up questions.
- Converts the conversation into structured search criteria.
- Lets the user review and correct extracted information.
- Sends validated criteria to the deterministic recommendation logic.

The LLM must assist with information collection and field population. It must not independently make the final insurance recommendation.

### Phase 3: V1 technical foundation

This phase was completed by KAN-7. The development foundation:

- keeps the existing Next.js frontend and FastAPI backend;
- adds a disposable local database for temporary platform state;
- adds a clearly labelled fake login that creates a demo session without
  authentication or real credentials.
- provides repository-level scripts that start and stop the full local stack;
  and
- leaves authentication, persistent customer accounts, and new recommendation
  features out of scope.

KAN-10 later replaced this historical fake-login screen with temporary local
accounts and per-user draft history.

### Phase 4: Supported plan-type guidance

This phase was completed by KAN-9. The chat and summary flow:

- supports public/government hospital, critical illness, and combined planning
  summaries;
- presents those choices before the user starts typing;
- recognises life-plan and personal-financial-advice requests as unsupported;
- explains the boundary without presenting a supported type as equivalent
  advice;
- guides the user back into a supported journey; and
- labels the generated PDF for the selected supported planning type.

### Phase 5: Temporary multi-user workspaces

This phase was completed by KAN-10. The local prototype:

- lets users register and return with prototype-only credentials;
- salts and hashes passwords with PBKDF2-SHA256;
- isolates bearer sessions and saved drafts by user;
- automatically saves each completed fictional comparison;
- lets returning users view and download prior draft documents;
- clears accounts, sessions, and drafts whenever the backend restarts; and
- labels on-screen suggestions and PDFs as drafts requiring review.

## Implemented user journey

1. The user signs up or signs in to a temporary local workspace.
2. Returning users can review and download previously saved draft documents.
3. The user chooses a supported planning-summary type or describes their need.
4. The AI-guided chat redirects unsupported requests or collects the minimum
   relevant planning information.
5. The user reviews and can correct the extracted criteria.
6. The application validates the criteria.
7. The application filters and ranks fictional plans using documented,
   deterministic matching rules.
8. The application saves the reviewed profile and fictional comparison as a
   draft, then can create a local PDF.
9. The user can start over or sign out of the disposable account session.

## Implemented planning criteria

The current prototype collects only:

- age;
- Singapore residency status;
- spouse citizenship, for the summary only;
- maximum annual premium budget; and
- whether public/government hospital and/or critical illness coverage should be
  compared.

The current matching engine does not use residency or spouse citizenship as
eligibility rules because the fictional plan data does not provide a basis for
those rules.

The account screen separately collects a display name, email, and
prototype-only password. These values are never included in the AI chat.
Within the planning flow, do not collect names, NRIC numbers, contact details,
credentials, detailed medical records, or other unnecessary personal
information.

### Future V1 criteria, not yet implemented

Future Jira tickets may add smoker status, existing coverage, preferred
coverage amount, ward class, riders, deductible/co-insurance preferences,
critical illness stage, and preferred term. Do not treat these as current
capabilities until the data model, product data, UI, and deterministic rules
support them.

## Insurance product data

The current application uses three clearly marked fictional plans defined in
`frontend/src/data/plans.ts`. Each currently contains:

- stable plan, provider, and plan names;
- minimum and maximum age;
- public-hospital and critical-illness category flags;
- a fictional critical-illness amount; and
- a fictional annual premium.

Real plans are not implemented. Before adding them, extend the schema to
include verified eligibility, benefits, terms, exclusions, waiting periods,
source URL, last-reviewed date, and data status. Never invent real product
terms.

## Suggestion logic

The implemented matching logic is deterministic and remains separate from the
LLM:

1. `ageMatch` passes when the entered age is inside the fictional plan range.
2. `coverageMatch` passes when the plan includes every selected category.
3. `budgetMatch` passes when the fictional annual premium is within budget.
4. A candidate must pass all three checks.
5. When critical illness is selected, candidates rank by greatest fictional
   critical-illness coverage, then lower premium, then plan ID.
6. Otherwise, candidates rank by lower premium, then plan ID.
7. Results are labelled `Recommended`, `Alternative`, or `Not recommended`,
   with a plain-language explanation of each check.

This is a transparent prototype comparison, not a financial-suitability score
or regulated recommendation.

## Development process

Follow this workflow for every feature.

### 1. Read the Jira instructions

- Use the available Atlassian tools to open the relevant Jira issue.
- Read the complete description, acceptance criteria, comments, linked documents, dependencies, and current status.
- Treat the Jira issue as the source of truth for feature scope.
- If the Jira issue conflicts with this file, identify the conflict before implementation.
- Do not update Jira unless the task explicitly authorises the update.

### 2. Plan and develop the feature

- Inspect the existing repository and applicable instructions.
- Translate the Jira acceptance criteria into an implementation checklist.
- Identify affected components, data, tests, and user flows.
- Implement every in-scope requirement.
- Keep the solution as simple as possible.
- Do not add a backend, database, authentication, analytics, payments, or AI integration unless required by the Jira issue.
- Preserve existing conventions and unrelated user changes.

### 3. Test thoroughly

Test in proportion to the feature and include:

- Unit tests for filtering, eligibility, scoring, and validation logic.
- Component tests for forms, errors, empty states, and suggestion cards.
- End-to-end tests for both hospitalisation and critical illness journeys.
- Boundary tests for age, budget, missing fields, and no matching plans.
- Responsive checks for mobile and desktop layouts.
- Accessibility checks for keyboard navigation, labels, focus, contrast, and screen-reader-friendly status messages.

Run the project's formatting, linting, type-checking, build, and test commands. Do not report a check as passing unless it was actually run successfully.

### 4. Submit a pull request

- Use the available GitHub tools to create a focused branch, commits, and pull request.
- Include the Jira issue key in the branch name, commit message, and pull-request title when available.
- Keep unrelated changes out of the pull request.
- In the pull-request description, include:
  - Jira issue link
  - Summary
  - Main implementation decisions
  - Testing performed
  - Screenshots for visible UI changes
  - Known limitations or follow-up work
- Do not merge the pull request unless explicitly requested.

## AI implementation requirements

These requirements apply only when a Jira issue explicitly includes the AI-chat phase.

- Use LiteLLM to access the model through OpenRouter.
- Route requests to `gpt-oss-120b` with Cerebras as the inference provider.
- Keep model, provider, API base, and credentials in environment configuration.
- Never commit API keys or secrets.
- Verify the current LiteLLM and OpenRouter model/provider configuration against their official documentation during implementation.
- If a project-provided Cerebras skill is installed, read and follow it before implementing AI calls.
- If that skill is unavailable, report this and follow the repository configuration plus official provider documentation.
- Use structured outputs validated against an explicit schema.
- Reject or safely recover from invalid model output.
- Allow the user to review and edit extracted values before searching plans.
- Do not send unnecessary personal or medical information to the model.
- Log technical failures without logging sensitive user answers.
- Keep the deterministic eligibility and ranking engine separate from the LLM.
- There is an OPENROUTER_API_KEY in the .env file in the project root.

The implemented AI extraction result uses a structure similar to:

```json
{
  "assistant_message": "Please review these details.",
  "request_intent": "combined",
  "unsupported_topic": null,
  "criteria": {
    "age": 34,
    "annual_budget_sgd": 3000,
    "residency_status": "Foreigner",
    "spouse_citizenship": "Singapore citizen",
    "hospitalisation": {
      "required": true,
      "government_hospital": true
    },
    "critical_illness": {
      "required": true
    }
  },
  "missing_fields": [],
  "needs_confirmation": true,
  "ready_for_review": true
}
```

Hospitalisation and critical illness criteria use separate nested Pydantic
models. `request_intent` is one of `hospitalisation`, `critical_illness`,
`combined`, `unsupported`, or `undetermined`; unsupported requests additionally
classify the topic. Do not depend on free-form model prose for application
logic.

## Product and compliance safeguards

Current safeguards:

- use “suggested,” “potential match,” and prototype language;
- never claim that a plan is guaranteed to be suitable;
- clearly label every plan, provider, premium, and coverage amount as
  fictional;
- display the prototype and financial-advice disclaimer;
- block common contact and identification patterns before an AI request;
- do not log or persist raw chat messages in the backend;
- persist only account data, session tokens, reviewed profiles, and fictional
  comparison snapshots in the disposable database;
- salt and hash temporary passwords rather than storing plaintext; and
- label every suggestion and generated document as a draft requiring review.

Before introducing real product data, display verified sources, last-reviewed
dates, and warnings that terms, premiums, exclusions, underwriting, and
waiting periods require confirmation from the insurer.

## Definition of done

A feature is complete only when:

- The Jira requirements and acceptance criteria are satisfied.
- The implementation works for the supported user journeys.
- Tests and repository quality checks pass.
- User-facing states and errors are handled.
- Accessibility and responsive behaviour have been checked.
- Product data remains traceable to its source.
- Documentation is updated.
- A focused pull request has been created with evidence of testing.

## Current implementation reference

- **Frontend:** Next.js 16, React 19, TypeScript, Vitest, and Testing Library in
  `frontend/`.
- **Backend:** FastAPI and Pydantic in `backend/`; LiteLLM calls
  `openrouter/openai/gpt-oss-120b` through OpenRouter with Cerebras-only,
  no-fallback, zero-data-retention routing.
- **Temporary state:** SQLite stores temporary users, hashed passwords,
  sessions, and per-user draft snapshots. It resets at backend startup and is
  removed by the stop script.
- **Core endpoints:** `GET /health`, `POST /api/auth/sign-up`,
  `POST /api/auth/sign-in`, `DELETE /api/auth/sessions/current`,
  `GET|POST /api/suggestions`, and `POST /api/chat`.
- **Recommendation boundary:** the AI extracts criteria; the browser runs the
  unchanged deterministic plan evaluation.
- **Local run:** from the repository root, use `./scripts/start.sh`, open
  `http://127.0.0.1:3000`, and finish with `./scripts/stop.sh`.
- **Configuration:** keep `OPENROUTER_API_KEY` in the uncommitted root `.env`;
  optional database, origin, model, provider, base URL, timeout, and frontend
  API settings are environment-configurable.
- **Supported summaries:** public/government hospital, critical illness, and a
  combined summary. Life plans and personal financial advice remain outside
  the prototype.
- **Verified baseline:** 17 backend tests and 28 frontend tests pass; frontend
  lint and type-check also pass for the KAN-10 implementation.
- **Intentional limitations:** accounts are local and temporary rather than
  production identity, sessions do not survive a backend restart, and there is
  no production database, real insurer data, life-plan generation, personal
  financial advice, or final suitability assessment.
