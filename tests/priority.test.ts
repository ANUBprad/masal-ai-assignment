import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PRIORITIES, PRIORITY_BAR, PRIORITY_STYLES } from "../lib/scoring.ts";

// Priority colour is display-only data, so it is covered two ways: the shared
// mapping in lib/scoring.ts is imported and asserted directly, and the theme
// tokens it points at are checked from app/globals.css (a browser-only file the
// framework-free harness cannot import). This is the runnable guard that every
// priority reads the same colour everywhere and stays correct in both themes.
const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

test("every priority maps to one shared class and one shared colour token", () => {
  for (const priority of PRIORITIES) {
    assert.match(PRIORITY_STYLES[priority], /^priority-(act|follow|nurture)$/, `${priority} must use a shared class`);
    assert.match(PRIORITY_BAR[priority], /^var\(--priority-(act|follow|nurture)\)$/, `${priority} must use a shared colour token`);
  }
  assert.equal(new Set(PRIORITIES.map((p) => PRIORITY_STYLES[p])).size, 3, "each priority must have a distinct class");
  assert.equal(new Set(PRIORITIES.map((p) => PRIORITY_BAR[p])).size, 3, "each priority must have a distinct colour");
});

test("the theme defines each priority colour and class, overridden for the light theme", () => {
  const css = read("../app/globals.css");
  for (const token of ["--priority-act", "--priority-follow", "--priority-nurture"]) {
    assert.ok(css.includes(`${token}:`), `missing ${token}`);
    assert.ok(css.includes(`${token}-glow:`), `missing ${token}-glow`);
  }
  for (const cls of [".priority-act", ".priority-follow", ".priority-nurture", ".priority-dot"]) {
    assert.ok(css.includes(cls), `missing ${cls}`);
  }
  assert.ok(css.includes("--priority-glow:"), "each label class must publish --priority-glow for its dot indicator");
  const dark = css.slice(css.indexOf(':root[data-theme="dark"]'));
  for (const token of ["--priority-act:", "--priority-follow:", "--priority-nurture:"]) {
    assert.ok(dark.includes(token), `the dark theme must override ${token}`);
  }
});
