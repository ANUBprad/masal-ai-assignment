# Architecture

## Purpose and scope

Masal Lead Intelligence is a browser-based sales copilot for real-estate teams. It helps a salesperson capture a property inquiry, inspect a transparent lead-priority score, request an AI-generated assessment, ask follow-up questions, and prepare for a call.

This document describes the implementation currently present in the repository. It does not imply multi-user accounts, a shared database, automatic customer messaging, or a trained lead-conversion model.

## High-level view

    ┌──────────────────────────────────────────────────────────┐
    │ Browser: Next.js client page                              │
    │ Lead intake · lead list · filters · lead detail           │
    │ Overview · Call prep · Copilot                            │
    └──────────────────────┬───────────────────────────────────┘
                           │ HTTPS / JSON
             ┌─────────────┼────────────────┐
             ▼             ▼                ▼
       /api/analyze    /api/chat      /api/call-brief
             │             │                │
             └─────────────┼────────────────┘
                           ▼
                    lib/ai.ts
                GoogleGenAI client
                           │
                           ▼
                    Gemini API

    Browser localStorage
    └── Persists the lead list in the current browser profile

The client page is implemented in app/page.tsx. Server endpoints are implemented as Next.js App Router route handlers. Shared request validation and AI-output parsing live in lib/validation.ts; the provider wrapper and environment configuration live in lib/ai.ts; deterministic lead scoring lives in lib/scoring.ts; shared domain types live in types/lead.ts.

## Component responsibilities

| Component | Responsibility |
|---|---|
| Browser dashboard | Capture and display leads; search/filter/sort; update lead status; display analysis, call brief and copilot conversation |
| Browser localStorage | Persist the current lead list under the versioned key masal-leads-v1 in one browser profile |
| POST /api/analyze | Validate lead details, request a structured assessment from Gemini, validate the generated shape and return the assessment |
| POST /api/chat | Validate the selected lead, bounded recent conversation history and question; ask Gemini for a concise contextual answer |
| POST /api/call-brief | Validate the lead; generate and validate a pre-call opening, three discovery questions, likely objection and closing question |
| lib/validation.ts | Define Zod request/response schemas and parse JSON returned by the model |
| lib/ai.ts | Create the Gemini client lazily, resolve the model from environment configuration, issue text-generation calls and map provider/configuration failures to user-facing errors |
| lib/scoring.ts | Compute an explainable 0–100 heuristic score, Hot/Warm/Cold priority and human-readable reasons |
| types/lead.ts | Define lead fields, statuses, priority labels, AI assessment and copilot message types |

## Request and data flows

### 1. Lead intake and analysis

    Salesperson fills intake form
        → browser POSTs lead fields to /api/analyze
        → leadInputSchema validates and bounds input
        → server builds a constrained prompt for Gemini
        → lib/ai.ts calls the configured Gemini model
        → readJsonObject parses model output
        → leadAnalysisSchema validates the assessment
        → API returns { analysis }
        → browser calculates priority and creates the lead
        → lead list state updates and is persisted to localStorage

If input is malformed or fails validation, the endpoint returns HTTP 400. Missing provider configuration returns HTTP 503. Quota/rate-limit failures return HTTP 429. Provider/authentication failures are mapped to a clear response, and malformed structured model output returns HTTP 502.

### 2. Contextual copilot

    Salesperson asks a question for the selected lead
        → browser sends lead + recent history + question to /api/chat
        → chatRequestSchema validates fields and limits history
        → server composes a prompt with the lead and conversation
        → Gemini generates a concise answer
        → browser adds the response to that lead's conversation UI

Conversation history is request context; it is not a server-side conversation database. Lead persistence is separate from the chat UI state.

### 3. Call preparation

    Salesperson opens Call prep for a selected lead
        → browser POSTs the lead to /api/call-brief
        → callBriefRequestSchema validates the request
        → Gemini generates a JSON brief
        → server parses and validates the required fields
        → browser displays opening, three questions, objection and closing question

### 4. Local persistence and priority

The browser loads sample leads initially, then checks localStorage after mount. If saved lead data is present and usable, it replaces the sample list. Lead edits are held in React state and written back to localStorage after storage initialization. Browser storage errors surface a notice rather than being silently treated as a successful save.

The priority score is calculated in application code, not by a model-only classification. Timeline, budget completeness, requirement specificity, purchase signals in the message and—when available—AI intent strength contribute to the score. The score is capped at 100 and mapped to Hot, Warm or Cold. This is a transparent workflow heuristic, not a validated prediction of conversion.

## Trust boundaries

- Browser form values and API request bodies are untrusted. The server validates them with Zod before prompt construction.
- Customer-provided text is explicitly framed as untrusted in prompts; prompts instruct the model not to follow instructions embedded in customer messages and not to invent facts.
- Model output is untrusted. Structured responses are parsed and checked against schemas before being returned.
- The Gemini API key is read from server-side environment variables in lib/ai.ts. It must not be exposed through a NEXT_PUBLIC_ variable or committed to the repository.
- Browser localStorage is controlled by the user and browser. It is not a trusted, shared, or encrypted source of record.

## Deployment topology

The application is designed to run as a Next.js deployment (for example, on Vercel). The browser serves the interactive UI; Next.js route handlers execute server-side and call Gemini over the network. The deployment environment must provide GEMINI_API_KEY and may provide GEMINI_MODEL. No separate application database or queue is present in the current implementation.

## Important implementation limits

- Lead data is stored per browser profile and does not synchronize across users or devices.
- There is no authentication, authorization, role management or tenant isolation in the current application.
- AI results can be incorrect and should be reviewed before use with customers.
- No automated email, messaging, booking or CRM write-back is implemented.
- Provider quota, selected-model availability, network connectivity and key validity affect AI functionality.
- The current test suite covers selected validation and scoring behavior; it does not by itself prove production credentials, live Gemini calls or deployment health.
