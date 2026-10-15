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
scripts from any other origin. Credentials never reach the browser: the keys are read from the
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
- Navigating to the dashboard never seeds demo leads and never clears a genuine lead. Seeded records are removed by a reserved `demo-` id prefix (or the legacy `demo: true` flag), so a user-created lead can never match.
- An empty workspace stays empty and shows the proper empty state.
- Requests that reach an AI route send only the relevant lead fields to the configured provider; the provider key stays server-side.

## 5. Accessibility

- Semantic landmarks (`main`, `header`, `footer`, `nav`, `h1`/`h2`/`h3`), a visible-content skip link on every page, labelled controls, and accessible link text.
- Focus styles are defined globally (`:focus-visible`), so keyboard navigation is visible.
- Layouts are responsive (stacked on mobile, row on desktop) and use the existing light/dark tokens, which meet contrast for body and button text.
- `prefers-reduced-motion` is honoured (`app/globals.css`); the landing page introduces no animation.

## 6. Known limitations (not implemented)

No authentication, authorization, tenancy, CSRF-specific handling, CORS configuration beyond
same-origin defaults, audit logging, or durable storage. The rate limiter is in-memory and
per-instance. Do not use this demo with real customer data.

## 7. Verification performed

Commands run against this revision: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`,
plus a **local** production server (`next start`) checked over HTTP.

- Tests: 71 passing (includes root-route / dashboard-nav wiring in `tests/landing.test.ts`).
- Typecheck and lint: clean (lint reports only pre-existing config warnings).
- Build: succeeds; `/`, `/privacy`, `/terms`, `/icon.svg`, `/opengraph-image`, `/robots.txt`, `/sitemap.xml` prerender as static, `/dashboard` is a static shell, and the three API routes remain dynamic.
- Local HTTP checks: `/`, `/dashboard`, `/privacy`, `/terms` return `200`; the landing page serves the expected title, description, canonical, and Open Graph URL; `/dashboard` carries `noindex`; `/api/analyze` is reachable and returns `400` for an invalid body.

**Not verified:** visual/browser layout checks (no browser tooling was available in this
environment) and the deployed Vercel build. A Git push does not imply production is updated —
confirm the Vercel deployment separately.
