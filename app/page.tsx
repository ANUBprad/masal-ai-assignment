import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { DASHBOARD_PATH, HERO, WORKFLOW_ANCHOR, WORKFLOW_STEPS } from "@/lib/landing";

// The root route is the marketing entry point. It is a static server component:
// no client state, so next prerenders it and it never touches lead data.
export const metadata: Metadata = {
  title: { absolute: "Masal AI — Turn property inquiries into clear next steps" },
  description: HERO.body,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Masal AI — Turn property inquiries into clear next steps",
    description: HERO.body
  }
};

const primaryButton =
  "inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)]";
const secondaryButton =
  "inline-flex items-center gap-2 rounded-lg border border-[var(--border-input)] px-4 py-2.5 text-sm font-semibold text-[var(--text-soft)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]";

export default function LandingPage() {
  return (
    <main id="main" className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--brand)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--on-brand)]">Skip to content</a>

      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Masal AI — home">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[var(--ink-solid)] text-[var(--lime)]" aria-hidden="true"><Home size={16}/></span>
            <span className="truncate text-sm font-bold tracking-tight">masal<span className="text-[var(--brand-text)]">.ai</span></span>
          </Link>
          <Link href={DASHBOARD_PATH} className={primaryButton}>
            Open Dashboard <ArrowRight size={15} aria-hidden="true"/>
          </Link>
        </div>
      </header>

      <div id="main-content">
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Real-estate lead intelligence</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">{HERO.title}</h1>
            <p className="mt-5 text-base leading-7 text-[var(--text-soft)] sm:text-lg">{HERO.body}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={DASHBOARD_PATH} className={primaryButton}>Open Dashboard</Link>
              <a href={`#${WORKFLOW_ANCHOR}`} className={secondaryButton}>See how it works</a>
            </div>
          </div>
        </section>

        <section id={WORKFLOW_ANCHOR} className="scroll-mt-20 border-t border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">Three steps from a raw enquiry to a prepared follow-up.</p>
            <ol className="mt-10 grid gap-6 sm:grid-cols-3">
              {WORKFLOW_STEPS.map((step, index) => (
                <li key={step.title} className="panel p-5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-sm font-bold text-[var(--brand-text)]" aria-hidden="true">{index + 1}</span>
                  <h3 className="mt-4 text-base font-bold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="panel flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Ready to organize your next lead?</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">Open the workspace and add your first enquiry.</p>
              </div>
              <Link href={DASHBOARD_PATH} className={`${primaryButton} shrink-0`}>Open Dashboard</Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-[var(--border)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-[var(--text-faint)] sm:flex-row">
          <p>masal.ai</p>
          <nav className="flex items-center gap-5" aria-label="Legal">
            <Link href="/privacy" className="transition hover:text-[var(--text-muted)]">Privacy Policy</Link>
            <Link href="/terms" className="transition hover:text-[var(--text-muted)]">Terms &amp; Conditions</Link>
          </nav>
          <p>© {new Date().getFullYear()} masal.ai</p>
        </div>
      </footer>
    </main>
  );
}
