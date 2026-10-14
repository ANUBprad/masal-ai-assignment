# Masal Lead Intelligence

A practical AI sales copilot for real-estate teams. Capture property inquiries, prioritize leads, understand customer intent, and prepare the next useful sales action.

## Features

- Capture and save multiple leads with location, property requirement, budget, timeline, and customer message.
- Generate summaries, intent, requirements, objections, next actions, and suggested replies with a real Gemini API call.
- Rank leads with a transparent rule-based priority score; this is a workflow heuristic, not a validated prediction model.
- Ask lead-specific follow-up questions in the contextual copilot.
- Create a Call Prep Brief with an opening, discovery questions, likely objection, and closing question.
- Store leads in browser localStorage with search, filters, and status tracking.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS, Google Gemini API via `@google/genai`, Zod, and browser localStorage.

## Architecture

```text
Browser dashboard
  ├── Lead intake, filters, lead detail
  ├── localStorage (per-browser persistence)
  └── Server API routes
        ├── /api/analyze    -> Gemini -> structured lead assessment
        ├── /api/chat       -> Gemini + selected lead context
        └── /api/call-brief -> Gemini + selected lead context
```

Model calls are server-side. API input and generated structured output are validated. The Gemini key is never bundled into browser code.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `GEMINI_API_KEY` in `.env.local`. Create a free-tier key at [Google AI Studio](https://aistudio.google.com/apikey). Optionally set `GEMINI_MODEL`; default: `gemini-3.8-flash`. Never commit `.env.local`.

Run checks:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Deploy

Import this public repository into Vercel and configure `GEMINI_API_KEY` and optionally `GEMINI_MODEL` in project environment variables. Redeploy after changing environment variables. Vercel Hobby is free for personal projects; review current provider terms before business use.

## Free API note

A paid key is not inherently required when your account has access to a Gemini API model on the free tier. Available models and quotas may vary. The app does not fake analysis when the key is missing; sample leads keep the interface explorable and the server shows a clear configuration error.

## Limitations

- localStorage is per browser; it does not sync across salespeople or devices.
- The priority score is a transparent heuristic, not a trained conversion predictor.
- AI output can be wrong or incomplete; verify it before contacting customers.
- The app does not message customers automatically.
- Model availability and quotas depend on Google's current free-tier limits.

## AI usage disclosure

AI assistance was used for product planning, implementation support, debugging, and documentation. Runtime AI features use the Gemini API for lead analysis, contextual chat, and call-prep generation. Update this statement to reflect the tools and tasks actually used before submission.

## Demo video

Add the public three-minute walkthrough link here after recording it.
