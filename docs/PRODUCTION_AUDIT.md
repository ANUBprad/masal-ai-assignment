# Masal AI — Production Audit

A point-in-time audit of the production posture of this repository: routing, security
headers, SEO/metadata, data handling, and accessibility. It records what is actually
implemented and verified in the code, and — explicitly — what has **not** been verified.
It is a technical reference, not a marketing page.

## Scope

- **Audited surface:** the public routes (`/`, `/dashboard`, `/privacy`, `/terms`) and the
  three AI Route Handlers (`/api/analyze`, `/api/chat`, `/api/call-brief`).
- **Not in scope:** authentication, multi-user tenancy, durable storage, and any host-level
  configuration. None of those exist in this repository (see §6).

## 1. Routing

| Route | Kind | Rendering | Notes |
| --- | --- | --- | --- |
| `/` | Landing page | Static (server component) | No client state; never reads lead data. |
| `/dashboard` | Lead workspace | Static shell, client-rendered | `noindex`. All data lives in the visitor's `localStorage`. |
| `/privacy`, `/terms` | Legal | Static | Linked from the landing-page footer. |
| `/api/*` | Route Handlers | Dynamic (`runtime = nodejs`) | Excluded from the sitemap and disallowed in `robots.txt`. |

The dashboard moved from `/` to `/dashboard`; `Open Dashboard` CTAs, the 404 page, and the
legal-page header all point at the real route. Internal links were updated together with the
move, and no API route was relocated.

## 2. Security headers

Set in `next.config.ts` for every response:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` and `frame-ancestors 'none'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: camera, microphone, geolocation, and payment disabled
- `Cross-Origin-Opener-Policy: same-origin`
- `Content-Security-Policy`: `default-src 'self'`, self-only `script`/`style`/`font`/`img`/`connect`,
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.

`script-src` retains `'unsafe-inline'` because Next.js emits inline bootstrap/theme scripts and
the pages are statically prerendered (a nonce would force dynamic rendering). This still blocks
scripts from any other origin. `'unsafe-eval'` is added only when `NODE_ENV` is not `production`
(`buildSecurityHeaders` in `next.config.ts`): the development React Refresh runtime evaluates
modules with `eval()`, so a policy without it aborts the client bundle under `next dev` and breaks
client interactions such as Add Lead. Production builds never eval, so the deployed policy stays
strict and unchanged. Credentials never reach the browser: the keys are read from the
environment inside Route Handlers and attached only to the outbound provider request.

## 3. SEO and metadata

- Root metadata (title template, description, Open Graph, Twitter card, `metadataBase`) in `app/layout.tsx`.
- Landing page sets an absolute title, description, `canonical`, and Open Graph title/description (`app/page.tsx`).
- Canonical origin is `SITE_URL` in `lib/site.ts` (`https://assignment-masal.vercel.app`), shared by `robots.ts` and `sitemap.ts`.
- `app/opengraph-image.tsx` provides the social preview image and `app/icon.svg` the favicon.
- `sitemap.xml` lists `/`, `/privacy`, `/terms`. The dashboard is `noindex` and API routes are excluded, so neither is listed.
- No lead data is rendered server-side, so no personalised content is indexable or exposed in metadata.

## 4. Data handling and privacy

- Leads, analyses, chat, and call briefs are stored only in the browser's `localStorage` (`masal-ai-leads-v1`). There is no server-side store for lead content.
- The three example demo scenarios are re-derived from code on each load and are never written to the durable store, so they cannot be duplicated or mistaken for a genuine lead. Each is labelled `(Dummy)` in the UI and can be removed in one click; the removal sticks via a preference marker (`masal-ai-demos-dismissed`).
- Demo records are detected by a `demo: true` flag or a reserved `demo-` id (including the legacy `sample-` family), never by name, so a customer who happens to share a demo's name is never dropped or mislabelled.
- The workspace opens on a welcome state and never auto-selects a scenario; an empty genuine-lead list stays empty.
- Requests that reach an AI route send only the relevant lead fields to the configured provider; the provider key stays server-side.

## 5. Accessibility

- Semantic landmarks (`main`, `header`, `footer`, `nav`, `h1`/`h2`/`h3`), a visible-content skip link on every page, labelled controls, and accessible link text.
- Focus styles are defined globally (`:focus-visible`), so keyboard navigation is visible.
- Layouts are responsive (stacked on mobile, row on desktop) and use the two centralized theme token sets (dark and light), which meet contrast for body and button text.
- `prefers-reduced-motion` is honoured (`app/globals.css`); the landing page introduces no animation.

## 6. Known limitations (not implemented)

No authentication, authorization, tenancy, CSRF-specific handling, CORS configuration beyond
same-origin defaults, audit logging, or durable storage. The rate limiter is in-memory and
per-instance. Do not use this demo with real customer data.

## 7. Verification performed

Commands run against this revision: `npm test`, `npm run typecheck`, `npm run lint`.

- Tests: 106 passing, including the workspace lifecycle (`tests/leads.test.ts`), the demo scenarios (`tests/demos.test.ts`), the landing copy and customer-neutral capability summary (`tests/landing.test.ts`), the shared priority colour mapping (`tests/priority.test.ts`), and the theme tokens (`tests/theme.test.ts`).
- Typecheck (`tsc --noEmit`) and lint: clean (lint reports only pre-existing config warnings).

On the previous revision a production build and a local `next start` pass were also run: the build succeeded; `/`, `/privacy`, `/terms`, `/icon.svg`, `/opengraph-image`, `/robots.txt`, `/sitemap.xml` prerendered as static; `/dashboard` was a static shell; the three API routes stayed dynamic; and over HTTP `/`, `/dashboard`, `/privacy`, `/terms` returned `200` (the landing page serving the expected title, description, canonical, and Open Graph URL; `/dashboard` carrying `noindex`; `/api/analyze` returning `400` for an invalid body). Those build and local-server steps were **not** re-run for this revision.

**Not verified:** visual/browser layout checks (no browser tooling was available in this
environment) and the deployed Vercel build. A Git push does not imply production is updated —
confirm the Vercel deployment separately.
