# System Design

## 1. Problem statement

Real-estate sales teams receive inquiries with different levels of urgency and detail. A salesperson needs a quick way to capture the inquiry, identify what is known or missing, prioritize follow-up, and prepare a useful next conversation.

Masal Lead Intelligence provides a lightweight, single-browser workflow that combines deterministic prioritization with optional model-generated assistance.

## 2. Goals and non-goals

### Goals

- Capture a consistent set of lead fields.
- Keep priority scoring understandable through a numeric score and reasons.
- Generate a structured lead assessment using Gemini.
- Support lead-specific follow-up questions and call preparation.
- Preserve leads across reloads in the same browser profile.
- Validate requests and generated structured data at the server boundary.
- Keep provider credentials on the server.

### Non-goals in the current version

- Shared multi-user CRM or cross-device synchronization.
- Authentication, user roles, organization tenancy or audit logs.
- A trained conversion-probability model or claims of predictive accuracy.
- Automatic customer communication or actions in external CRM systems.
- Guaranteed AI availability, latency or quota.

## 3. System context

    Salesperson
        │
        ▼
    Browser dashboard ───────► localStorage
        │
        │ JSON over HTTP
        ▼
    Next.js API route handlers
        │
        ├── Zod request validation
        ├── Prompt construction
        ├── Gemini client wrapper
        └── Zod response validation / error mapping
                    │
                    ▼
                Gemini API

The browser owns interactive state and local persistence. The server owns provider access, request validation, prompt construction and validation of generated structured results. The current server does not store leads or conversation history in a database.

## 4. Core domain model

A lead includes:

| Field | Meaning |
|---|---|
| id | Client-generated unique identifier |
| createdAt | ISO timestamp created by the browser |
| name | Customer name |
| location | Target location or area |
| propertyRequirement | Property type and requirements |
| budget | Customer-stated budget or uncertainty |
| timeline | Expected buying timeline |
| message | Original inquiry or customer context |
| status | New, Contacted, Qualified or Closed |
| analysis | Nullable structured AI assessment |
| priorityScore | Deterministic score from 0 to 100 |
| priority | Hot, Warm or Cold |
| scoreReasons | Human-readable reasons contributing to priority |

The AI assessment contains summary, intent, key requirements, objections, next action, suggested reply, intent strength and a confidence note. The confidence note is intended to distinguish stated facts from details that need confirmation; it is not a calibrated statistical confidence score.

Copilot messages have a role (user or assistant) and text content. The browser maintains conversation UI state; recent history is sent with each chat request and bounded by server-side validation.

## 5. API design

All three endpoints are Next.js route handlers and accept JSON POST requests.

### POST /api/analyze

Input: the six lead intake fields—name, location, propertyRequirement, budget, timeline and message.

Success response:

    { "analysis": { "...": "validated LeadAnalysis fields" } }

Behavior:
1. Parse the request body as JSON.
2. Validate the lead using leadInputSchema.
3. Build a prompt that restricts unsupported claims and treats customer text as untrusted.
4. Call Gemini through lib/ai.ts.
5. Parse JSON from the model response and validate with leadAnalysisSchema.
6. Return the validated analysis or a typed HTTP error response.

### POST /api/chat

Input: selected lead context, recent messages and a question.

Success response:

    { "answer": "Concise copilot response" }

Validation bounds the question, message content and history length. The prompt asks the model to use only supplied context, avoid invented pricing or availability claims, and state when information is missing.

### POST /api/call-brief

Input: selected lead context.

Success response:

    {
      "brief": {
        "opening": "...",
        "questions": ["...", "...", "..."],
        "objection": "...",
        "closingQuestion": "..."
      }
    }

The response schema requires exactly three discovery questions and bounded strings for each field.

### Error behavior

| Condition | Expected response |
|---|---|
| Invalid JSON or invalid request fields | HTTP 400 with a user-facing error |
| Gemini key missing or configuration absent | HTTP 503 |
| Quota/rate limit exceeded | HTTP 429 |
| Invalid/rejected API key | HTTP 401-style configuration error |
| Empty, unreadable or schema-invalid structured AI output | HTTP 502 |
| Other upstream AI failures | HTTP 502 |

Exact upstream messages may vary; the wrapper intentionally maps common failures to concise messages.

## 6. Lead-priority algorithm

The scoring function in lib/scoring.ts combines rules for:

- Buying timeline.
- Whether budget details are present and usable.
- Specificity of the property requirement.
- Purchase-intent signals in the customer's message.
- AI intent strength, when an analysis exists.

The result is capped at 100. A score of 70 or higher is Hot, 45–69 is Warm, and below 45 is Cold.

Why keep scoring deterministic? It makes the score reproducible, easy to inspect and independent of model wording. The AI assessment adds context but is not the only source of prioritization. The weights and thresholds are heuristic and have not been demonstrated to predict real-world conversion rates.

## 7. Persistence and lifecycle

- Sample leads make the interface explorable before a user has saved any leads.
- On mount, the page attempts to load the versioned localStorage key masal-leads-v1.
- When storage initialization completes, lead state is written back to localStorage as it changes.
- New lead creation calls the analysis API first; on success, the browser creates a lead record, calculates priority and saves the updated list.
- Status changes and analysis refreshes update client state and are persisted locally.
- Chat and call-prep requests use the selected lead as context. The current app has no server-side database for these interactions.

Because localStorage is browser-local, clearing site data or using another browser/profile can make saved leads unavailable. It should not be treated as a durable enterprise system of record.

## 8. Security and responsible AI

- Keep GEMINI_API_KEY in local server environment or deployment secret settings. Never put it in client-exposed environment variables, source control, screenshots or demo recordings.
- Validate all API input and bound strings, arrays and history lengths.
- Treat customer messages as untrusted content and explicitly resist instructions embedded in them.
- Parse and schema-check generated data before returning it to the UI.
- Do not let the model invent property availability, pricing, discounts, financing terms or other customer facts.
- Review AI-generated text before using it in a customer conversation.
- Avoid sending real sensitive customer data in demos; use the supplied sample leads or synthetic data.
- No authentication is currently implemented, so this version should not be presented as a production-ready, multi-user CRM for confidential customer records.

These controls reduce common failure modes but do not eliminate prompt injection, model error or privacy risk.

## 9. Reliability and operational behavior

- Missing key, invalid key, quota exhaustion and upstream failures are converted into actionable errors for the UI.
- The app remains explorable through sample leads even without a configured provider key, but AI-powered actions require working Gemini access.
- A failed AI analysis does not create a newly analyzed lead from that request.
- Model names can be configured using GEMINI_MODEL; the default in the current source is gemini-3.8-flash. Verify model access and quota in Google AI Studio rather than assuming a particular model is available to every account.
- Current automated checks cover selected validation and scoring cases plus type/lint/build checks in CI. A passing build is not the same as a live provider integration test.

## 10. Performance and scalability considerations

The current design is intentionally small: one Next.js application, browser-local persistence and direct server-to-provider requests. It avoids database and queue infrastructure for the assignment's single-user workflow.

The main latency-sensitive paths are the three Gemini-backed actions. They depend on network and provider response time. The current design does not include a background job system, persistent cache, rate-limit store, streaming response protocol or provider failover.

If the product evolves into a shared sales tool, likely next design steps are authentication and tenant-scoped authorization, a database as the system of record, server-side persistence for conversations, explicit retention controls, API rate limiting, request/trace logging with sensitive data redaction, and integration tests against a controlled provider stub. Those are future considerations, not implemented features.

## 11. Key trade-offs

| Decision | Benefit | Cost / limitation |
|---|---|---|
| localStorage for lead records | No database setup; easy local demo | Per-browser only; no synchronization or central backup |
| Deterministic scoring | Explainable and repeatable | Heuristic weights are not empirically calibrated |
| Gemini calls through server routes | API key stays out of browser bundle; one place for validation | Requires network, valid credentials and available quota |
| Structured model output validated with Zod | UI receives bounded, expected shapes | Model can still fail to produce valid output; retries may be needed |
| Single Next.js application | Simple deployment and low operational overhead | API, UI and provider usage scale together; no separate worker tier |

## 12. Local development and deployment

Requirements: Node.js 22+ and npm.

    npm install
    cp .env.example .env.local
    # Set GEMINI_API_KEY in .env.local; optionally set GEMINI_MODEL
    npm run dev

Before publishing a change, run:

    npm test
    npm run typecheck
    npm run lint
    npm run build

For deployment, configure GEMINI_API_KEY and optionally GEMINI_MODEL in the hosting provider's server-side environment settings, then redeploy. Never include the secret in the client bundle or repository. Confirm the deployed app with a manual smoke test using synthetic data, including one successful AI action and one configuration/error path where practical.

## 13. Future evolution

A sensible sequence, if the assignment is extended:

1. Verify the live demo and document the tested provider/model configuration without exposing secrets.
2. Add integration tests around provider failures and structured output handling using a controlled stub.
3. Introduce authentication and a database only when shared users and persistence are required.
4. Add observability with redaction before storing prompts, lead details or model outputs.
5. Evaluate scoring against labeled outcomes before making conversion-prediction claims.
