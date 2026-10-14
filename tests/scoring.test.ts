import test from "node:test";
import assert from "node:assert/strict";
import { priorityForScore, scoreLead } from "../lib/scoring.ts";
import type { LeadInput } from "../types/lead.ts";

const base: LeadInput = {
  name: "Test Lead", location: "Bengaluru", propertyRequirement: "3 BHK",
  budget: "₹1 Cr", timeline: "Within 30 days",
  message: "We want to visit a ready to move property this weekend. Loan pre-approved."
};

test("near-term lead with a concrete visit request is hot", () => {
  const result = scoreLead(base);
  assert.equal(result.priority, "Hot");
  assert.ok(result.score >= 70 && result.score <= 100);
  assert.ok(result.reasons.some((reason) => reason.includes("Near-term")));
});

test("exploratory lead without buying signals is not hot", () => {
  const result = scoreLead({ ...base, timeline: "Just exploring / no rush", message: "Just looking around, no urgency." });
  assert.notEqual(result.priority, "Hot");
});

test("priority thresholds are stable", () => {
  assert.equal(priorityForScore(75), "Hot");
  assert.equal(priorityForScore(55), "Warm");
  assert.equal(priorityForScore(20), "Cold");
});
