import test from "node:test";
import assert from "node:assert/strict";
import {
  isDemoLead, LEADS_STORAGE_KEY, LEADS_VERSION, LEADS_VERSION_KEY, loadStoredLeads,
  parseStoredLeads, pipelineStats, resolveSelectedLead
} from "../lib/leads.ts";
import { buildDemoLeads, DEMOS_DISMISSED_KEY, removeDemoLeads } from "../lib/demos.ts";
import type { Lead } from "../types/lead.ts";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1", name: "Asha Verma", location: "Whitefield, Bengaluru",
    propertyRequirement: "3 BHK apartment", budget: "₹1.4 Cr", timeline: "Within 30 days",
    message: "Ready to buy and would like to visit this weekend.",
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    score: 85, priority: "Act Now", scoreReasons: ["Explicitly ready to purchase"],
    status: "New", chat: [], ...overrides
  };
}

function readFrom(store: Record<string, string>) {
  return (key: string) => store[key] ?? null;
}

// --- The durable, genuine store (never holds demos) ---

test("fresh or invalid storage yields no genuine leads", () => {
  assert.deepEqual(parseStoredLeads(null), []);
  assert.deepEqual(parseStoredLeads(""), []);
  assert.deepEqual(parseStoredLeads("not json"), []);
  assert.deepEqual(parseStoredLeads("{\"a\":1}"), []);
  assert.deepEqual(parseStoredLeads("[]"), []);
});

test("the durable store drops every demo-identified record", () => {
  const records = [
    { id: "demo-1", demo: true },
    { id: "demo-2" },
    { id: "sample-3", sample: true },
    { id: "lead-flag-only", sample: true }
  ];
  assert.deepEqual(parseStoredLeads(JSON.stringify(records)), []);
});

test("a genuine customer who shares a demo name is never dropped", () => {
  const realRahul = makeLead({ id: "lead-9", name: "Rahul" });
  const realPriya = makeLead({ id: "lead-8", name: "Priya" });
  const realArjun = makeLead({ id: "lead-7", name: "Arjun", demo: false });
  const kept = parseStoredLeads(JSON.stringify([realRahul, realPriya, realArjun, null, 42]));
  assert.deepEqual(kept.map((lead) => lead.id), ["lead-9", "lead-8", "lead-7"]);
});

test("a created genuine lead round-trips through the store on refresh", () => {
  const created = makeLead({ id: "lead-abc", name: "Rohan Gupta" });
  const reloaded = parseStoredLeads(JSON.stringify([created]));
  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].id, "lead-abc");
  assert.equal(reloaded[0].name, "Rohan Gupta");
  assert.equal(reloaded[0].priority, "Act Now");
});

// --- Initialization: genuine store + the three labelled demos ---

test("a first visit initializes with the three demos and no genuine leads", () => {
  const leads = loadStoredLeads(readFrom({}));
  assert.equal(leads.length, 3);
  assert.ok(leads.every(isDemoLead));
  assert.deepEqual(leads.map((lead) => lead.id), ["demo-1", "demo-2", "demo-3"]);
});

test("demos are layered in front of the genuine leads and stay separate", () => {
  const store = { [LEADS_STORAGE_KEY]: JSON.stringify([makeLead({ id: "lead-1" }), makeLead({ id: "lead-2" })]) };
  const leads = loadStoredLeads(readFrom(store));
  assert.deepEqual(leads.map((lead) => lead.id), ["demo-1", "demo-2", "demo-3", "lead-1", "lead-2"]);
  assert.equal(leads.filter(isDemoLead).length, 3);
  assert.equal(leads.filter((lead) => !isDemoLead(lead)).length, 2);
});

// --- Deduplication and removal stickiness ---

test("repeated loads never duplicate a demo record", () => {
  const store: Record<string, string> = {
    [LEADS_STORAGE_KEY]: JSON.stringify([makeLead({ id: "lead-1" })]),
    [LEADS_VERSION_KEY]: String(LEADS_VERSION)
  };
  for (let boot = 0; boot < 3; boot += 1) {
    const loaded = loadStoredLeads(readFrom(store));
    assert.equal(loaded.length, 4);
    assert.equal(new Set(loaded.map((lead) => lead.id)).size, 4);
    // The workspace persists only genuine leads (exactly what it does on write).
    store[LEADS_STORAGE_KEY] = JSON.stringify(loaded.filter((lead) => !isDemoLead(lead)));
  }
  assert.deepEqual(JSON.parse(store[LEADS_STORAGE_KEY]).map((lead: Lead) => lead.id), ["lead-1"]);
});

test("removing the demos sticks because the marker suppresses them next load", () => {
  const genuine = makeLead({ id: "lead-1" });
  const store: Record<string, string> = { [LEADS_STORAGE_KEY]: JSON.stringify([genuine]) };
  // Remove: drop the demos and set the marker, exactly as the workspace does.
  removeDemoLeads(loadStoredLeads(readFrom(store)));
  store[DEMOS_DISMISSED_KEY] = "1";
  const reloaded = loadStoredLeads(readFrom(store));
  assert.deepEqual(reloaded.map((lead) => lead.id), ["lead-1"]);

  // Clearing the marker (Show sample scenarios) brings them back, never duplicated.
  delete store[DEMOS_DISMISSED_KEY];
  assert.equal(loadStoredLeads(readFrom(store)).length, 4);
});

test("removing demos preserves the genuine leads alongside them", () => {
  const genuine = [makeLead({ id: "lead-1", name: "Rahul" }), makeLead({ id: "lead-2" })];
  const remaining = removeDemoLeads([...buildDemoLeads(), ...genuine]);
  assert.deepEqual(remaining.map((lead) => lead.id), ["lead-1", "lead-2"]);
});

// --- Stats and selection ---

test("empty-state statistics and priority counts are zero; populated counts correct", () => {
  const empty = pipelineStats([]);
  assert.equal(empty.total, 0);
  assert.equal(empty.actNow, 0);
  assert.equal(empty.followUp, 0);
  assert.equal(empty.avgScore, 0);
  assert.deepEqual(empty.byPriority, { "Act Now": 0, "Follow Up": 0, "Nurture": 0 });

  const populated = pipelineStats([
    makeLead({ id: "a", priority: "Act Now", score: 80 }),
    makeLead({ id: "b", priority: "Nurture", score: 10 })
  ]);
  assert.equal(populated.total, 2);
  assert.equal(populated.actNow, 1);
  assert.equal(populated.avgScore, 45);
  assert.equal(populated.byPriority["Nurture"], 1);
});

test("selection is strict: no id or a stale id resolves to null, never a fallback", () => {
  const a = makeLead({ id: "a" });
  const b = makeLead({ id: "b" });
  assert.equal(resolveSelectedLead([a, b], null), null);
  assert.equal(resolveSelectedLead([a, b], "missing"), null);
  assert.equal(resolveSelectedLead([a, b], "b")?.id, "b");
  assert.equal(resolveSelectedLead([], null), null);
  // Even with demos present and no selection, nothing is auto-shown.
  assert.equal(resolveSelectedLead(loadStoredLeads(readFrom({})), null), null);
});

// --- Creating the first real lead from the default workspace ---

test("creating the first genuine lead works from the default workspace", () => {
  const initial = loadStoredLeads(readFrom({}));
  assert.equal(initial.filter((lead) => !isDemoLead(lead)).length, 0);

  const created = makeLead({ id: "first-lead" });
  const afterCreate = [created, ...initial.filter((lead) => !isDemoLead(lead))];
  assert.equal(pipelineStats(afterCreate).total, 1);
  assert.equal(resolveSelectedLead(afterCreate, created.id)?.id, "first-lead");

  const reloaded = loadStoredLeads(readFrom({ [LEADS_STORAGE_KEY]: JSON.stringify(afterCreate) }));
  assert.deepEqual(reloaded.filter((lead) => !isDemoLead(lead)).map((lead) => lead.id), ["first-lead"]);
});
