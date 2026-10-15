# masal.ai

An AI sales copilot for residential real estate: it turns a raw property enquiry into a prioritised, explained lead with a recommended next action, a ready-to-send reply, and a call brief you can use before picking up the phone.

## What it does

Real-estate sales teams receive enquiries that are noisy, incomplete, and hard to compare. A ready buyer and a curious browser arrive in the same inbox, and the signals that matter — budget, timeline, financing, a request to visit — are buried in free text. Reps lose time re-reading messages and guessing who to call first.

masal.ai gives a salesperson one focused workspace to:

- **Capture** an enquiry in a small, structured form (name, location, property requirement, budget, timeline, message).
- **Analyse** it with an LLM — a summary, intent, requirements, objections, separated known facts / inferences / unknowns / deal risks, a recommended next action, and a suggested reply — grounded only in the lead's own details.
- **Rank** a pipeline with a transparent, deterministic 100-point score and Act Now / Follow Up / Nurture priorities.
- **Prepare** for a call with a generated Call Brief.
- **Ask** follow-up questions in a per-lead Sales Copilot grounded in the lead's details, its analysis, and the recent conversation.
- **Start** from three clearly labelled demo scenarios (one per priority band) that show the workspace end to end — remove them in one click, or add a real enquiry. Labelled demos never mix with your own leads.

The app is a Next.js 15 application with a static landing page at `/`, a client-side workspace at `/dashboard`, and server-side API routes. It is a focused demo, not a production system — see [Design decisions and limitations](#design-decisions-and-limitations).

## Lead scoring (100 points)

Scoring is **deterministic and rule-based** (`lib/scoring.ts`) — the LLM never computes or overrides it. The same lead always produces the same score and breakdown, and missing information is reported rather than treated as a positive.

| Dimension | Max | What it measures |
| --- | ---: | --- |
| Buying timeline | 25 | How soon the buyer intends to purchase |
| Purchase intent | 25 | How clearly the enquiry shows an intention to buy |
| Requirement clarity | 20 | How clearly needs and preferences are communicated (location, configuration, budget, constraints) |
| Budget readiness | 20 | Whether budget is specified and aligned, and financing readiness |
| Engagement & commitment | 10 | Responsiveness and confirmed/requested next steps (e.g. `Visit scheduled`) |

**Priority thresholds:** Act Now **80–100** · Follow Up **50–79** · Nurture **0–49**.

The score is a **heuristic for sales prioritisation, not a calibrated probability of conversion** — it is not a qualification status and does not predict whether a lead will close. Each lead's detail view shows the score out of 100, the priority label, the five-dimension breakdown with earned/max, the positive signals, and the missing qualification information.

## Call Brief

The Call Brief is the chosen extra feature. Before a call, the salesperson generates a compact prep sheet from the same lead context:

- **Objective** — the goal of the call.
- **Opening line** — a natural way to start, personalised with the buyer's own details.
- **Talking points** — what to cover.
- **Questions to qualify** — discovery prompts for information still missing.
- **Watch out for** — risks or gaps to handle carefully.

The brief is produced by a separate server route (`app/api/call-brief/route.ts`) using a dedicated prompt, and its output is validated and shown per lead. The opening line is written in the salesperson's real identity (Anubhab Pradhan, masal.ai): the prompt supplies that identity and the provider layer also resolves any `[Your Name]` / `[Company Name]`-style token the model might echo, so no unresolved placeholder is ever displayed. The brief never states that a requested site visit is already booked or confirmed.

## Typical workflow

1. **Receive an enquiry** and click **Add new lead**.
2. **Capture the six fields**.
3. The app stores the lead, gives it an initial rule-based score, and **runs the AI analysis** automatically; it can be **refreshed** at any time.
4. **Read the assessment** — summary, intent, requirements, objections, recommended next action, suggested reply.
5. **Ask the copilot** a follow-up (for example, "how should I handle the pricing objection?").
6. **Prepare for the call** with a generated Call Brief.
7. **Triage the pipeline** — filter by priority, set a status (New → Contacted → Visit scheduled → Qualified → Closed), and remove leads that are no longer relevant.
8. **Switch leads** — each keeps its own analysis, chat, and brief.

## Tech stack

Derived from `package.json` and the config files:

- **Framework:** Next.js 15 (App Router), React 19.
- **Language:** TypeScript 5.
- **Styling:** Tailwind CSS 3 with PostCSS and Autoprefixer; light and dark themes via CSS custom properties.
- **Icons:** lucide-react.
- **AI provider:** Groq (OpenAI-compatible `api.groq.com`) by default, with optional multi-key rotation and Google Gemini (`generativelanguage.googleapis.com`) as a failover — called directly with `fetch`, no SDK.
- **Linting:** ESLint 9 with `eslint-config-next`.
- **Tests:** Node.js built-in test runner (`node --test`) with TypeScript type stripping — no test-framework dependency.
- **CI:** GitHub Actions (Node 22).

## Architecture overview

The browser handles UI and local state; all credentials and AI calls stay on the server. A Next.js Route Handler applies a per-IP rate limit, reads the key from the environment, validates the request, calls the configured provider (rotating keys and failing over on retryable errors), and returns a safe result. The API key never reaches the browser.

```text
Browser (Next.js client, localStorage)
        │  same-origin JSON (no credentials)
        ▼
Next.js Route Handlers  ──►  guard (rate limit + server key) ──►  validate ──►  provider layer ──►  Groq / Gemini
```

Layout: a static landing page (`app/page.tsx`) and static legal pages; a client workspace (`app/dashboard/page.tsx`) that owns all lead state and `localStorage` persistence; three dynamic API routes (`app/api/analyze`, `app/api/chat`, `app/api/call-brief`).

Full design, trust boundaries, data model, API contract, and sequence diagrams: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**. Point-in-time decisions: [docs/decisions.md](docs/decisions.md).

## Getting started

**Requirements**

- **Node.js 22.6 or newer** (Node 22 LTS recommended). Tests use Node's built-in TypeScript type stripping (`--experimental-strip-types`, available from Node 22.6), so `npm test` will not run on older releases.
- npm.
- A Groq API key ([console.groq.com/keys](https://console.groq.com/keys)) for live AI calls. A Google Gemini key is optional (failover / alternate primary).

**Install**

```bash
npm ci
```

`npm ci` installs exactly from the committed `package-lock.json` for reproducible installs. If you are intentionally changing dependencies, use `npm install` instead.

**Configure the environment**

Copy `.env.example` to `.env.local` and set the values (see [Environment variables](#environment-variables)):

```bash
cp .env.example .env.local
# then edit .env.local and set GROQ_API_KEY=<your key>
```

**Run locally**

```bash
npm run dev
```

Open http://localhost:3000. There is no in-app setup screen — the server reads keys from the environment. With no provider key configured, AI actions return a clear "not configured" message while the rest of the UI still loads.

## Environment variables

Read server-side only (implemented in `lib/providers.ts`; documented in `.env.example`):

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes (default setup) | Server-side Groq key used for all AI calls. |
| `AI_PROVIDER` | No | `groq` (default) or `gemini` — which provider is primary. The other configured provider is used as failover. |
| `GROQ_MODEL` | No | Overrides the Groq model. Must match a supported id (`openai/gpt-oss-120b` or `openai/gpt-oss-20b`); otherwise the default is used. |
| `GROQ_API_KEY_2` … `GROQ_API_KEY_5` | No | Extra Groq keys. The starting key rotates per request and the app fails over on `429`/`5xx`. Blanks are ignored. |
| `GEMINI_API_KEY` | No | Optional Gemini key, used as failover (or as primary with `AI_PROVIDER=gemini`). |
| `GEMINI_MODEL` | No | Overrides the Gemini model (`gemini-flash-lite-latest`, `gemini-3.5-flash-lite`, or `gemini-3.1-flash-lite`); otherwise the default is used. |

**Safe configuration**

- **Keys must remain server-side.** They are read only inside Route Handlers, are never sent to the browser, never embedded in the client bundle, and are never persisted to storage. `.env.local` is git-ignored. Never commit keys or paste them into issues, screenshots, or source control.
- **Models are optional and allow-listed.** If unset or unsupported, the app falls back to the provider's default model. The model is never taken from the client.
- **Rotation is best-effort.** Multiple keys improve resilience against a single key's rate limit, but rotation depends on the provider; it does not bypass an account- or organisation-level quota, and cooldown state is in-memory and per server instance.

On a host such as Vercel, add the variables in **Settings → Environment Variables** for the relevant environments and redeploy.

## Verify

```bash
npm test          # unit tests (Node's built-in runner)
npm run typecheck # tsc --noEmit
npm run lint      # ESLint
npm run build     # Next.js production build
```

The tests cover the deterministic and safety-critical pieces: lead and analysis validation, the 100-point scoring engine (per-dimension rules, missing-data handling, engagement evidence, priority boundaries, determinism, 0–100 invariants), the request guard (rate-limit `429`, no-provider `503`, the returned provider plan), the rate limiter (window reset, per-IP isolation, IP parsing), provider routing and failover (default/alternate primary, model allow-list, key rotation, cooldown, `429`/`401`/`5xx` handling, safe all-fail), the call-brief identity and placeholder handling, the theme defaults and tokens, and the landing/workspace route split. Tests do not call a real provider API — live AI calls require configured keys and network access. CI runs the same four commands on Node 22 (`.github/workflows/ci.yml`).

## AI usage disclosure

- **What the LLM does at runtime:** lead analysis (summary, intent, requirements, objections, next action, suggested reply), the contextual Sales Copilot chat, and the Call Brief. These call an external provider — Groq by default (`lib/providers.ts`), with optional Gemini failover. This is the only AI used at runtime.
- **What is deterministic:** the **lead score and priority** are computed by a fixed rule-based engine (`lib/scoring.ts`), never by the LLM. The model is explicitly instructed not to calculate, guess, or override the score. Lead capture, validation, storage, filtering, and sorting are ordinary application code.
- **AI-assisted development:** the repository contains `AGENTS.md` (coding-agent rules) and a commit history built with an AI coding assistant. The project owner reviewed and approved the changes and can explain the implementation choices.

## Privacy and security

- **Server-side credentials.** Keys live in the environment and are attached only to the outbound provider request. The client sends JSON bodies with no credential headers, and no key appears in responses or logs.
- **Input validation.** Route bodies are parsed as JSON objects; lead fields are length-checked and the timeline is allow-listed (`lib/validation.ts`); the chat question is length-checked; conversation history is shape-filtered; any client-supplied analysis is validated against a defined shape with limits before use. Invalid requests return `400` without calling the provider.
- **Prompt-injection guard.** Lead text (especially the free-text message) is treated as untrusted data, never as instructions; every system prompt states this rule (`lib/prompts.ts`).
- **Error handling.** Provider errors are mapped to safe, generic messages (`lib/providers.ts`); raw provider error text and credentials are never returned or logged. Unexpected errors return `502`.
- **Storage.** Leads, analyses, chat, and call briefs are stored only in the browser's `localStorage` (key `masal-ai-leads-v1`). There is no server database. Data is per-browser and per-device, is lost if site data is cleared, and is not shared between users. The three demo scenarios are rebuilt from code on every load and are never written to storage, so they cannot duplicate or be mistaken for a genuine lead.
- **Rate limiting.** AI routes are limited per client IP. The limiter is in-memory, per serverless instance, and resets on cold start; it keys off the client IP from proxy headers, which is trustworthy behind Vercel's edge but spoofable behind other proxies. It blunts casual abuse; it is not a global cap.
- **Not implemented:** authentication, authorization, multi-user tenancy, CSRF-specific handling, CORS beyond same-origin defaults, audit logging, and durable storage. Do not use this demo with real customer data without adding appropriate controls.

## Deployment

- **Live application URL:** https://assignment-masal.vercel.app — reachable and serving the app. It reflects the most recently deployed revision, which may lag this commit until it is redeployed.
- **Repository:** https://github.com/ANUBprad/masal-ai-assignment

The app targets any Node.js-capable host; Vercel is the documented path. Deployment success is **not** asserted from this repository — configure the environment variables above and redeploy to publish a new revision.

## Design decisions and limitations

**Decisions**

- **Deterministic score + LLM explanation.** Ranking must be stable and inspectable, so ranking is a fixed, testable rubric with a visible breakdown, while the LLM handles the language-heavy work (intent, objections, next action). The model never scores.
- **One provider layer with failover.** Keys rotate and fail over across Groq/Gemini on retryable errors, bounded by an attempt budget, with only safe errors surfaced.
- **Server-only credentials, no SDK.** A small `fetch` wrapper keeps the API boundary explicit and the key off the client.
- **`localStorage` for leads.** No database provisioning; clearly a single-browser limitation for a demo.
- **Light theme by default, with a saved dark preference.** The default is applied before first paint, so there is no flash of the wrong theme; a user's explicit choice is always honoured.
- **Provisional priority labels.** Act Now / Follow Up / Nurture are prioritisation labels, chosen to avoid over-claiming qualification.

**Limitations**

- Probabilistic AI output can be incomplete or wrong and must be reviewed by the salesperson; the suggested reply and call brief are drafts, not commitments.
- The score is a heuristic, not a conversion probability.
- No auth, tenancy, durable storage, or global rate limit (see [Privacy and security](#privacy-and-security)).
- The rate limiter and provider cooldowns are per serverless instance and reset on cold start.
</content>
