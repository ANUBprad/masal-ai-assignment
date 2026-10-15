"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { DEFAULT_THEME, otherTheme, THEME_ATTRIBUTE, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

// Reads the theme the pre-paint bootstrap script already applied, so the icon is
// correct after hydration without a mismatch (the server always renders the
// dark-default icon).
function readTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return document.documentElement.getAttribute(THEME_ATTRIBUTE) === "light" ? "light" : "dark";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => { setTheme(readTheme()); }, []);

  function toggle() {
    const next = otherTheme(theme);
    setTheme(next);
    document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* preference is best-effort */ }
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)] ${className}`.trim()}
    >
      {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
    </button>
  );
}
