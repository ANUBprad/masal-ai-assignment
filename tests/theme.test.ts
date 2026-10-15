import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_THEME, THEME_ATTRIBUTE, THEME_STORAGE_KEY, normalizeTheme, otherTheme, resolveInitialTheme
} from "../lib/theme.ts";

const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

// --- Pure preference logic (no DOM) ---

test("a stored preference is always honoured", () => {
  assert.equal(resolveInitialTheme("light"), "light");
  assert.equal(resolveInitialTheme("dark"), "dark");
});

test("an absent or invalid preference falls back to the light default", () => {
  assert.equal(resolveInitialTheme(null), "light");
  assert.equal(resolveInitialTheme(undefined), "light");
  assert.equal(resolveInitialTheme("bogus"), "light");
  assert.equal(DEFAULT_THEME, "light");
});

test("normalizeTheme accepts only the two supported values", () => {
  assert.equal(normalizeTheme("light"), "light");
  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("LIGHT"), undefined);
  assert.equal(normalizeTheme(1), undefined);
});

test("otherTheme flips between the two themes", () => {
  assert.equal(otherTheme("dark"), "light");
  assert.equal(otherTheme("light"), "dark");
});

// The theme preference must not share storage with the lead store, so a theme
// change can never add, move, or duplicate a lead.
test("the theme key is independent of the leads store", () => {
  assert.equal(THEME_STORAGE_KEY, "masal-ai-theme");
  assert.notEqual(THEME_STORAGE_KEY, "masal-ai-leads-v1");
  assert.equal(THEME_ATTRIBUTE, "data-theme");
});

// --- Wiring (static; JSX and CSS are not importable in this harness) ---

test("both theme token sets are defined in one stylesheet, light as the default", () => {
  const css = read("../app/globals.css");
  assert.ok(css.includes(':root[data-theme="dark"]'), "the dark selector must exist");
  assert.ok(css.includes("--bg: #000000"), "dark background token");
  assert.ok(css.includes("--bg: #f3f3ee"), "light background token");
  assert.ok(css.includes("--brand: #8fbf9f"), "dark muted-green accent");
  assert.ok(css.includes("--brand: #356b4b"), "light muted-green accent");
  // The default `:root` (before any data-theme attribute) must be the light set,
  // so the server-rendered first paint is light and never flashes dark.
  const base = css.slice(css.indexOf(":root {"), css.indexOf(':root[data-theme="dark"]'));
  assert.ok(base.includes("color-scheme: light") && base.includes("--bg: #f3f3ee"), "the base token set must be light");
});

test("the layout applies the stored theme before paint", () => {
  const layout = read("../app/layout.tsx");
  assert.ok(layout.includes("THEME_STORAGE_KEY") && layout.includes("THEME_ATTRIBUTE"));
  assert.ok(layout.includes("dangerouslySetInnerHTML"), "an inline pre-paint script must set the theme");
  assert.ok(layout.includes("suppressHydrationWarning"));
});

test("the toggle reads and persists through the shared theme key", () => {
  const toggle = read("../components/theme-toggle.tsx");
  assert.ok(toggle.includes("THEME_STORAGE_KEY") && toggle.includes("THEME_ATTRIBUTE"));
  assert.ok(toggle.includes('"use client"'), "the toggle is interactive");
});

test("the theme toggle is reachable from the landing and dashboard headers", () => {
  assert.ok(read("../app/page.tsx").includes("ThemeToggle"));
  assert.ok(read("../app/dashboard/page.tsx").includes("ThemeToggle"));
});
