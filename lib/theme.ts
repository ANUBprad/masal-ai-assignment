// Theme preference: a single, dependency-free source of truth shared by the
// pre-paint bootstrap script (app/layout.tsx) and the client toggle. The CSS
// token sets live in app/globals.css under `:root` (dark) and
// `:root[data-theme="light"]`.
export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "masal-ai-theme";
export const THEME_ATTRIBUTE = "data-theme";
export const DEFAULT_THEME: Theme = "dark";

export function normalizeTheme(value: unknown): Theme | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}

// Stored preference wins; otherwise fall back to the OS setting. Kept pure so
// it can be unit-tested without a DOM.
export function resolveInitialTheme(stored: string | null | undefined, prefersLight: boolean): Theme {
  return normalizeTheme(stored) ?? (prefersLight ? "light" : "dark");
}

export function otherTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}
