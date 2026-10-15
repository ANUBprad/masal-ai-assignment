import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DASHBOARD_PATH, WORKFLOW_ANCHOR, WORKFLOW_STEPS } from "../lib/landing.ts";

// The test harness is the repository's framework-free `node --test` runner: it
// strips types but not JSX, and there is no DOM. So the root route is verified
// two ways — the shared route/content module is asserted directly, and the two
// page files are checked for the wiring that keeps "/" the landing page and
// "/dashboard" the client workspace. This is the runnable guard for the split;
// full render is covered by `next build` and browser checks.
const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

test("the primary CTA targets the real dashboard route", () => {
  assert.equal(DASHBOARD_PATH, "/dashboard");
  assert.equal(WORKFLOW_ANCHOR, "how-it-works");
});

test("the workflow section lists the three shipped steps", () => {
  assert.equal(WORKFLOW_STEPS.length, 3);
  assert.deepEqual(
    WORKFLOW_STEPS.map((step) => step.title),
    ["Capture a lead", "Understand readiness", "Take the next step"]
  );
  for (const step of WORKFLOW_STEPS) assert.ok(step.body.length > 0);
});

test("the root route renders the landing page, not the client dashboard", () => {
  const page = read("../app/page.tsx");
  assert.ok(!page.includes('"use client"'), "root page must stay a static server component");
  assert.ok(page.includes("DASHBOARD_PATH"), "root page must link to the dashboard route");
  assert.ok(page.includes("HERO.title"), "root page must render the hero headline");
  assert.ok(page.includes("/privacy") && page.includes("/terms"), "footer legal links must be present");
});

test("the dashboard lives at /dashboard and stays the client workspace", () => {
  const dashboard = read("../app/dashboard/page.tsx");
  assert.ok(dashboard.startsWith('"use client"'), "dashboard must remain a client component");
  assert.ok(dashboard.includes("LEADS_STORAGE_KEY"), "dashboard must keep using the persisted lead store");
  const layout = read("../app/dashboard/layout.tsx");
  assert.ok(layout.includes("index: false"), "dashboard must be marked non-indexable");
});

test("the footer's legal pages exist and are wired to a shell", () => {
  assert.ok(read("../app/privacy/page.tsx").includes("LegalShell"));
  assert.ok(read("../app/terms/page.tsx").includes("LegalShell"));
});
