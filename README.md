# masal.ai

**An AI sales copilot for residential real estate.** Turn an enquiry into a prioritised lead, a grounded analysis, a suggested reply, a call brief, and a context-aware sales conversation.

**Live demo:** https://assignment-masal.vercel.app/  
**Workspace:** https://assignment-masal.vercel.app/dashboard  
**Repository:** https://github.com/ANUBprad/masal-ai-assignment

> masal.ai is a focused demo, not a production CRM. AI-generated content is a draft for the salesperson to review; property inventory, prices, and appointments are never assumed to be verified.

## Product overview

Real-estate enquiries often arrive as free text, making it hard to compare urgency, budget, intent, and missing information. masal.ai brings the key details into one workspace.

- **Capture leads** with name, location, property requirement, budget, buying timeline, and customer message.
- **Analyse enquiries** with an LLM-generated summary, purchase intent, known facts, inferences, unknowns, deal risks, recommended next action, and suggested reply.
- **Prioritise consistently** with an explainable 100-point rule-based score.
- **Prepare for calls** with a personalised Call Brief: opening line, talking points, qualification questions, and watch-outs.
- **Ask follow-up questions** in Sales Copilot, grounded in the selected lead, its analysis, and recent chat.
- **Manage the pipeline** with statuses (New, Contacted, Visit scheduled, Qualified, Closed), priority filters, and per-lead history.
- **Explore demo scenarios** labelled `(Dummy)`, one for each priority band. Demo scenarios are separate from genuine leads and can be dismissed.

## Demo flow

1. Open the [live app](https://assignment-masal.vercel.app/) and choose **Open Dashboard**.
2. Inspect the demo scenarios or add a fictional test lead.
3. Review its AI Analysis and score breakdown.
4. Open **Call Brief** to prepare for a conversation.
5. Ask Sales Copilot a custom question, such as: *“How should I handle a budget objection without promising unverified inventory?”*
6. Change the lead's status to demonstrate pipeline tracking.

Use fictional data for demonstrations. The app stores lead data in the current browser, not in a shared account.

## Lead scoring

The score is calculated by `lib/scoring.ts`; **the LLM does not assign or override it**. The same input produces the same rule-based score and breakdown.

| Dimension | Maximum | Purpose |
| --- | ---: | --- |
| Buying timeline | 25 | How soon the buyer intends to purchase |
| Purchase intent | 25 | Evidence of intent to buy |
| Requirement clarity | 20 | Clarity of location, property, budget, and constraints |
| Budget readiness | 20 | Whether budget and financing readiness are specified |
| Engagement & commitment | 10 | Evidence of engagement and next steps |

**Priority thresholds:** Act Now **80–100** · Follow Up **50–79** · Nurture **0–49**.

This score is a transparent prioritisation heuristic—not a conversion probability, a qualification verdict, or a prediction that a deal will close. Review the component breakdown and missing information before acting on it.

## AI grounding and sales identity

At runtime, the configured LLM provider supports analysis, Sales Copilot chat, and Call Brief generation. Customer-facing prompts use the canonical salesperson identity **Anubhab Pradhan from masal.ai**.

The application is designed to distinguish customer-provided details from inferences and unknowns. It should not claim that a property is available, a price is confirmed, or a visit is booked unless that fact is supported by verified context. AI responses are drafts and must be reviewed before being sent to a customer.

## Tech stack

- **Framework:** Next.js 15 App Router, React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3 and CSS custom properties; light and dark themes
- **AI providers:** Groq by default, with optional Google Gemini failover
- **Server APIs:** Route Handlers for analysis, chat, and Call Brief
- **Tests:** Node.js built-in test runner
- **CI:** GitHub Actions on Node.js 22

### Architecture at a glance

```text
Browser UI + localStorage
        │ same-origin JSON requests
        ▼
Next.js Route Handlers
        │ rate limit + validate + resolve server-side key
        ▼
Provider layer ──► Groq / Gemini
```

Provider credentials stay server-side. API requests are validated, provider failures are mapped to safe messages, and the AI endpoints use a per-IP in-memory rate limiter. The full design, trust boundaries, data model, API contracts, and request flows are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run locally

### Requirements

- Node.js **22.6+** (Node 22 LTS recommended)
- npm
- A Groq API key for live AI requests; Gemini is optional

### Install and configure

```bash
npm ci
cp .env.example .env.local
```

Add your provider key to `.env.local` (for example, `GROQ_API_KEY`). Never commit or share real keys. The application reads provider credentials only on the server; there is no in-app API-key setup screen.

### Start the app

```bash
npm run dev
```

Open http://localhost:3000. Without a configured provider key, the UI still loads, but AI actions cannot run successfully.

## Environment variables

See [.env.example](.env.example) for the complete template.

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Default provider key |
| `AI_PROVIDER` | Optional: `groq` (default) or `gemini` as primary |
| `GROQ_API_KEY_2`–`GROQ_API_KEY_5` | Optional extra Groq keys for rotation/failover |
| `GROQ_MODEL` | Optional allow-listed Groq model override |
| `GEMINI_API_KEY` | Optional Gemini failover key or primary key |
| `GEMINI_MODEL` | Optional allow-listed Gemini model override |

Set production variables in your hosting provider's environment settings and redeploy. Key rotation and provider failover are best-effort resilience measures; they do not bypass account-level quotas.

## Tests and checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The repository's GitHub Actions workflow runs these checks on Node.js 22 for pushes and pull requests to `main`. Unit tests cover validation, deterministic scoring and priority thresholds, lead/demo persistence, rate limiting, provider routing and failover, prompt grounding and identity handling, theme tokens, and landing/workspace behaviour. Tests stub provider calls; they do not require live API keys or test real provider output.

## Privacy and security

- **Credentials:** provider keys are read from server-side environment variables and are not sent to the browser or stored with leads.
- **Input handling:** API routes validate lead fields, timelines, chat questions, conversation history, and supplied analysis context.
- **Prompt boundaries:** customer messages are treated as untrusted data, not as system instructions.
- **Storage:** leads, analyses, chats, and Call Briefs are stored in browser `localStorage`. There is no server database or cross-device sync. Clearing site data can delete this data.
- **Demo data:** sample scenarios are separate from genuine lead storage, labelled `(Dummy)`, and can be dismissed without deleting genuine leads.
- **Rate limiting:** the in-memory per-IP limiter is per serverless instance and resets on cold starts. Proxy-header trust depends on the hosting environment; it is not a global quota.
- **Limitations:** there is no authentication, authorization, multi-user tenancy, durable server-side storage, audit logging, or distributed rate limiter. **Do not use this demo with real customer data** without adding appropriate controls.

For the point-in-time technical review and explicit unverified items, see [docs/PRODUCTION_AUDIT.md](docs/PRODUCTION_AUDIT.md).

## AI usage disclosure

- **Runtime AI:** Groq by default, with optional Gemini failover, powers lead analysis, Sales Copilot responses, and Call Brief generation.
- **Deterministic application logic:** lead scoring, priority thresholds, validation, local storage, filtering, and status tracking are implemented in application code; the LLM does not calculate the score.
- **AI-assisted development:** an AI coding assistant was used during development. The project owner reviewed the implementation and is responsible for the submitted work.

## Design decisions and limitations

- **Deterministic score + LLM analysis:** prioritisation stays stable and inspectable; the LLM handles language-heavy analysis and drafting.
- **Server-side provider integration:** credentials do not enter the client bundle; a small `fetch`-based provider layer handles model selection and bounded failover.
- **Browser storage:** `localStorage` keeps the demo easy to run without provisioning a database, but data is local to one browser.
- **Provisional priorities:** Act Now / Follow Up / Nurture guide what to review first; they do not imply that a lead is qualified.
- **Human review required:** AI output can be incomplete or wrong. Confirm property details, prices, inventory, and appointment arrangements independently.

More detailed decisions and implementation notes: [docs/decisions.md](docs/decisions.md).
