import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DASHBOARD_PATH, HERO, WORKFLOW_ANCHOR, WORKFLOW_STEPS, landingPreview } from "../lib/landing.ts";
import { priorityForScore, scoreLead } from "../lib/scoring.ts";
import { buildDemoLeads } from "../lib/demos.ts";

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

test("the hero carries the required headline and supporting copy", () => {
  assert.equal(HERO.title, "Every property lead deserves a clear next move.");
  assert.equal(
    HERO.body,
    "Understand buyer readiness, surface unanswered questions, and prepare your next sales conversation from one focused workspace."
  );
});

test("the workflow section lists the three shipped steps", () => {
  assert.equal(WORKFLOW_STEPS.length, 3);
  assert.deepEqual(
    WORKFLOW_STEPS.map((step) => step.title),
    ["Capture requirements", "Understand readiness and missing info", "Take the next sales action"]
  );
  for (const step of WORKFLOW_STEPS) assert.ok(step.body.length > 0);
});

// The product preview must be real: the same demo lead and the same scoring
// engine the workspace uses, so it can never show a score the app disagrees with.
test("the landing preview is built from the real demo lead and scoring engine", () => {
  const preview = landingPreview();
  const [demo] = buildDemoLeads();
  const rescored = scoreLead(demo, { status: "New" });
  assert.equal(preview.score, rescored.score, "preview score must match the engine");
  assert.equal(preview.priority, rescored.priority, "preview priority must match the engine");
  assert.equal(preview.priority, priorityForScore(preview.score), "preview priority must follow the thresholds");
  assert.ok(preview.name.endsWith("(Dummy)"), "the preview must be clearly labelled as a demo");
  assert.equal(preview.dimensions.length, 5);
  assert.equal(preview.dimensions.reduce((sum, dim) => sum + dim.max, 0), 100);
  assert.ok(preview.nextAction.length > 0, "the preview must show a recommended next action");
});

test("the root route renders the landing page, not the client dashboard", () => {
  const page = read("../app/page.tsx");
  assert.ok(!page.includes('"use client"'), "root page must stay a static server component");
  assert.ok(page.includes("DASHBOARD_PATH"), "root page must link to the dashboard route");
  assert.ok(page.includes("HERO.title"), "root page must render the hero headline");
  assert.ok(page.includes("landingPreview"), "root page must render the real product preview");
  assert.ok(page.includes("/privacy") && page.includes("/terms"), "footer legal links must be present");
  assert.ok(!page.includes("next/image") && !page.includes("<img"), "the preview must use real components, not a fake screenshot");
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
