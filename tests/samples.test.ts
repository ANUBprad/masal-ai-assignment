import test from "node:test";
import assert from "node:assert/strict";
import { buildSampleLeads, isSampleLead, removeSampleLeads, SAMPLE_ID_PREFIX } from "../lib/samples.ts";
import { isSeededLead, loadStoredLeads, parseStoredLeads, LEADS_STORAGE_KEY } from "../lib/leads.ts";
import type { Lead } from "../types/lead.ts";

function genuine(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-real-1", name: "Meera Nair", location: "Indiranagar, Bengaluru",
    propertyRequirement: "3 BHK apartment", budget: "₹1.5 Cr", timeline: "Within 30 days",
    message: "Ready to visit this weekend.",
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    score: 80, priority: "Act Now", scoreReasons: [], status: "New", chat: [], ...overrides
  };
}

const readFrom = (store: Record<string, string>) => (key: string) => store[key] ?? null;

// 1. Nothing in storage ever yields a sample: the only producer is the explicit
//    builder, so a fresh or corrupt store stays empty.
test("samples are only produced by the explicit builder, never by storage", () => {
  assert.deepEqual(parseStoredLeads(null), []);
  assert.deepEqual(parseStoredLeads("[]"), []);
  const samples = buildSampleLeads("2026-01-01T00:00:00.000Z");
  assert.equal(samples.length, 3);
});

// 2. Every sample is identifiable: model marker, reserved id prefix, and a real
//    deterministic score/priority.
test("every sample lead is identifiable and scored", () => {
  for (const sample of buildSampleLeads()) {
    assert.equal(sample.sample, true);
    assert.ok(sample.id.startsWith(SAMPLE_ID_PREFIX), sample.id);
    assert.equal(isSampleLead(sample), true);
    assert.ok(sample.score >= 0 && sample.score <= 100);
    assert.ok(["Act Now", "Follow Up", "Nurture"].includes(sample.priority));
  }
});

// 3. The three shipped scenarios must be distinguishable, not three copies.
test("the sample scenarios are distinct", () => {
  const samples = buildSampleLeads();
  assert.equal(new Set(samples.map((sample) => sample.name)).size, 3);
  assert.equal(new Set(samples.map((sample) => sample.score)).size, 3);
  assert.ok(samples.every((sample) => sample.name.includes("(Dummy)")));
});

// 4. The samples must not be caught by the legacy `demo-` cleanup, or a reload
//    would silently delete them the moment the user asked for them.
test("samples are never mistaken for legacy demo seeds and survive reload", () => {
  const samples = buildSampleLeads();
  for (const sample of samples) assert.equal(isSeededLead(sample), false);
  const reloaded = parseStoredLeads(JSON.stringify(samples));
  assert.equal(reloaded.length, 3);
  assert.ok(reloaded.every(isSampleLead));
});

// 5. Removal is precise: only samples go, genuine leads stay.
test("removing samples keeps genuine leads and drops every sample", () => {
  const real = genuine();
  const remaining = removeSampleLeads([...buildSampleLeads(), real]);
  assert.deepEqual(remaining.map((lead) => lead.id), [real.id]);
});

// 6. Loading samples into a store with a real lead keeps the real lead.
test("loading samples alongside a genuine lead preserves it through storage", () => {
  const real = genuine();
  const store: Record<string, string> = { [LEADS_STORAGE_KEY]: JSON.stringify([...buildSampleLeads(), real]) };
  const { leads } = loadStoredLeads(readFrom(store));
  assert.equal(leads.filter(isSampleLead).length, 3);
  assert.deepEqual(leads.filter((lead) => !isSampleLead(lead)).map((lead) => lead.id), [real.id]);
});
