import test from "node:test";
import assert from "node:assert/strict";
import { isSeededLead, parseStoredLeads, pipelineStats, resolveSelectedLead } from "../lib/leads.ts";
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

const seededDemo = makeLead({ id: "demo-1", name: "Priya Sharma", demo: true });

// 1. Fresh or corrupt storage must yield an empty workspace, not sample data.
test("fresh or invalid storage initializes with zero leads", () => {
  assert.deepEqual(parseStoredLeads(null), []);
  assert.deepEqual(parseStoredLeads(""), []);
  assert.deepEqual(parseStoredLeads("not json"), []);
  assert.deepEqual(parseStoredLeads("{\"a\":1}"), []);
  assert.deepEqual(parseStoredLeads("[]"), []);
});

// 2. Seeded demo leads are never returned on first load or refresh.
test("seeded demo leads are never loaded from storage", () => {
  assert.deepEqual(parseStoredLeads(JSON.stringify([seededDemo])), []);
  assert.deepEqual(parseStoredLeads(JSON.stringify([seededDemo, seededDemo])), []);
});

// 3. A lead created by the salesperson survives a reload.
test("a created lead round-trips through storage on refresh", () => {
  const created = makeLead({ id: "lead-abc", name: "Rohan Gupta" });
  const reloaded = parseStoredLeads(JSON.stringify([created]));
  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].id, "lead-abc");
  assert.equal(reloaded[0].name, "Rohan Gupta");
  assert.equal(reloaded[0].priority, "Act Now");
});

// 4. Migration drops only reliably identified seeds; ambiguous records stay.
test("legacy demo records are removed without deleting ambiguous records", () => {
  assert.equal(isSeededLead(seededDemo), true);
  assert.equal(isSeededLead({}), false);
  assert.equal(isSeededLead(null), false);

  const userLead = makeLead({ id: "lead-2", name: "Meera Nair" });
  const explicitNotDemo = makeLead({ id: "lead-3", demo: false });
  assert.equal(isSeededLead(userLead), false);
  assert.equal(isSeededLead(explicitNotDemo), false);

  const parsed = parseStoredLeads(JSON.stringify([seededDemo, userLead, explicitNotDemo, null, 42]));
  assert.deepEqual(parsed.map((lead) => lead.id), ["lead-2", "lead-3"]);
});

// 5. Empty-state stats and priority counts are zero; populated counts are correct.
test("empty workspace statistics and priority counts are zero", () => {
  const empty = pipelineStats([]);
  assert.equal(empty.total, 0);
  assert.equal(empty.actNow, 0);
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

// 6. An empty workspace never resolves a selected lead (no detail panel crash).
test("an empty workspace resolves no selected lead", () => {
  assert.equal(resolveSelectedLead([], null), undefined);
  assert.equal(resolveSelectedLead([], "demo-1"), undefined);
});

test("selection falls back to the first lead and ignores a stale id", () => {
  const a = makeLead({ id: "a" });
  const b = makeLead({ id: "b" });
  assert.equal(resolveSelectedLead([a, b], null)?.id, "a");
  assert.equal(resolveSelectedLead([a, b], "b")?.id, "b");
  assert.equal(resolveSelectedLead([a, b], "missing")?.id, "a");
});

// 7. Creating the first lead from the empty state works end to end.
test("creating the first lead from an empty workspace persists it", () => {
  const empty = parseStoredLeads(null);
  assert.equal(empty.length, 0);

  const first = makeLead({ id: "first-lead" });
  const afterCreate = [first, ...empty];
  assert.equal(pipelineStats(afterCreate).total, 1);
  assert.equal(resolveSelectedLead(afterCreate, first.id)?.id, "first-lead");

  const reloaded = parseStoredLeads(JSON.stringify(afterCreate));
  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].id, "first-lead");
});
