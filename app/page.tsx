import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { DASHBOARD_PATH, HERO, WORKFLOW_ANCHOR, WORKFLOW_STEPS } from "@/lib/landing";
import { ThemeToggle } from "@/components/theme-toggle";

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
  "inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)]";

export default function LandingPage() {
  return (
    <main id="main" className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-[var(--brand)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--on-brand)]">Skip to content</a>

      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
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
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{HERO.title}</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-soft)] sm:text-lg">{HERO.body}</p>
          <div className="mt-9">
            <Link href={DASHBOARD_PATH} className={primaryButton}>
              Open Dashboard <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section id={WORKFLOW_ANCHOR} className="scroll-mt-20 border-t border-[var(--border)]">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
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
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} masal.ai</p>
          <nav className="flex items-center gap-5" aria-label="Legal">
            <Link href="/privacy" className="transition hover:text-[var(--text)]">Privacy</Link>
            <Link href="/terms" className="transition hover:text-[var(--text)]">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
