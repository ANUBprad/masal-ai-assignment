import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDemoLeads, DEMO_ID_PREFIX, demoDisplayName, isDemoLead, leadDisplayName,
  removeDemoLeads
} from "../lib/demos.ts";
import { PRIORITIES, scoreLead } from "../lib/scoring.ts";
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

// 1. Exactly three scenarios, one per priority band, each named in the UI.
test("the demo set is exactly three scenarios, one per priority", () => {
  const demos = buildDemoLeads();
  assert.equal(demos.length, 3);
  assert.deepEqual(demos.map((lead) => lead.name), ["Rahul", "Priya", "Arjun"]);
  assert.deepEqual(demos.map((lead) => lead.id), ["demo-1", "demo-2", "demo-3"]);
  assert.deepEqual(demos.map((lead) => lead.priority).sort(), [...PRIORITIES].sort());
});

// 2. Each scenario's priority comes from the real engine, not a hard-coded label:
//    re-running scoreLead on the recorded fields reproduces the stored result.
test("every demo's score and priority are reproduced by the scoring engine", () => {
  for (const demo of buildDemoLeads()) {
    const rescored = scoreLead(demo, { status: demo.status });
    assert.equal(demo.score, rescored.score, `${demo.name} score`);
    assert.equal(demo.priority, rescored.priority, `${demo.name} priority`);
    assert.equal(demo.scoreDetail?.dimensions.reduce((sum, dim) => sum + dim.earned, 0), demo.score);
  }
  assert.deepEqual(
    buildDemoLeads().map((lead) => [lead.name, lead.priority, lead.score]),
    [["Rahul", "Act Now", 80], ["Priya", "Follow Up", 57], ["Arjun", "Nurture", 35]]
  );
});

// 3. Demos are flagged and use the reserved prefix so they can always be told
//    apart from a genuine customer with the same name.
test("demo records carry the flag and the reserved id prefix", () => {
  for (const demo of buildDemoLeads()) {
    assert.equal(demo.demo, true);
    assert.ok(demo.id.startsWith(DEMO_ID_PREFIX));
    assert.equal(isDemoLead(demo), true);
  }
});

// 4. The `(Dummy)` suffix is derived from the flag, never trusted from a name.
test("only a flagged record gets the (Dummy) suffix", () => {
  assert.equal(demoDisplayName("Rahul"), "Rahul (Dummy)");
  assert.equal(leadDisplayName(buildDemoLeads()[0]), "Rahul (Dummy)");
  assert.equal(leadDisplayName(makeLead({ name: "Rahul" })), "Rahul", "a genuine Rahul keeps the plain name");
  assert.equal(leadDisplayName(makeLead({ id: "lead-9", name: "Priya" })), "Priya");
});

// 5. Detection recognises the flag and the reserved id (including the legacy
//    `sample-` family) but never a normal generated id.
test("isDemoLead catches the flag, the reserved id, and the legacy sample family", () => {
  assert.equal(isDemoLead({ id: "x", demo: true }), true);
  assert.equal(isDemoLead({ id: "demo-9" }), true);
  assert.equal(isDemoLead({ id: "sample-1", sample: true }), true);
  assert.equal(isDemoLead({ id: "sample-2" }), true);
  assert.equal(isDemoLead({ id: "democracy" }), false);
  assert.equal(isDemoLead({ id: "lead-demo" }), false);
  assert.equal(isDemoLead({ id: "1726000000000-0.42" }), false);
  assert.equal(isDemoLead({ id: "lead-1", demo: false }), false);
  assert.equal(isDemoLead({}), false);
  assert.equal(isDemoLead(null), false);
  assert.equal(isDemoLead("demo-1"), false);
});

// 6. Removing demos never touches a genuine lead, even one sharing a demo name.
test("removeDemoLeads drops only flagged records", () => {
  const genuine = makeLead({ id: "lead-9", name: "Rahul" });
  const remaining = removeDemoLeads([...buildDemoLeads(), genuine]);
  assert.deepEqual(remaining.map((lead) => lead.id), ["lead-9"]);
});

// 7. Demos are rebuilt from code, so repeated construction can never duplicate
//    them in the combined workspace list.
test("rebuilding demos on every load never duplicates an entry", () => {
  const first = [...buildDemoLeads(), makeLead({ id: "lead-1" })];
  const second = [...buildDemoLeads(), ...first.filter((lead) => !isDemoLead(lead))];
  const demoIds = second.filter(isDemoLead).map((lead) => lead.id);
  assert.deepEqual(demoIds, ["demo-1", "demo-2", "demo-3"]);
  assert.equal(new Set(second.map((lead) => lead.id)).size, second.length);
});
