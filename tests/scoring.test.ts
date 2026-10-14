import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSION_MAX, priorityForScore, scoreLead, type LeadScore } from "../lib/scoring.ts";
import type { LeadInput, ScoreDimensionKey } from "../types/lead.ts";

function dim(result: LeadScore, key: ScoreDimensionKey) {
  const found = result.dimensions.find((item) => item.key === key);
  assert.ok(found, `dimension "${key}" is present`);
  return found!;
}

const within30: LeadInput = {
  name: "Asha Verma", location: "Whitefield, Bengaluru",
  propertyRequirement: "3 BHK apartment in a gated community with parking",
  budget: "₹1.2–1.5 Cr", timeline: "Within 30 days",
  message: "We are ready to buy a 3 BHK this month and would like to visit a few options this weekend."
};

// 1. Buyer purchasing within 30 days with clear requirements.
test("a 30-day buyer with clear requirements scores its full timeline and clarity", () => {
  const result = scoreLead(within30);
  assert.equal(result.score, 85);
  assert.equal(result.priority, "Act Now");
  assert.equal(dim(result, "timeline").earned, 25);
  assert.equal(dim(result, "clarity").earned, 20);
  assert.equal(dim(result, "intent").earned, 25);
});

// 2. Urgent buyer with unknown financing readiness and no confirmed site visit.
test("urgency alone does not earn financing, engagement, or a top label", () => {
  const result = scoreLead({
    name: "Ben", location: "Whitefield", propertyRequirement: "3 BHK", budget: "₹1.4 Cr",
    timeline: "Within 30 days", message: "Interested in a 3 BHK; need to move within a month."
  });
  assert.equal(dim(result, "timeline").earned, 25);
  assert.equal(dim(result, "engagement").earned, 0);
  assert.ok(dim(result, "budget").missing.some((item) => /financ/i.test(item)));
  assert.notEqual(result.priority, "Act Now");
});

// 3. Fully qualified buyer with strong documented intent and engagement.
test("a fully qualified buyer reaches the maximum score", () => {
  const result = scoreLead({
    name: "Cara", location: "Whitefield, Bengaluru",
    propertyRequirement: "3 BHK apartment in a gated community", budget: "₹1.4 Cr",
    timeline: "Within 30 days",
    message: "We are ready to buy and have loan pre-approval. Let's schedule the visit this weekend."
  }, { status: "Visit scheduled" });
  assert.equal(result.score, 100);
  assert.equal(result.priority, "Act Now");
  assert.equal(dim(result, "budget").earned, 20);
  assert.equal(dim(result, "engagement").earned, 10);
});

// 4. Buyer with a 60–90 day timeline.
test("a 60–90 day timeline scores the 61–90 bucket", () => {
  assert.equal(dim(scoreLead({ ...within30, timeline: "1–3 months" }), "timeline").earned, 14);
  assert.equal(dim(scoreLead({ ...within30, timeline: "Immediately" }), "timeline").earned, 25);
  assert.equal(dim(scoreLead({ ...within30, timeline: "3–6 months" }), "timeline").earned, 7);
});

// 5. Buyer who is only browsing.
test("a browsing lead scores low and is nurtured", () => {
  const result = scoreLead({
    name: "Dia", location: "North Bengaluru", propertyRequirement: "Villa or plot",
    budget: "Not decided", timeline: "Just exploring / no rush",
    message: "Just looking around, no urgency."
  });
  assert.equal(result.priority, "Nurture");
  assert.equal(dim(result, "timeline").earned, 0);
  assert.equal(dim(result, "intent").earned, 3);
});

// 6. Missing budget and missing timeline.
test("missing budget and timeline score zero and are reported as missing", () => {
  const result = scoreLead({
    name: "Eve", location: "", propertyRequirement: "", budget: "",
    timeline: "Just exploring / no rush", message: "Hello."
  });
  assert.equal(result.score, 0);
  assert.equal(result.priority, "Nurture");
  assert.equal(dim(result, "timeline").earned, 0);
  assert.equal(dim(result, "budget").earned, 0);
  assert.ok(dim(result, "budget").missing.some((item) => /budget/i.test(item)));
  assert.ok(dim(result, "timeline").missing.length > 0);
});

// 7. Flexible budget without treating flexibility as automatic disqualification.
test("a flexible budget is scored on its figure, not penalised for flexibility", () => {
  const flexible = scoreLead({ ...within30, budget: "₹1.2 Cr (flexible)" });
  const fixed = scoreLead({ ...within30, budget: "₹1.2 Cr" });
  assert.equal(dim(flexible, "budget").earned, dim(fixed, "budget").earned);
  assert.ok(dim(flexible, "budget").earned >= 10);
});

// 8. No engagement evidence versus a confirmed site visit.
test("engagement is recorded-action based: none vs a confirmed visit", () => {
  const noEvidence = scoreLead({ ...within30, message: "Hi, please share the pricing." });
  const visited = scoreLead({ ...within30, message: "Hi, please share the pricing." }, { status: "Visit scheduled" });
  assert.equal(dim(noEvidence, "engagement").earned, 0);
  assert.equal(dim(visited, "engagement").earned, 10);
});

// 9. Every score boundary.
test("priority thresholds map 0, 49, 50, 79, 80, 100 correctly", () => {
  assert.equal(priorityForScore(0), "Nurture");
  assert.equal(priorityForScore(49), "Nurture");
  assert.equal(priorityForScore(50), "Follow Up");
  assert.equal(priorityForScore(79), "Follow Up");
  assert.equal(priorityForScore(80), "Act Now");
  assert.equal(priorityForScore(100), "Act Now");
});

// 10. Identical input always produces an identical score.
test("scoring is deterministic", () => {
  assert.deepEqual(scoreLead(within30), scoreLead(within30));
});

// 11. Correct score breakdown and evidence.
test("the breakdown exposes earned/max, evidence, and missing information", () => {
  const result = scoreLead(within30);
  assert.equal(result.dimensions.length, 5);
  assert.equal(result.dimensions.reduce((sum, item) => sum + item.max, 0), 100);
  assert.equal(result.dimensions.reduce((sum, item) => sum + item.earned, 0), result.score);
  assert.ok(result.positives.length > 0);
  assert.ok(dim(result, "clarity").evidence.some((item) => /location/i.test(item)));
  assert.ok(dim(result, "budget").missing.some((item) => /financ/i.test(item)));
});

// 12. Invariants across varied inputs: 0–100 bounds and dimension maxima.
test("score stays within 0–100 and each dimension within its maximum", () => {
  const samples: LeadInput[] = [
    within30,
    { ...within30, timeline: "Just exploring / no rush", message: "Just curious." },
    { name: "F", location: "X", propertyRequirement: "plot", budget: "flexible", timeline: "3–6 months", message: "Comparing options." },
    { name: "G", location: "", propertyRequirement: "", budget: "", timeline: "Just exploring / no rush", message: "Hi" }
  ];
  for (const input of samples) {
    const result = scoreLead(input);
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.equal(result.dimensions.reduce((sum, item) => sum + item.max, 0), 100);
    assert.equal(result.dimensions.reduce((sum, item) => sum + item.earned, 0), result.score);
    for (const item of result.dimensions) {
      assert.equal(item.max, DIMENSION_MAX[item.key]);
      assert.ok(item.earned >= 0 && item.earned <= item.max);
    }
  }
});

// 8 (task). Realistic Rahul lead from the brief.
test("the Rahul lead is scored by the rubric, not forced into Act Now", () => {
  const rahul: LeadInput = {
    name: "Rahul", location: "Whitefield, Bengaluru",
    propertyRequirement: "3 BHK apartment in a gated community", budget: "₹1.2 Cr (flexible)",
    timeline: "Within 30 days",
    message: "Looking for a 3 BHK in Whitefield, budget around 1.2 crore but flexible. Want a gated community with security and parking and easy ITPL access."
  };
  const result = scoreLead(rahul);
  assert.equal(dim(result, "timeline").earned, 25);
  assert.equal(dim(result, "clarity").earned, 20);
  assert.equal(dim(result, "budget").earned, 10);
  assert.equal(dim(result, "engagement").earned, 0);
  assert.equal(result.score, 65);
  assert.equal(result.priority, "Follow Up");
  assert.ok(result.missing.some((item) => /financ/i.test(item)));
});
