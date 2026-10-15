import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DASHBOARD_PATH, HERO, PRIORITY_GUIDANCE, WORKFLOW_ANCHOR, WORKFLOW_STEPS, priorityBand, scoringFactors } from "../lib/landing.ts";
import { PRIORITY_THRESHOLDS, SCORE_MAX, scoreLead } from "../lib/scoring.ts";

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
    ["Capture the enquiry", "Understand readiness", "Take the next action"]
  );
  for (const step of WORKFLOW_STEPS) assert.ok(step.body.length > 0);
});

// The landing scoring factors must be real: the labels and weights come from the
// same deterministic engine the workspace uses, so the page can never show a
// factor or weight the rubric does not apply.
test("the landing scoring factors come from the real engine and total 100", () => {
  const factors = scoringFactors();
  assert.equal(factors.length, 5);
  assert.equal(factors.reduce((sum, factor) => sum + factor.points, 0), SCORE_MAX);
  for (const factor of factors) assert.ok(factor.explanation.length > 0, `${factor.label} needs an explanation`);
  const engine = scoreLead({ name: "", location: "", propertyRequirement: "", budget: "", timeline: "Just exploring / no rush", message: "" });
  assert.deepEqual(
    factors.map((factor) => [factor.key, factor.label, factor.points]),
    engine.dimensions.map((dim) => [dim.key, dim.label, dim.max])
  );
});

test("priority guidance bands are derived from the engine thresholds", () => {
  const bands = Object.fromEntries(PRIORITY_GUIDANCE.map((item) => [item.priority, item.band]));
  assert.equal(bands["Act Now"], `${PRIORITY_THRESHOLDS.actNow}–${SCORE_MAX}`);
  assert.equal(bands["Follow Up"], `${PRIORITY_THRESHOLDS.followUp}–${PRIORITY_THRESHOLDS.actNow - 1}`);
  assert.equal(bands["Nurture"], `0–${PRIORITY_THRESHOLDS.followUp - 1}`);
  assert.deepEqual(PRIORITY_GUIDANCE.map((item) => item.priority), ["Act Now", "Follow Up", "Nurture"]);
  assert.equal(priorityBand("Act Now"), bands["Act Now"]);
});

test("the root route renders the landing page, not the client dashboard", () => {
  const page = read("../app/page.tsx");
  assert.ok(!page.includes('"use client"'), "root page must stay a static server component");
  assert.ok(page.includes("DASHBOARD_PATH"), "root page must link to the dashboard route");
  assert.ok(page.includes("HERO.title"), "root page must render the hero headline");
  assert.ok(page.includes("scoringFactors"), "root page must render the real scoring factors");
  assert.ok(page.includes(`id={SCORING_ANCHOR}`), "the scoring explanation must be its own section");
  assert.ok(page.includes("ScrollReveal"), "the how-it-works cards must be revealed on scroll");
  assert.ok(page.includes("PRIORITY_STYLES"), "priority labels must reuse the shared mapping");
  assert.ok(page.includes('aria-label="Masal AI — home"'), "branding must sit in the header at the top");
  assert.ok(!page.includes('aria-label="Masal AI"'), "the duplicated bottom wordmark must be gone");
  assert.ok(page.includes("/privacy") && page.includes("/terms"), "footer legal links must be present");
  assert.ok(!page.includes("next/image") && !page.includes("<img"), "the summary must use real components, not a fake screenshot");
});

test("the landing page shows no customer data or invented testimonials", () => {
  const page = read("../app/page.tsx");
  for (const name of ["Rahul", "Priya", "Arjun", "(Dummy)"]) assert.ok(!page.includes(name), `the landing page must not name a customer (${name})`);
  for (const word of ["testimonial", "trusted by", "4.9", "★★★★★"]) assert.ok(!page.toLowerCase().includes(word), `the landing page must not invent proof (${word})`);
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
