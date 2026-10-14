# Masal AI — Real-estate Lead Intelligence

A Next.js application for real-estate salespeople to understand inbound enquiries, prioritize leads, prepare for calls, and draft context-aware follow-ups.

## Features

- **Lead intake:** capture name, location, property requirement, budget, buying timeline, and customer message.
- **AI lead analysis:** summary, intent, requirements, concerns, recommended next action, and a suggested reply.
- **Prioritization:** transparent rule-based score with Hot / Warm / Cold grouping.
- **Sales copilot:** ask follow-up questions grounded in the selected lead's context.
- **Call brief (the invented feature):** generate a call objective, talking points, discovery questions, watch-outs, and an opening line. This is the extra feature added on top of the required core workflow (lead intake, AI analysis, conversational copilot, lead list & prioritization, clear display).
- **Browser persistence:** leads are stored locally in this browser. Demo leads are included on first run.
- **No-setup AI:** the deployed app reads a server-side Gemini key from the `GEMINI_API_KEY` environment variable, so reviewers can open it and test without entering anything.

## Requirements

- Node.js 22.6+ (Node.js 22 LTS recommended). The test runner uses Node's built-in TypeScript stripping (`--experimental-strip-types`, added in Node 22.6), so `npm test` will not run on older releases.
- npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey) set as the `GEMINI_API_KEY` environment variable (see below).

## Run locally

```bash
npm install
# add GEMINI_API_KEY=<your key> to .env.local  (GEMINI_MODEL is optional)
npm run dev
```

Open `http://localhost:3000`. The server calls Gemini with the environment key; there is no in-app setup. If `GEMINI_API_KEY` is unset, AI actions return a clear "server is not configured" error while the rest of the UI still loads.

Run quality checks:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Architecture

- `app/page.tsx` — lead workspace, lead intake, prioritization, AI results, chat, and call brief UI.
- `app/api/*` — same-origin server endpoints for lead analysis, chat, and call brief.
- `lib/ai.ts` — server credential loading, model allowlist, safe provider errors.
- `lib/gemini.ts` — request-scoped Gemini REST calls and response validation.
- `lib/http.ts` — request guard (rate limit + credentials) and shared JSON/error helpers.
- `lib/rate-limit.ts` — per-IP request limiting and a coarse quota warning.
- `lib/scoring.ts` — deterministic lead scoring and priority mapping.
- `lib/validation.ts` — server-side input validation.
- `types/lead.ts` — shared TypeScript contracts.

### AI request flow

1. The browser calls a same-origin Next.js API route with a JSON body only — no key is ever sent from the client.
2. The server applies a per-IP rate limit, then reads `GEMINI_API_KEY` (and optional `GEMINI_MODEL`) from the environment.
3. The server validates the request body and model allowlist, then makes a request-scoped HTTPS call to Gemini.
4. The server returns the model result or a safe error message. Provider errors and credentials are not logged or returned verbatim.

## Security and privacy notes

- The Gemini key lives only in the host's environment. Never commit it or paste it into source control, screenshots, or bug reports.
- The API routes validate request bodies, constrain model IDs, and rate-limit per client IP.
- Leads and chat history are saved to the browser's localStorage. Do not enter sensitive personal data unless you understand that this is a local demo.
- Rate limiting is in-memory and per serverless instance, so it is not a global cap (see the note in `lib/rate-limit.ts`); all visitors also share one free-tier key and quota.
- This demo does not implement user authentication, a shared database, or multi-user tenancy. Deploy behind appropriate controls before handling real customer data.
- The rule-based lead score is a transparent heuristic, not a prediction of conversion.

## Deployment

Deploy to Vercel or another Node.js-capable host:

1. Push the project to a public GitHub repository.
2. Import it into Vercel and deploy with the default Next.js settings.
3. Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in the host's environment settings so reviewers can test with no setup.
4. Test the deployed URL in a private browser session and verify all links are accessible.

## Known limitations

- Browser-local lead data is not synchronized across devices.
- Demo leads are illustrative and should be removed before a production rollout.
- The Gemini model allowlist is intentionally small; update `SUPPORTED_MODELS` after checking current Google model availability.
- Live Gemini calls require network access and the server's key/quota. All visitors share one free-tier key, so heavy traffic can exhaust it. Unit tests do not call Google.
- There is no CRM integration, authentication, or audit log.

## AI usage disclosure

- **opencode (CLI coding assistant):** installed and validated this codebase, fixed the Node test-runner and TypeScript import issues, and updated this README.
- **AI coding assistant(s):** the initial application build and the long series of `fix:`, `chore:`, and `docs:` commits, together with the retained `AGENTS.md` coding-agent rules, indicate an AI coding assistant was used to build and iterate on the app.
- **Human review:** the repository owner reviewed and approved the changes and can explain the implementation choices.

> Question for the owner: confirm the specific assistant(s) and tools (names, versions, and scope) used during the initial build so this disclosure is exact. Replace this note with the confirmed list before submitting; do not publish an unverified claim.
