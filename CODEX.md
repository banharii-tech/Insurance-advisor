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

## Delivery phases

### Phase 1: Frontend-only prototype

This phase was completed by KAN-5 and KAN-6.

Build a frontend-only prototype that:

- Lets users choose between hospitalisation and critical illness insurance.
- Collects the minimum information required to search for suitable plans.
- Uses local mock data for insurance products.
- Applies deterministic, explainable matching rules.
- Displays a ranked shortlist of suitable plans.
- Explains why each plan was suggested.
- Shows important plan information, limitations, and source dates.
- Works without a backend, database, authentication, or LLM.

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

- Keep the existing Next.js frontend and FastAPI backend.
- Add a disposable local database for temporary platform state.
- Add a clearly labelled fake login that creates a demo session without
  authentication or real credentials.
- Provide repository-level scripts that start and stop the full local stack.
- Keep authentication, persistent customer accounts, and new recommendation
  features out of scope.

## Implemented user journey

1. The user enters through a no-auth demo login.
2. The AI-guided chat collects the minimum relevant planning information.
3. The user reviews and can correct the extracted criteria.
4. The application validates the criteria.
5. The application filters and ranks fictional plans using documented,
   deterministic matching rules.
6. The application displays an explained shortlist and can create a local PDF
   summary.
7. The user can start over or end the disposable demo session.

## Suggested form fields

Collect only fields required by the prototype.

### Shared fields

- Age
- Singapore residency status
- Smoker status, when relevant
- Maximum monthly or annual premium budget
- Existing relevant coverage
- Preferred coverage amount

### Hospitalisation fields

- Preferred hospital or ward class
- Existing MediShield Life or Integrated Shield Plan coverage
- Preference for a rider
- Acceptable deductible or co-insurance

### Critical illness fields

- Required coverage amount
- Early-stage, late-stage, or multi-stage coverage preference
- Preferred coverage term
- Existing critical illness coverage

Do not collect names, NRIC numbers, contact details, detailed medical records, or other unnecessary personal information in the prototype.

## Insurance product data

Use fictional or clearly marked sample plans during Phase 1.

Each plan should include:

- Stable plan ID
- Insurer name
- Plan name
- Insurance category
- Minimum and maximum entry age
- Residency eligibility
- Indicative premium or premium band
- Coverage amount or benefit limit
- Policy term
- Key benefits
- Deductible and co-insurance, when applicable
- Waiting periods
- Major exclusions or limitations
- Source URL
- Effective or last-reviewed date
- Data status, such as `sample`, `verified`, or `stale`

Never invent real product terms. Real plans may be added only from verified, current sources and must retain their source URL and review date.

## Suggestion logic

Keep matching deterministic and explainable.

1. Exclude plans that fail mandatory eligibility requirements.
2. Exclude plans outside the user's stated budget.
3. Score the remaining plans using relevant factors such as:
   - Coverage fit
   - Budget fit
   - Preferred hospital or ward class
   - Critical illness stage preference
   - Desired policy term
   - Existing coverage and possible duplication
4. Return a small ranked shortlist rather than claiming that one plan is definitively the best.
5. Attach reason codes and plain-language explanations to every result.
6. Show a manual-review message when information is missing, uncertain, or potentially conflicting.

The UI must distinguish:

- Eligibility
- Matching score
- Estimated affordability
- Missing information
- Final suitability, which requires appropriate professional assessment

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

An AI extraction result should follow a structure similar to:

```json
{
  "insuranceType": "hospitalisation",
  "criteria": {
    "age": 35,
    "residencyStatus": "citizen",
    "maximumAnnualPremium": 1500,
    "preferredWardClass": "A",
    "existingCoverage": true
  },
  "missingFields": [],
  "needsConfirmation": false
}
```

Define separate validated schemas for hospitalisation and critical illness criteria. Do not depend on free-form model prose for application logic.

## Product and compliance safeguards

- Use language such as “suggested plans,” “potential matches,” or “shortlist.”
- Do not state that a plan is guaranteed to be suitable.
- Display that premiums and product terms may change.
- Display the product-data source and last-reviewed date.
- Explain that exclusions, underwriting, waiting periods, and final premiums require confirmation from the insurer.
- Provide a clear prototype and financial-advice disclaimer.
- Do not use synthetic or stale information as if it were current product data.
- Treat user answers as sensitive financial information even when the prototype stores them only in browser memory.

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
