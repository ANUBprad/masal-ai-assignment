import Link from "next/link";
import { Home } from "lucide-react";

// Shared, dependency-free shell for the static legal pages (Privacy, Terms).
// A server component: no client state, so these routes stay static.
export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2" aria-label="Masal AI — back to the dashboard">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[var(--ink-solid)] text-[var(--lime)]" aria-hidden="true"><Home size={16}/></span>
            <span className="truncate text-sm font-bold tracking-tight">masal<span className="text-[var(--brand-text)]">.ai</span></span>
          </Link>
          <nav className="flex shrink-0 items-center gap-0.5 text-sm" aria-label="Legal">
            <Link href="/privacy" className="rounded-md px-2.5 py-1.5 font-medium text-[var(--text-muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]">Privacy</Link>
            <Link href="/terms" className="rounded-md px-2.5 py-1.5 font-medium text-[var(--text-muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]">Terms</Link>
            <Link href="/dashboard" className="rounded-md px-2.5 py-1.5 font-semibold text-[var(--brand-text)] transition hover:bg-[var(--hover)]">Back to app</Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6" id="main-content">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-[var(--text-faint)]">Last updated {updated}</p>
        <div className="mt-6 space-y-6 text-sm leading-6 text-[var(--text-soft)]">{children}</div>
      </div>
      <footer className="border-t border-[var(--border)] px-4 py-5 text-center text-xs text-[var(--text-faint)]">
        masal.ai — a demo lead-triage workspace. Scores are heuristic, not a guarantee of conversion.
      </footer>
    </main>
  );
}

// Consistent heading + paragraph styling for the legal copy.
export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold tracking-tight text-[var(--text)]">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
