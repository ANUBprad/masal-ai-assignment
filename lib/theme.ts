// Theme preference: a single, dependency-free source of truth shared by the
// pre-paint bootstrap script (app/layout.tsx) and the client toggle. The CSS
// token sets live in app/globals.css: the light set is the default on `:root`
// (so the server-rendered HTML and the first paint are light with no flash), and
// the dark set is applied by `:root[data-theme="dark"]`.
export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "masal-ai-theme";
export const THEME_ATTRIBUTE = "data-theme";
export const DEFAULT_THEME: Theme = "light";

export function normalizeTheme(value: unknown): Theme | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}

// A saved preference is always honoured; with no valid preference the default
// (light) is used, independent of the OS setting, so the app opens the same way
// for everyone. Kept pure so it can be unit-tested without a DOM.
export function resolveInitialTheme(stored: string | null | undefined): Theme {
  return normalizeTheme(stored) ?? DEFAULT_THEME;
}

export function otherTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}
