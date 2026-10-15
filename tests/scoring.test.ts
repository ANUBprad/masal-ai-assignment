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

// 4. Each timeline bucket scores its documented points, including legacy labels.
test("timeline buckets score their points and legacy labels normalize", () => {
  const timeline = (t: string) => dim(scoreLead({ ...within30, timeline: t as LeadInput["timeline"] }), "timeline");
  assert.equal(timeline("Within 30 days").earned, 25);
  assert.equal(timeline("31–60 days").earned, 20);
  assert.equal(timeline("61–90 days").earned, 14);
  assert.equal(timeline("Over 90 days").earned, 7);
  assert.equal(timeline("Just exploring / no rush").earned, 0);
  assert.equal(timeline("Immediately").earned, 25);
  assert.equal(timeline("1–3 months").earned, 14);
  assert.equal(timeline("3–6 months").earned, 7);
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

// 8a. Status tiers: only a scheduled visit is a commitment; "Qualified" is
// recorded engagement, not a visit; earlier stages earn nothing.
test("engagement status tiers: Visit scheduled > Qualified > Contacted", () => {
  const base = { ...within30, message: "Hi, please share the pricing." };
  assert.equal(dim(scoreLead(base, { status: "Contacted" }), "engagement").earned, 0);
  assert.equal(dim(scoreLead(base, { status: "Qualified" }), "engagement").earned, 5);
  assert.equal(dim(scoreLead(base, { status: "Visit scheduled" }), "engagement").earned, 10);
});

// 8b. A message that negates the next step ("can't visit") earns no credit.
test("engagement ignores a negated next step", () => {
  const result = scoreLead({ ...within30, message: "I can't visit this weekend, sorry." });
  assert.equal(dim(result, "engagement").earned, 0);
});

// 8c. Purchase-intent heuristics respect negation and exploration.
test("intent heuristics treat negation and exploration correctly", () => {
  const intent = (message: string) => dim(scoreLead({ ...within30, message }), "intent").earned;
  assert.equal(intent("I'm not ready to purchase."), 0);
  assert.equal(intent("I'm just exploring and won't buy soon."), 3);
  assert.equal(intent("I'm comparing properties and may purchase next month."), 18);
  assert.equal(intent("I'm ready to buy now."), 25);
  assert.equal(intent("I need an apartment within 30 days, but I'm only researching."), 3);
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
    { name: "F", location: "X", propertyRequirement: "plot", budget: "flexible", timeline: "Over 90 days", message: "Comparing options." },
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

// Fix 4 (task): the Rohan Sharma lead from QA scored 70/100. That is correct
// under the documented rubric — a within-30-days buyer who is generally
// interested and asked about a visit, with a stated figure but no financing
// evidence: 25 + 10 + 20 + 10 + 5 = 70 → Follow Up. This test locks that in so
// a future weight change is a deliberate, visible decision.
test("the Rohan Sharma lead scores 70/100 Follow Up under the documented rubric", () => {
  const rohan: LeadInput = {
    name: "Rohan Sharma (Dummy)", location: "Whitefield, Bengaluru",
    propertyRequirement: "3 BHK apartment", budget: "₹1.2 Cr",
    timeline: "Within 30 days",
    message: "Hi, I'm looking for a 3 BHK near ITPL, budget around ₹1.2 crore. Would like to visit a few options this weekend."
  };
  const result = scoreLead(rohan);
  assert.equal(dim(result, "timeline").earned, 25);
  assert.equal(dim(result, "intent").earned, 10);
  assert.equal(dim(result, "clarity").earned, 20);
  assert.equal(dim(result, "budget").earned, 10);
  assert.equal(dim(result, "engagement").earned, 5);
  assert.equal(result.score, 70);
  assert.equal(result.priority, "Follow Up");
  assert.equal(result.score, result.dimensions.reduce((sum, item) => sum + item.earned, 0));
});
