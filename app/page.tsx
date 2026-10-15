import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { DASHBOARD_PATH, HERO, PRIORITY_GUIDANCE, SCORING_ANCHOR, WORKFLOW_ANCHOR, WORKFLOW_STEPS, scoringFactors } from "@/lib/landing";
import { PRIORITIES, PRIORITY_STYLES } from "@/lib/scoring";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ThemeToggle } from "@/components/theme-toggle";

// The root route is the marketing entry point. It is a static server component:
// no client state, so next prerenders it and it never touches lead data. The
// product visual is a customer-neutral 100-point scoring breakdown built from the
// real engine (lib/landing.ts → lib/scoring.ts), never a mock, a screenshot, or
// an invented customer.
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

// The brand mark is one component used in the header, the hero, and the footer,
// so the `masal`/`.ai` treatment and the green accent cannot drift between them.
function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-extrabold tracking-tight ${className}`.trim()}>masal<span className="text-[var(--brand-text)]">.ai</span></span>;
}

// A customer-neutral visualization of the real workflow: captured requirements
// feed the deterministic score, which lands the lead in a sales-priority band,
// which drives the next action. No customer names, values, or fabricated proof.
function HeroFlow() {
  return (
    <aside aria-label="How Masal AI turns an enquiry into a next action" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">The workflow</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Deterministic score</span>
      </div>
      <ol className="mt-6 space-y-6">
        <li>
          <p className="text-sm font-bold tracking-tight"><span className="mr-2 text-xs text-[var(--brand-text)]">01</span>Buyer requirements</p>
          <p className="mt-1.5 text-xs leading-5 text-[var(--text-soft)]">Location, configuration, budget, and timeline are captured from the enquiry.</p>
        </li>
        <li>
          <p className="text-sm font-bold tracking-tight"><span className="mr-2 text-xs text-[var(--brand-text)]">02</span>Evidence-based sales priority</p>
          <p className="mt-1.5 text-xs leading-5 text-[var(--text-soft)]">A deterministic 0–100 score places the lead in one band.</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {PRIORITIES.map((priority) => (
              <span key={priority} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${PRIORITY_STYLES[priority]}`}>
                <span className="priority-dot h-1.5 w-1.5 rounded-full" aria-hidden="true" />
                {priority}
              </span>
            ))}
          </div>
        </li>
        <li>
          <p className="text-sm font-bold tracking-tight"><span className="mr-2 text-xs text-[var(--brand-text)]">03</span>Next best action</p>
          <p className="mt-1.5 text-xs leading-5 text-[var(--text-soft)]">The workspace prepares the next step — a follow-up, a call brief, or a grounded reply.</p>
        </li>
      </ol>
      <Link href={`#${SCORING_ANCHOR}`} className="mt-6 flex items-center gap-1.5 border-t border-[var(--border-soft)] pt-4 text-xs font-semibold text-[var(--brand-text)] transition hover:text-[var(--text)]">
        See how the 100-point score works <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </aside>
  );
}

export default function LandingPage() {
  const factors = scoringFactors();
  return (
    <main id="main" className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-[var(--brand)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--on-brand)]">Skip to content</a>

      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Masal AI — home">
            <Home size={18} className="shrink-0 text-[var(--brand)]" aria-hidden="true" />
            <Wordmark className="truncate text-sm" />
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
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
            <div className="min-w-0">
              <p className="eyebrow">Lead intelligence for property sales</p>
              <h1 className="mt-4 text-[clamp(2.75rem,8vw,4.75rem)] leading-none">
                <Wordmark />
              </h1>
              <p className="mt-6 max-w-xl text-lg font-semibold leading-7 tracking-tight sm:text-xl">{HERO.title}</p>
              <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-soft)]">{HERO.body}</p>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href={DASHBOARD_PATH} className={primaryButton}>
                  Open Dashboard <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href={`#${WORKFLOW_ANCHOR}`} className={secondaryLink}>
                  See how it works
                </Link>
              </div>
            </div>
            <HeroFlow />
          </div>
        </section>

        <section id={WORKFLOW_ANCHOR} className="scroll-mt-20 border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">From raw enquiry to a confident next step.</h2>
            <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {WORKFLOW_STEPS.map((step, index) => (
                <li key={step.title}>
                  <ScrollReveal index={index} className="h-full border-t border-[var(--border)] pt-5">
                    <span className="text-xs font-semibold tabular-nums text-[var(--brand-text)]" aria-hidden="true">0{index + 1}</span>
                    <h3 className="mt-3 text-base font-bold tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{step.body}</p>
                  </ScrollReveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id={SCORING_ANCHOR} className="scroll-mt-20 border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="eyebrow">Lead scoring</p>
            <h2 className="mt-3 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">A transparent 100-point score.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-soft)] sm:text-base">Every enquiry is scored out of 100 and grouped into a sales priority. Each factor below contributes its own weight, so you can see exactly why a lead ranks where it does.</p>

            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-12">
              <aside aria-label="How leads are ranked" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">How leads are ranked</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Deterministic</span>
                </div>

                <div className="mt-5">
                  <p className="eyebrow">Sales priority</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                    {PRIORITIES.map((priority) => (
                      <span key={priority} className={`inline-flex items-center gap-2 text-sm font-semibold ${PRIORITY_STYLES[priority]}`}>
                        <span className="priority-dot h-2 w-2 rounded-full" aria-hidden="true" />
                        {priority}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
                  <p className="eyebrow">Score breakdown · 100 points</p>
                  <div className="mt-3 space-y-2.5">
                    {factors.map((factor) => (
                      <div key={factor.key}>
                        <div className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="text-[var(--text-soft)]">{factor.label}</span>
                          <span className="shrink-0 tabular-nums text-[var(--text-muted)]">{factor.points} pts</span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--border-soft)]">
                          <div className="h-full w-full rounded-full bg-[var(--brand)]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-md border-l-2 border-[var(--brand)] bg-[var(--accent-soft)] p-3 pl-3.5">
                  <p className="eyebrow text-[var(--brand-text)]">Recommended next action</p>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--text-soft)]">Every lead carries a clear next step — a follow-up, a call brief, or a grounded sales conversation.</p>
                </div>
              </aside>

              <div className="min-w-0">
                <p className="eyebrow">The five factors</p>
                <ul className="mt-3 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
                  {factors.map((factor) => (
                    <li key={factor.key} className="flex items-start justify-between gap-4 py-3.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{factor.label}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{factor.explanation}</p>
                      </div>
                      <span className="shrink-0 text-right text-sm font-semibold tabular-nums leading-none text-[var(--brand-text)]"><span className="text-base">{factor.points}</span><span className="mt-1 block text-[10px] font-normal text-[var(--text-muted)]">pts</span></span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-right text-xs font-semibold text-[var(--text-soft)]">Total · 100 points</p>

                <div className="mt-8 border-t border-[var(--border-soft)] pt-6">
                  <p className="eyebrow">What each priority means</p>
                  <ul className="mt-3 space-y-3">
                    {PRIORITY_GUIDANCE.map((item) => (
                      <li key={item.priority} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className={`text-sm font-semibold ${PRIORITY_STYLES[item.priority]}`}>{item.priority}</span>
                        <span className="text-xs font-semibold tabular-nums text-[var(--text-muted)]">{item.band} pts</span>
                        <span className="w-full text-sm leading-6 text-[var(--text-soft)]">{item.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-8 border-t border-[var(--border-soft)] pt-4 text-xs leading-5 text-[var(--text-faint)]">The score helps prioritise sales attention. It is a provisional, rule-based estimate — not a guarantee that a lead will convert.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-[var(--border)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1.5">
            <Wordmark className="text-sm text-[var(--text)]" />
            <p>Grounded lead triage for property sales.</p>
          </div>
          <nav className="flex items-center gap-5" aria-label="Legal">
            <Link href="/privacy" className="transition hover:text-[var(--text)]">Privacy</Link>
            <Link href="/terms" className="transition hover:text-[var(--text)]">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
