import test from "node:test";
import assert from "node:assert/strict";
import { scoreLead } from "../lib/scoring";
import type { LeadAnalysis, LeadInput } from "../types/lead";
const lead: LeadInput = { name: "Priya", location: "Whitefield", propertyRequirement: "3 BHK apartment near school and metro", budget: "INR 1.5 Cr", timeline: "Within 2-4 weeks", message: "Can we schedule a site visit on Saturday? Please send floor plans." };
const strong: LeadAnalysis = { summary: "Buyer wants visit soon.", intent: "Ready to shortlist", keyRequirements: ["3 BHK"], objections: [], nextAction: "Call today", suggestedReply: "Let's book a visit.", intentStrength: "Strong", confidenceNote: "Confirm move date." };
test("a near-term lead with a concrete visit request is hot", () => {
  const result = scoreLead(lead, strong);
  assert.equal(result.priority, "Hot");
  assert.ok(result.score >= 70 && result.score <= 100);
  assert.ok(result.reasons.some((reason) => reason.includes("Near-term")));
});
test("an exploratory lead without buying signals is not hot", () => {
  const result = scoreLead({ ...lead, budget: "Not decided", timeline: "Just exploring / no rush", propertyRequirement: "Apartment", message: "Just checking prices and available areas." }, null);
  assert.notEqual(result.priority, "Hot");
});
