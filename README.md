# Masal AI — Real-estate Lead Intelligence

A Next.js application for real-estate salespeople to understand inbound enquiries, prioritize leads, prepare for calls, and draft context-aware follow-ups.

## Features

- **Lead intake:** capture name, location, property requirement, budget, buying timeline, and customer message.
- **AI lead analysis:** summary, intent, requirements, concerns, recommended next action, and a suggested reply.
- **Prioritization:** transparent rule-based score with Hot / Warm / Cold grouping.
- **Sales copilot:** ask follow-up questions grounded in the selected lead's context.
- **Call brief:** generate a call objective, talking points, discovery questions, watch-outs, and an opening line.
- **Browser persistence:** leads are stored locally in this browser. Demo leads are included on first run.
- **Bring your own key:** reviewer supplies a Gemini API key through the setup screen.

## Requirements

- Node.js 20.10+ (Node.js 22 LTS recommended)
- npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, enter your Gemini API key, select a model, and test the connection.

Run quality checks:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Architecture

- `app/page.tsx` — lead workspace, lead intake, prioritization, AI results, chat, and call brief UI.
- `components/SetupScreen.tsx` — first-launch API key/model setup.
- `app/api/*` — same-origin server endpoints for connection test, lead analysis, chat, and call brief.
- `lib/ai.ts` — model allowlist, credential validation, safe provider errors.
- `lib/gemini.ts` — request-scoped Gemini REST calls and response validation.
- `lib/scoring.ts` — deterministic lead scoring and priority mapping.
- `lib/validation.ts` — server-side input validation.
- `types/lead.ts` — shared TypeScript contracts.

### AI request flow

1. The user enters a Gemini API key and chooses a model in the browser.
2. The key remains in React state only; it is not written to localStorage, cookies, or server environment variables.
3. The browser sends the key and model in headers to same-origin Next.js API routes.
4. The server validates the headers and model allowlist, then makes a request-scoped HTTPS call to Gemini.
5. The server returns the model result or a safe error message. Provider errors and credentials are not logged or returned verbatim.

## Security and privacy notes

- Do not add API keys to `.env`, source control, screenshots, or bug reports.
- The key is held in page memory and disappears when the page is refreshed or disconnected.
- Leads and chat history are saved to the browser's localStorage. Do not enter sensitive personal data unless you understand that this is a local demo.
- The API routes validate request bodies and constrain model IDs. The Gemini key is sent to Google's API by the server.
- This demo does not implement user authentication, a shared database, server-side rate limiting, or multi-user tenancy. Deploy behind appropriate controls before handling real customer data.
- The rule-based lead score is a transparent heuristic, not a prediction of conversion.

## Deployment

Deploy to Vercel or another Node.js-capable host:

1. Push the project to a public GitHub repository.
2. Import it into Vercel and deploy with the default Next.js settings.
3. No server-side Gemini secret is required; reviewers bring their own key in the setup screen.
4. Test the deployed URL in a private browser session and verify all links are accessible.

## Known limitations

- Browser-local lead data is not synchronized across devices.
- Demo leads are illustrative and should be removed before a production rollout.
- The Gemini model allowlist is intentionally small; update `SUPPORTED_MODELS` after checking current Google model availability.
- Live Gemini calls require network access and a valid key/quota. Unit tests do not call Google.
- There is no CRM integration, authentication, or audit log.

## AI usage disclosure

Complete this section truthfully before submitting. Example structure:

- ChatGPT: requirements interpretation, architecture and implementation assistance, debugging, and documentation.
- CLI coding assistant: code generation, test execution, and repository workflow assistance.
- Human review: verify every feature and be prepared to explain implementation choices in the interview.

Edit this disclosure to reflect the tools you actually used.
