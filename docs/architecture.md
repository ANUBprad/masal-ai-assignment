# Architecture

## Application boundaries

```text
Browser (Next.js client)
  ├─ Setup screen: key + model held in React state
  ├─ Lead workspace: localStorage for lead data
  └─ Same-origin requests with credential headers
          |
          v
Next.js Route Handlers
  ├─ Validate API key/model headers
  ├─ Validate request JSON and lead fields
  ├─ Apply safe error mapping
  └─ Create an independent Gemini request per operation
          |
          v
Google Gemini REST API (HTTPS)
```

## Key decisions

- **Bring your own key:** reviewers can use their own free-tier key without a project owner secret.
- **In-memory key handling:** no persistence to localStorage, cookies, or server logs by application code. A page reload clears the key.
- **Request-scoped provider calls:** each route uses the credentials supplied for that request; no global mutable provider client is shared between users.
- **Allowlisted models:** clients cannot request arbitrary model names.
- **Local-first leads:** simple, no database setup, useful for a time-boxed assignment. This is not multi-device persistence.
- **Explainable priority score:** deterministic rules complement the AI narrative and provide a stable initial ranking.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/connection-test` | Validate key/model by calling Gemini |
| POST | `/api/analyze` | Generate structured lead analysis |
| POST | `/api/chat` | Answer a lead-specific follow-up |
| POST | `/api/call-brief` | Generate a sales call brief |

All endpoints require `x-gemini-api-key` and `x-gemini-model` headers. Responses use `Cache-Control: no-store`.
