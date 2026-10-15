import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import nextConfig, { buildSecurityHeaders } from "../next.config.ts";
import { validateLeadFields } from "../lib/validation.ts";
import { parseStoredLeads } from "../lib/leads.ts";
import type { Lead, LeadInput } from "../types/lead.ts";

// The harness strips types but not JSX and has no DOM, so the browser-only
// dashboard is covered two ways: the security policy and validation are
// imported and asserted directly, and the page's interaction wiring is checked
// from source. Full render is covered by `next build` and browser checks.
const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const dashboardSource = () => read("../app/dashboard/page.tsx");

function csp(isDevelopment: boolean): string {
  const header = buildSecurityHeaders(isDevelopment).find((item) => item.key === "Content-Security-Policy");
  assert.ok(header, "Content-Security-Policy must always be set");
  return header.value;
}

// --- CSP: the failure that stopped the Add Lead click from doing anything ---

test("production CSP forbids eval and stays self-only", () => {
  const value = csp(false);
  assert.ok(value.includes("script-src 'self' 'unsafe-inline'"), value);
  assert.ok(!value.includes("unsafe-eval"), "production must never allow eval");
  assert.ok(value.includes("default-src 'self'"));
  assert.ok(value.includes("frame-ancestors 'none'"));
});

test("development CSP allows the React Refresh runtime to eval", () => {
  const value = csp(true);
  assert.ok(value.includes("script-src 'self' 'unsafe-inline' 'unsafe-eval'"), value);
  assert.ok(!value.includes("default-src *"), "development must not widen other directives");
});

test("the Content-Security-Policy header is applied to every route", async () => {
  const rules = await nextConfig.headers!();
  assert.equal(rules.length, 1);
  assert.equal(rules[0].source, "/(.*)");
  const keys = rules[0].headers.map((header) => header.key);
  for (const key of [
    "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy",
    "Permissions-Policy", "Cross-Origin-Opener-Policy", "Content-Security-Policy"
  ]) assert.ok(keys.includes(key), `missing ${key}`);
});

// --- Add Lead interaction wiring (static; JSX cannot be imported) ---

test("both Add Lead actions open the same intake form", () => {
  const source = dashboardSource();
  assert.ok(source.includes("function openForm() { setShowForm(true); setSidebarOpen(false); }"), "a single opener must set the form open");
  assert.ok((source.match(/onClick=\{openForm\}/g) ?? []).length >= 2, "the sidebar and the empty state must both open the form");
  assert.ok(source.includes("{showForm &&"), "the form must render only while open");
});

test("the intake form can be closed from every control", () => {
  const source = dashboardSource();
  assert.ok((source.match(/setShowForm\(false\)/g) ?? []).length >= 3, "backdrop, close, and cancel must all close the form");
});

test("the intake form submits through createLead and the shared store", () => {
  const source = dashboardSource();
  assert.ok(source.includes("onSubmit={createLead}"), "the form must submit through createLead");
  assert.ok(source.includes("validateLeadFields(form)"), "createLead must validate before saving");
  assert.ok(source.includes("setLeads((current) => [lead, ...current])"), "a saved lead must be prepended to the list");
  assert.ok(source.includes("LEADS_STORAGE_KEY"), "the workspace must persist to the shared store");
});

// --- Validation and persistence through the real functions ---

const genuine: LeadInput = {
  name: "Meera Nair", location: "Indiranagar, Bengaluru", propertyRequirement: "3 BHK apartment",
  budget: "₹1.5 Cr", timeline: "Within 30 days", message: "Ready to visit this weekend."
};

test("the intake form's field validation accepts a genuine lead", () => {
  assert.deepEqual(validateLeadFields(genuine), {});
});

test("the intake form's field validation flags each missing field", () => {
  const errors = validateLeadFields({ ...genuine, name: "", location: "", propertyRequirement: "", budget: "", message: "" });
  assert.deepEqual(Object.keys(errors).sort(), ["budget", "location", "message", "name", "propertyRequirement"]);
});

test("a value the form accepts survives the persisted-store round trip", () => {
  assert.deepEqual(validateLeadFields(genuine), {});
  const lead: Lead = {
    ...genuine, id: "lead-intake-1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    score: 80, priority: "Follow Up", scoreReasons: [], status: "New", chat: []
  };
  const reloaded = parseStoredLeads(JSON.stringify([lead]));
  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].name, "Meera Nair");
  assert.equal(reloaded[0].timeline, "Within 30 days");
});

// --- Data integrity: empty by default, no auto-selection, samples explicit ---

test("the workspace does not auto-select a lead on load", () => {
  const source = dashboardSource();
  assert.ok(!source.includes("setSelectedId(saved[0].id)"), "a fresh load must not auto-select a lead");
  assert.ok(source.includes("if (saved.length) setLeads(saved);"), "an empty store must leave the workspace empty");
});

test("deleting the selected lead clears the selection instead of jumping to another", () => {
  const source = dashboardSource();
  assert.ok(source.includes("if (selectedId === id) setSelectedId(null)"), "deleting must clear the selection");
  assert.ok(!source.includes("setSelectedId(remaining[0]"), "deleting must not fall through to another customer");
});

test("the workspace is a sidebar layout with the theme toggle", () => {
  const source = dashboardSource();
  assert.ok(source.includes('id="leads-sidebar"'), "the leads list must live in a sidebar");
  assert.ok(source.includes("ThemeToggle"), "the sidebar must offer the theme toggle");
  assert.ok(source.includes("Overview"), "the first detail tab must be renamed Overview");
});

test("optional sample data is only produced by the explicit action", () => {
  const source = dashboardSource();
  assert.equal((source.match(/buildSampleLeads\(/g) ?? []).length, 1, "exactly one call site for the sample builder");
  assert.ok(source.includes("function loadSamples()"), "samples load through a named action");
  assert.ok(source.includes("removeSampleLeads"), "samples must be removable");
  assert.ok(source.includes("isSampleLead(lead)"), "sample rows must be identifiable in the list");
});
