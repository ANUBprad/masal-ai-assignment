import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-screen place-items-center px-4">
      <div className="flex max-w-sm flex-col items-start gap-2">
        <Home size={22} className="text-[var(--brand)]" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">404</p>
        <h1 className="text-xl font-bold tracking-tight">Page not found</h1>
        <p className="text-sm leading-6 text-[var(--text-muted)]">The page you were looking for does not exist or has moved.</p>
        <Link href="/dashboard" className="mt-3 inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)]">
          Back to the dashboard
        </Link>
      </div>
    </main>
  );
}
