import test from "node:test";
import assert from "node:assert/strict";
import {
  isSeededLead, loadStoredLeads, migrateSeededLeads, parseStoredLeads, pipelineStats,
  resolveSelectedLead, LEADS_STORAGE_KEY, LEADS_VERSION_KEY, LEADS_VERSION
} from "../lib/leads.ts";
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

// The real fixture that caused the bug: seed ids written by the original code
// before the `demo: true` flag existed.
const flaglessSeed = makeLead({ id: "demo-2", name: "Rahul Mehta" });
const flaggedSeed = makeLead({ id: "demo-1", name: "Priya Sharma", demo: true });

function readFrom(store: Record<string, string>) {
  return (key: string) => store[key] ?? null;
}

// 1. Fresh or corrupt storage must yield an empty workspace, not sample data.
test("fresh or invalid storage initializes with zero leads", () => {
  assert.deepEqual(parseStoredLeads(null), []);
  assert.deepEqual(parseStoredLeads(""), []);
  assert.deepEqual(parseStoredLeads("not json"), []);
  assert.deepEqual(parseStoredLeads("{\"a\":1}"), []);
  assert.deepEqual(parseStoredLeads("[]"), []);
});

// 2. Seeded demo leads are never returned — whether marked by the flag or only
//    by their id (the actual bug: flagless legacy records). The reserved
//    "demo-" id prefix covers the three known fixtures and any straggler.
test("seeded demo leads are never loaded, with or without the demo flag", () => {
  assert.deepEqual(parseStoredLeads(JSON.stringify([flaggedSeed])), []);
  assert.deepEqual(parseStoredLeads(JSON.stringify([flaglessSeed])), []);
  assert.deepEqual(parseStoredLeads(JSON.stringify([flaggedSeed, flaglessSeed])), []);
  assert.equal(isSeededLead(flaglessSeed), true);
  assert.equal(isSeededLead({ id: "demo-1" }), true);
  assert.equal(isSeededLead({ id: "demo-2" }), true);
  assert.equal(isSeededLead({ id: "demo-3" }), true);
  assert.equal(isSeededLead({ id: "demo-99" }), true);
});

// The prefix rule must not overreach: a generated id that merely contains the
// letters never starts with the reserved prefix, so it is always kept.
test("the reserved demo prefix never matches a normal generated id", () => {
  assert.equal(isSeededLead({ id: "democracy" }), false);
  assert.equal(isSeededLead({ id: "lead-demo" }), false);
  assert.equal(isSeededLead({ id: "3f2a-demo" }), false);
  assert.equal(isSeededLead({ id: "1726000000000-0.42" }), false);
  assert.equal(isSeededLead({ id: "demo" }), false);
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
//    A genuine customer named "Rahul" with a normal id must be preserved — the
//    cleanup matches ids, never names.
test("migration removes seeds but never deletes ambiguous or same-named leads", () => {
  assert.equal(isSeededLead(flaggedSeed), true);
  assert.equal(isSeededLead(flaglessSeed), true);
  assert.equal(isSeededLead({}), false);
  assert.equal(isSeededLead(null), false);
  assert.equal(isSeededLead("demo-1"), false);

  const userLead = makeLead({ id: "lead-2", name: "Meera Nair" });
  const realRahul = makeLead({ id: "lead-9", name: "Rahul Mehta" });
  const explicitNotDemo = makeLead({ id: "lead-3", demo: false });
  assert.equal(isSeededLead(userLead), false);
  assert.equal(isSeededLead(realRahul), false);
  assert.equal(isSeededLead(explicitNotDemo), false);

  const parsed = parseStoredLeads(JSON.stringify([flaggedSeed, flaglessSeed, userLead, realRahul, explicitNotDemo, null, 42]));
  assert.deepEqual(parsed.map((lead) => lead.id), ["lead-2", "lead-9", "lead-3"]);
});

// 5. The seed cleanup is idempotent: running it again changes nothing.
test("seed migration is idempotent", () => {
  const input = [flaglessSeed, makeLead({ id: "lead-1" })];
  const once = migrateSeededLeads(input);
  const twice = migrateSeededLeads(once);
  assert.deepEqual(once.map((lead) => lead.id), ["lead-1"]);
  assert.deepEqual(twice.map((lead) => lead.id), ["lead-1"]);
  assert.deepEqual(parseStoredLeads(JSON.stringify(parseStoredLeads(JSON.stringify(input)))).map((lead) => lead.id), ["lead-1"]);
});

// 6. Versioned load reports a legacy store once, then not again after stamping.
test("versioned load flags a legacy store for migration exactly once", () => {
  const store: Record<string, string> = { [LEADS_STORAGE_KEY]: JSON.stringify([flaglessSeed, makeLead({ id: "lead-1" })]) };
  const first = loadStoredLeads(readFrom(store));
  assert.deepEqual(first.leads.map((lead) => lead.id), ["lead-1"]);
  assert.equal(first.migrated, true);

  store[LEADS_VERSION_KEY] = String(LEADS_VERSION);
  const second = loadStoredLeads(readFrom(store));
  assert.deepEqual(second.leads.map((lead) => lead.id), ["lead-1"]);
  assert.equal(second.migrated, false);
});

// 7. Empty-state stats and priority counts are zero; populated counts correct.
test("empty workspace statistics and priority counts are zero", () => {
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

// 8. An empty workspace never resolves a selected lead (no detail panel crash).
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

// 9. Creating the first lead from the empty state works end to end.
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

// 10. The full startup cycle (load → persist → reload) never reintroduces a
//     seeded record: once cleaned, the demo lead cannot reappear on any later
//     load, so a refresh and a hard reopen both stay clean.
test("repeated startup never reintroduces a seeded demo lead", () => {
  const store: Record<string, string> = {
    [LEADS_STORAGE_KEY]: JSON.stringify([flaglessSeed, flaggedSeed, makeLead({ id: "lead-1" })])
  };
  // Boot 1: clean the store exactly as the workspace does, then persist it back.
  const boot1 = loadStoredLeads(readFrom(store));
  store[LEADS_STORAGE_KEY] = JSON.stringify(boot1.leads);
  store[LEADS_VERSION_KEY] = String(LEADS_VERSION);
  assert.deepEqual(boot1.leads.map((lead) => lead.id), ["lead-1"]);

  // Boot 2 and 3: nothing to migrate, nothing reappears.
  for (let boot = 0; boot < 2; boot += 1) {
    const next = loadStoredLeads(readFrom(store));
    store[LEADS_STORAGE_KEY] = JSON.stringify(next.leads);
    assert.equal(next.migrated, false);
    assert.deepEqual(next.leads.map((lead) => lead.id), ["lead-1"]);
  }
});

// 11. An empty workspace stays empty across reloads — no seed is injected to
//     fill the silence, and the selection resolves to nothing.
test("an empty workspace stays empty after reload", () => {
  const store: Record<string, string> = { [LEADS_VERSION_KEY]: String(LEADS_VERSION) };
  for (let boot = 0; boot < 3; boot += 1) {
    const { leads: loaded } = loadStoredLeads(readFrom(store));
    assert.deepEqual(loaded, []);
    assert.equal(pipelineStats(loaded).total, 0);
    assert.equal(resolveSelectedLead(loaded, null), undefined);
    store[LEADS_STORAGE_KEY] = JSON.stringify(loaded);
  }
});
