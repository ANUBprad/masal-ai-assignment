import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-screen place-items-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--ink-solid)] text-[var(--lime)]" aria-hidden="true"><Home size={22}/></span>
        <div>
          <p className="eyebrow">404</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">Page not found</h1>
          <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">The page you were looking for does not exist or has moved.</p>
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)]">
          <Home size={16}/> Back to the dashboard
        </Link>
      </div>
    </main>
  );
}
