import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { DASHBOARD_PATH, HERO, WORKFLOW_ANCHOR, WORKFLOW_STEPS, landingPreview } from "@/lib/landing";
import { ThemeToggle } from "@/components/theme-toggle";

// The root route is the marketing entry point. It is a static server component:
// no client state, so next prerenders it and it never touches lead data. The
// product preview is built from the real demo scenario and the real scoring
// engine (lib/landing.ts → lib/demos.ts), never a mock or a screenshot.
export const metadata: Metadata = {
  title: { absolute: "Masal AI — Every property lead deserves a clear next move" },
  description: HERO.body,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Masal AI — Every property lead deserves a clear next move",
    description: HERO.body
  }
};

const primaryButton =
  "inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)]";
const secondaryLink =
  "inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-soft)] transition hover:text-[var(--text)]";

export default function LandingPage() {
  const preview = landingPreview();
  return (
    <main id="main" className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-[var(--brand)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--on-brand)]">Skip to content</a>

      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Masal AI — home">
            <Home size={18} className="shrink-0 text-[var(--brand)]" aria-hidden="true" />
            <span className="truncate text-sm font-bold tracking-tight">masal<span className="text-[var(--text-soft)]">.ai</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href={DASHBOARD_PATH} className={primaryButton}>
              Open Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div id="main-content">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
            <div>
              <p className="eyebrow">Lead intelligence for property sales</p>
              <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{HERO.title}</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-soft)] sm:text-lg">{HERO.body}</p>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href={DASHBOARD_PATH} className={primaryButton}>
                  Open Dashboard <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href={`#${WORKFLOW_ANCHOR}`} className={secondaryLink}>
                  See how it works
                </Link>
              </div>
            </div>

            <aside aria-label="Sample lead preview" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Sample scenario</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Illustrative</span>
              </div>

              <div className="mt-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold tracking-tight">{preview.name}</p>
                  <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{preview.location}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-3xl font-extrabold leading-none tabular-nums">{preview.score}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">/ 100</p>
                </div>
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--brand-text)]">{preview.priority}</p>

              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border-soft)] pt-4">
                <div className="min-w-0"><dt className="eyebrow">Property</dt><dd className="mt-1 text-xs leading-5 text-[var(--text-soft)]">{preview.property}</dd></div>
                <div className="min-w-0"><dt className="eyebrow">Budget</dt><dd className="mt-1 text-xs leading-5 text-[var(--text-soft)]">{preview.budget}</dd></div>
                <div className="min-w-0"><dt className="eyebrow">Timeline</dt><dd className="mt-1 text-xs leading-5 text-[var(--text-soft)]">{preview.timeline}</dd></div>
              </dl>

              <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
                <p className="eyebrow">Why this score</p>
                <div className="mt-3 space-y-2.5">
                  {preview.dimensions.map((dim) => (
                    <div key={dim.label}>
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-[var(--text-soft)]">{dim.label}</span>
                        <span className="shrink-0 tabular-nums text-[var(--text-muted)]"><span className="font-semibold text-[var(--text)]">{dim.earned}</span>/{dim.max}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--border-soft)]">
                        <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${dim.max ? (dim.earned / dim.max) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-md border-l-2 border-[var(--brand)] bg-[var(--accent-soft)] p-3 pl-3.5">
                <p className="eyebrow text-[var(--brand-text)]">Recommended next action</p>
                <p className="mt-1.5 text-sm font-semibold leading-6">{preview.nextAction}</p>
              </div>

              <p className="mt-3 text-[11px] leading-5 text-[var(--text-faint)]">A labelled demo scenario. Real leads and their data stay in your browser.</p>
            </aside>
          </div>
        </section>

        <section id={WORKFLOW_ANCHOR} className="scroll-mt-20 border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="eyebrow">How it works</p>
            <ol className="mt-8 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {WORKFLOW_STEPS.map((step, index) => (
                <li key={step.title} className="border-t border-[var(--border)] pt-5">
                  <span className="text-xs font-semibold tabular-nums text-[var(--text-muted)]" aria-hidden="true">0{index + 1}</span>
                  <h2 className="mt-3 text-base font-bold tracking-tight">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      <footer className="border-t border-[var(--border)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center">
          <p>masal.ai · Grounded lead triage for property sales.</p>
          <nav className="flex items-center gap-5" aria-label="Legal">
            <Link href="/privacy" className="transition hover:text-[var(--text)]">Privacy</Link>
            <Link href="/terms" className="transition hover:text-[var(--text)]">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
