# Architecture

## Application boundaries

```text
Browser (Next.js client)
  ├─ Lead workspace: localStorage for lead data
  └─ Same-origin JSON requests (no credentials sent)
          |
          v
Next.js Route Handlers
  ├─ Apply per-IP rate limit
  ├─ Load the server-side Gemini key/model from env
  ├─ Validate request JSON and lead fields
  ├─ Apply safe error mapping
  └─ Create an independent Gemini request per operation
          |
          v
Google Gemini REST API (HTTPS)
```

## Key decisions

- **Server-side key:** the deployed app reads `GEMINI_API_KEY` from the host environment, so reviewers can test with no setup and no secret of their own.
- **No client credentials:** the browser never holds or transmits a key; keys are not persisted to localStorage, cookies, or logs.
- **Request-scoped provider calls:** each route builds credentials per request; no global mutable provider client is shared between users.
- **Per-IP rate limiting:** a small in-memory limiter blunts casual abuse of the shared free-tier key (per-instance only; see `lib/rate-limit.ts`).
- **Allowlisted models:** the model comes from `GEMINI_MODEL` (or a default), never from the client.
- **Local-first leads:** simple, no database setup, useful for a time-boxed assignment. This is not multi-device persistence.
- **Explainable priority score:** deterministic rules complement the AI narrative and provide a stable initial ranking.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/analyze` | Generate structured lead analysis |
| POST | `/api/chat` | Answer a lead-specific follow-up |
| POST | `/api/call-brief` | Generate a sales call brief |

Endpoints take JSON bodies only — no credential headers. Each request is rate-limited per client IP and uses the server-side key. Responses use `Cache-Control: no-store`.
