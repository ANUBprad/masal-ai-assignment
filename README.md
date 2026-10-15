# Masal AI — Real-estate Lead Intelligence

An AI sales copilot that turns a raw property enquiry into a prioritised, explained lead with a recommended next action and a ready-to-send reply.

## Product pitch

Real-estate sales teams receive enquiries that are noisy, incomplete, and hard to compare. A promising buyer and a curious browser can arrive in the same inbox, and the time-sensitive signals (budget, timeline, financing, a request to visit) are buried in free text. Reps lose hours re-reading messages and guessing who to call first.

Masal AI helps a salesperson triage inbound leads quickly:

- Capture the enquiry in a small, structured form.
- Get an AI-generated assessment — summary, intent, requirements, objections, next action, and a suggested reply — grounded in the lead's own details.
- Ask follow-up questions in a chat that is grounded in both the lead's details and its existing AI analysis.
- Rank and filter a pipeline of leads with a transparent, deterministic 100-point score (Act Now / Follow Up / Nurture) and a visible breakdown.
- Generate a short call brief before picking up the phone.
- Start from three clearly labelled demo scenarios (one per priority band) that show the workspace end to end — remove them in one click, or add a real enquiry; labelled demos never mix with your own leads.

The product is a Next.js application with a static landing page at `/`, a client-side workspace at `/dashboard`, and server-side API routes. It is a focused demo, not a production system — see [Limitations](#ai-behaviour-and-limitations) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Demo and submission

- **Live application URL:** `TODO — replace with the deployed URL` (placeholder until deployment is confirmed).
- **Demo video:** `TODO — add a link or upload the walkthrough here`. Keep the demo **under three minutes**: add a lead, run the analysis, ask one follow-up in the copilot, switch leads, and generate a call brief. *(No video link is present in this repository yet — this section is retained as a placeholder.)*
- **Public repository:** https://github.com/ANUBprad/masal-ai-assignment

## Problem statement and target user

**Target user:** an inside-sales or field salesperson at a residential real-estate brokerage who handles many inbound enquiries per day and needs to decide, fast, who to contact and what to say.

**Problem:** qualifying a lead by hand is slow and inconsistent. The signals that matter are expressed in natural language, and comparing leads against each other is hard without a shared summary.

**Approach:** keep capture lightweight, use an LLM for the language-heavy reasoning (summary, intent, objections, next action, suggested reply), and pair it with a deterministic, explainable score so ranking is stable and inspectable rather than a black box.

## Core features

The five assignment requirements map to concrete, implemented behaviour:

| Requirement | What the application does | Where |
| --- | --- | --- |
| **1. Lead intake** | Captures name, location, property requirement, budget, buying timeline (from a fixed list), and a free-text customer message. | `app/dashboard/page.tsx` (form), `types/lead.ts`, `lib/validation.ts` |
| **2. Real AI-based lead analysis** | Each lead can be analysed by a server-side call to an external LLM provider (Groq by default), returning a summary, customer intent, key requirements, objections/concerns, separated known facts / inferences / unknowns / deal risks, a recommended next action, and a suggested reply. | `app/api/analyze/route.ts`, `lib/providers.ts`, `lib/prompts.ts` |
| **3. Contextual conversational interface** | A per-lead copilot that answers the salesperson's follow-up questions using the selected lead's details, its current AI analysis, and that lead's conversation history. | `app/api/chat/route.ts`, `lib/providers.ts` |
| **4. Multiple leads and prioritization** | Leads coexist in a sidebar (the labelled demo scenarios grouped separately from your own leads), each with its own analysis and chat. A deterministic 100-point score plus Act Now / Follow Up / Nurture grouping, search, and filtering rank the pipeline. | `app/dashboard/page.tsx`, `lib/scoring.ts`, `lib/demos.ts` |
| **5. Scan-friendly presentation** | The selected lead opens on a short summary with a score ring, then a decision section (recommended next action, open questions, known facts, deal risks) and compact Overview / AI Analysis / Call Brief / Sales Copilot tabs. The sidebar shows score, priority, and location at a glance. | `app/dashboard/page.tsx` |

The five requirements are covered by the shipped code above. Live AI responses depend on a configured server key and network access (see [Environment variables](#environment-variables)).

## Lead scoring (100 points)

The score is deterministic and calculated in `lib/scoring.ts` only — never by the LLM. The same lead always produces the same score and breakdown, and missing information is reported rather than treated as a positive.

| Dimension | Max | Rule (summary) |
| --- | ---: | --- |
| Buying timeline | 25 | `Within 30 days` 25 · `31–60 days` 20 · `61–90 days` 14 · `Over 90 days` 7 · exploring 0 |
| Purchase intent | 25 | ready-to-purchase 25 · comparing/shortlisting 18 · general interest 10 · browsing 3 · no evidence 0 |
| Requirement clarity | 20 | 5 each for location, property type/configuration, budget specified, and stated preferences/constraints |
| Budget readiness | 20 | up to 10 for a specific budget figure + up to 10 for explicit financing readiness |
| Engagement & commitment | 10 | `Visit scheduled` 10 · `Qualified` 5 · confirmed/requested next step per message · none 0 |

Sales priority: **Act Now** 80–100 · **Follow Up** 50–79 · **Nurture** 0–49. Each lead's detail panel shows the score out of 100, the label, the five-dimension breakdown with earned/max, the positive signals, and the missing qualification information. These are provisional prioritisation labels, not qualification statuses or a probability of closing.

Purchase intent is judged per clause: a negation ("not ready to buy") is not counted as positive, and exploratory phrasing ("just looking", "only researching") caps the score below a general-interest claim. Legacy timeline labels saved by earlier versions (`Immediately`, `1–3 months`, `3–6 months`) are normalized on load and validation to the current buckets (`Within 30 days`, `61–90 days`, `Over 90 days`).

## Additional feature: Call Brief

Call Brief is the chosen extra feature (the core workflow above is the assignment's required scope). Before a call, the salesperson generates a compact brief from the same lead context:

- **Objective** — the goal of the call.
- **Opening line** — a natural way to start.
- **Talking points** — what to cover.
- **Questions to ask** — discovery prompts.
- **Watch out for** — risks or unknowns to handle carefully.

Verified behaviour: the brief is produced by a separate server route (`app/api/call-brief/route.ts`) calling the same provider layer with a dedicated prompt (`lib/prompts.ts`), its JSON shape is validated before use, and it is displayed per lead and can be copied. It is generated on demand, not automatically.

## Typical user workflow

1. **Receive an enquiry** and click **Add new lead**.
2. **Capture the six fields** (name, location, property requirement, budget, timeline, message).
3. The app stores the lead, gives it an initial rule-based score, and **runs the AI analysis** automatically; it can be **refreshed** at any time.
4. **Read the assessment** — summary, intent, requirements, objections, recommended next action, suggested reply.
5. **Ask the copilot** a follow-up (for example, "how should I handle the pricing objection?"); answers use the lead's details and its existing analysis.
6. **Prepare for the call** with a generated call brief.
7. **Triage the pipeline** — sort/filter by priority and score, set a lead status (New → Contacted → Visit scheduled → Qualified → Closed), and remove leads that are no longer relevant.
8. **Switch to another lead** — each lead keeps its own analysis and chat.

## Technology stack

Derived from `package.json` and configuration files:

- **Framework:** Next.js 15 (App Router), React 19.
- **Language:** TypeScript 5.
- **Styling:** Tailwind CSS 3 with PostCSS and Autoprefixer.
- **Icons:** lucide-react.
- **AI provider:** Groq (OpenAI-compatible `api.groq.com`) by default, with optional multi-key rotation and Google Gemini (`generativelanguage.googleapis.com`) as a failover, called directly with `fetch` — no SDK.
- **Linting:** ESLint 9 with `eslint-config-next`.
- **Tests:** Node.js built-in test runner (`node --test`) with TypeScript type stripping — no test framework dependency.
- **CI:** GitHub Actions (Node 22).

## Architecture overview

The browser handles UI and local state; all credentials and AI calls live on the server. A Next.js Route Handler applies a per-IP rate limit and loads the key from the environment, validates the request, calls the configured provider (rotating keys and failing over on retryable errors), and returns a safe result — the browser never sees the API key.

```text
Browser (Next.js client, localStorage)
        │  same-origin JSON (no credentials)
        ▼
Next.js Route Handlers  ──►  guard (rate limit + server key) ──►  validate ──►  provider layer ──►  Groq / Gemini
```

Full design, trust boundaries, data model, API contract, and sequence diagrams: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**. Point-in-time decisions are recorded in [docs/decisions.md](docs/decisions.md).

## Getting started

**Requirements**

- **Node.js 22.6 or newer** (Node 22 LTS recommended). The test runner uses Node's built-in TypeScript type stripping (`--experimental-strip-types`, available from Node 22.6), so `npm test` will not run on older releases.
- npm.
- A Groq API key ([console.groq.com/keys](https://console.groq.com/keys)) for live AI calls. A Google Gemini key is optional (failover / alternate primary).

**Install dependencies**

```bash
npm ci
```

`npm ci` installs exactly from the committed `package-lock.json` for reproducible installs. If you are intentionally changing dependencies, use `npm install` instead.

**Configure the environment**

Copy [`.env.example`](.env.example) to `.env.local` and set the values:

```bash
cp .env.example .env.local
# then edit .env.local and set GROQ_API_KEY=<your key>
```

**Run locally**

```bash
npm run dev
```

Open http://localhost:3000. There is no in-app setup screen — the server reads the keys from the environment. If no provider key is configured, AI actions return a clear "not configured" message while the rest of the UI still loads.

**Verify**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Environment variables

The server reads these variables (see [`.env.example`](.env.example); loading is implemented in `lib/providers.ts`):

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes (default setup) | Server-side Groq key used for all AI calls. |
| `AI_PROVIDER` | No | `groq` (default) or `gemini` — which provider is primary. The other configured provider is used as failover. |
| `GROQ_MODEL` | No | Overrides the Groq model. Must match a supported id (`openai/gpt-oss-120b` or `openai/gpt-oss-20b`); otherwise the default is used. |
| `GROQ_API_KEY_2` … `GROQ_API_KEY_5` | No | Extra Groq keys. When set, the starting key rotates per request and the app fails over on `429`/`5xx`. Blanks are ignored. |
| `GEMINI_API_KEY` | No | Optional Gemini key, used as failover (or as primary with `AI_PROVIDER=gemini`). |
| `GEMINI_MODEL` | No | Overrides the Gemini model (`gemini-flash-lite-latest`, `gemini-3.5-flash-lite`, or `gemini-3.1-flash-lite`); otherwise the default is used. The retired `gemini-2.5-flash*` ids now return `404`. |

Notes:

- **Keys must remain server-side.** They are read only inside Route Handlers and are never sent to the browser, embedded in the client bundle, or persisted to storage. Never commit them or paste them into issues, screenshots, or source control. `.env.local` is git-ignored.
- **Models are optional and allow-listed.** If unset or unsupported, the app falls back to that provider's default model. The model is never taken from the client.
- **Rotation is best-effort.** Multiple keys improve resilience against a single key's rate limit, but rotation/output depends on the provider; it does not bypass an account- or organisation-level quota, and the cooldown state is in-memory and per server instance.
- The supported model ids and defaults are defined in `lib/providers.ts`.

**Configuring on Vercel**

1. Open the project in Vercel → **Settings → Environment Variables**.
2. Add `GROQ_API_KEY` (and optionally `AI_PROVIDER`, `GROQ_MODEL`, `GROQ_API_KEY_2`, `GEMINI_API_KEY`) for the relevant environments (Production/Preview/Development).
3. Redeploy so the new variables take effect.

No secret belongs in `next.config.ts`, the repository, or any `NEXT_PUBLIC_*` variable — the app does not use client-exposed environment variables.

## AI behaviour and limitations

- **Probabilistic output.** Model responses are generated, not deterministic. They can be incomplete or wrong and should always be reviewed by the salesperson before acting or sending a reply. The suggested reply is a draft, not a commitment.
- **Grounding.** Analysis is generated only from the six intake fields. Chat is generated from those fields, the lead's current analysis, and the recent conversation. The prompts instruct the model not to invent availability, prices, or preferences, but this is a guideline, not a guarantee.
- **Score is a heuristic.** The Act Now / Follow Up / Nurture ranking is a transparent, deterministic 100-point score (`lib/scoring.ts`), independent of the AI, and is explicitly not a prediction of conversion or a qualification status. It is computed only from recorded lead data and the lead's status.
- **Storage.** Leads, analyses, chat, and call briefs are stored in the browser's `localStorage` only (key `masal-ai-leads-v1`). There is no server database. Data is per-browser and per-device, is lost if site data is cleared, and is not shared between users. The three example demo scenarios are rebuilt from code on every load and are never written to storage, so they cannot duplicate or be mistaken for a real lead.
- **Rate limiting.** AI routes are limited per client IP (see below); the limit is in memory and per server instance, so it is not a global cap.
- **Deployment.** The app targets a Node.js-capable host (Vercel is the documented path). Deployment is not yet verified in this repository — the live URL is a placeholder.

## Security and responsible use

- **Server-side credentials.** Keys are read from the environment inside Route Handlers and attached only to the outbound provider request. The client sends JSON bodies with no credential headers, and no key is included in responses or logs.
- **Input validation.** Route bodies are parsed as JSON objects, lead fields are length-checked and the timeline is allow-listed (`lib/validation.ts`), the chat question is length-checked, conversation history is shape-filtered, and any client-supplied analysis is validated against a defined shape with length limits before it is used. Invalid requests return `400` without calling the provider.
- **Error handling.** Provider errors are mapped to safe, generic messages (`lib/providers.ts`); raw provider error text and credentials are not returned or logged. Unexpected errors return `502`.
- **Rate limiter limitations.** The limiter is in-memory, per serverless instance, and resets on cold start; it only blunts casual abuse. It keys off the client IP derived from proxy headers, which is trustworthy behind Vercel's edge (which sets `x-forwarded-for` from the connection) but spoofable behind other proxies. See `lib/rate-limit.ts` and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Not implemented (treat as limitations):** there is no authentication, no authorization, no multi-user tenancy, no audit log, no CORS configuration beyond same-origin defaults, and no durable persistence. Do not use this demo with real customer data without adding appropriate controls.

## Testing and verification

```bash
npm test          # unit tests (Node's built-in runner)
npm run typecheck # tsc --noEmit
npm run lint      # ESLint
npm run build     # Next.js production build
```

The tests cover the deterministic and safety-critical pieces: lead validation and analysis validation, the deterministic 100-point scoring engine (per-dimension rules, missing-data handling, engagement evidence, priority boundaries, determinism, and 0–100 invariants), the request guard (rate-limit `429`, no-provider `503`, and the returned provider plan), the rate limiter (window reset, per-IP isolation, IP parsing), provider routing and failover (default/alternate primary, model allow-list, key rotation, cooldown, `429`/`401`/`5xx` handling, safe all-fail), and that a lead's analysis reaches the chat prompt. Tests do not call a real provider API — live AI calls require configured keys and network access. CI runs the same four commands on Node 22 (`.github/workflows/ci.yml`).

## AI usage disclosure

- **Runtime AI:** the application calls an external LLM provider for lead analysis, contextual chat, and call briefs — Groq by default (`lib/providers.ts`), with optional Gemini failover. The default models are defined in `lib/providers.ts`. This is the only AI used at runtime.
- **AI-assisted development:** the repository contains `AGENTS.md` (coding-agent rules) and a commit history with `fix:`, `chore:`, and `docs:` changes, indicating that an AI coding assistant was used to build and iterate on the project.
- **Human review:** the project owner reviewed and approved the changes and can explain the implementation choices.

> **Owner confirmation needed:** confirm the specific assistant(s)/tool(s) (names, versions, and scope — for example the initial build, refactors, or documentation) so this disclosure is exact. Replace this note before final submission; do not publish an unverified claim.

## Submission checklist

- [x] Lead intake form with the six required fields.
- [x] Real AI-based lead analysis (server-side provider call).
- [x] Contextual, per-lead conversational copilot.
- [x] Multiple leads with a deterministic 100-point score and Act Now / Follow Up / Nurture prioritization.
- [x] Scan-friendly presentation of AI outputs.
- [x] Additional Call Brief feature.
- [x] Multi-key rotation and provider failover.
- [x] Tests, typecheck, lint, and build wired into CI.
- [x] Server-side credential handling (no key on the client).
- [ ] **Live application URL** — placeholder in this README.
- [ ] **Demo video (≤ 3 minutes)** — placeholder in this README.
- [ ] **AI usage disclosure** — owner to confirm the exact tools/scope above.
