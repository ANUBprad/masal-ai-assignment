import test from "node:test";
import assert from "node:assert/strict";
import { readJsonObject } from "../lib/validation.ts";
import { validateAnalysis } from "../lib/validation.ts";
import { validateLead } from "../lib/validation.ts";
import { readBudget } from "../lib/budget.ts";

test("validates a complete lead", () => {
  const lead = validateLead({
    name: "Priya Sharma", location: "Whitefield", propertyRequirement: "3 BHK",
    budget: "₹1.4 Cr", timeline: "Within 30 days", message: "Would like to visit this weekend."
  });
  assert.equal(lead.name, "Priya Sharma");
});

test("rejects an invalid timeline", () => {
  assert.throws(() => validateLead({
    name: "Priya Sharma", location: "Whitefield", propertyRequirement: "3 BHK",
    budget: "₹1.4 Cr", timeline: "tomorrow", message: "Would like to visit."
  }));
});

test("normalizes a legacy timeline to the current bucket", () => {
  const lead = validateLead({
    name: "Priya Sharma", location: "Whitefield", propertyRequirement: "3 BHK",
    budget: "₹1.4 Cr", timeline: "1–3 months", message: "Would like to visit."
  });
  assert.equal(lead.timeline, "61–90 days");
});

test("normalizes numbers and Indian shorthand to a rupee amount", () => {
  assert.equal(readBudget("5000000").amount, 5_000_000);
  assert.equal(readBudget("50 lakhs").amount, 5_000_000);
  assert.equal(readBudget("1 cr").amount, 10_000_000);
  assert.equal(readBudget("1.3 cr").amount, 13_000_000);
  assert.equal(readBudget("50 Lakhs").amount, 5_000_000);
});

test("a bare number is rupees, never lakhs or crores", () => {
  assert.equal(readBudget("5000000").amount, 5_000_000);
  assert.equal(readBudget("5000000.50").amount, 5_000_000.5);
  assert.equal(readBudget("₹1.2–1.5 Cr").amount, 12_000_000);
  assert.equal(readBudget("85 lakh").amount, 8_500_000);
});

test("undecided and descriptive budgets are read without an amount", () => {
  assert.equal(readBudget("").kind, "unspecified");
  assert.equal(readBudget("Not decided").kind, "unspecified");
  assert.equal(readBudget("flexible").kind, "described");
});

test("malformed budget figures are rejected, not guessed", () => {
  assert.equal(readBudget("lakh").kind, "invalid");
  assert.equal(readBudget("0").kind, "invalid");
  assert.equal(readBudget("-5 lakh").kind, "invalid");
  assert.equal(readBudget("1.2.3 cr").kind, "invalid");
});

test("validateLead accepts shorthand budgets and rejects malformed ones", () => {
  const lead = { name: "Asha Rao", location: "Whitefield", propertyRequirement: "3 BHK", budget: "50 lakhs", timeline: "Within 30 days", message: "Would like to visit this weekend." };
  assert.equal(validateLead(lead).budget, "50 lakhs");
  assert.throws(() => validateLead({ ...lead, budget: "lakh" }));
});

test("reads only JSON objects", async () => {
  const result = await readJsonObject(new Request("http://localhost", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ hello: "world" })
  }));
  assert.equal(result.hello, "world");
  await assert.rejects(() => readJsonObject(new Request("http://localhost", { method: "POST", body: "nope" })));
});

test("normalizes a valid analysis and enforces length limits", () => {
  const analysis = validateAnalysis({
    summary: "  Motivated buyer  ", intent: "High intent",
    requirements: ["3 BHK", 42, "Gated community"], concerns: ["Timing unclear"],
    nextAction: "Schedule a visit", suggestedReply: "Happy to help",
    intentStrength: "Strong", confidenceNote: "Based on budget"
  });
  assert.equal(analysis?.summary, "Motivated buyer");
  assert.deepEqual(analysis?.requirements, ["3 BHK", "Gated community"]);
  assert.equal(analysis?.intentStrength, "Strong");

  const clipped = validateAnalysis({
    summary: "x".repeat(5000), intentStrength: "Bogus", requirements: Array(50).fill("item")
  });
  assert.equal(clipped?.summary.length, 4000);
  assert.equal(clipped?.intentStrength, "Weak");
  assert.equal(clipped?.requirements.length, 20);
});

test("rejects missing or malformed analysis safely", () => {
  assert.equal(validateAnalysis(undefined), undefined);
  assert.equal(validateAnalysis("nope"), undefined);
  assert.equal(validateAnalysis([]), undefined);
  assert.equal(validateAnalysis({}), undefined);
  assert.equal(validateAnalysis({ summary: 42 }), undefined);
});

// Fix 3 (task): validateLead trims the edges but never rewrites the name itself,
// so internal spaces and a parenthetical suffix survive intake unchanged.
test("validateLead preserves a customer name exactly apart from edge whitespace", () => {
  const lead = validateLead({
    name: "  Rohan  Sharma (Dummy)  ", location: "Whitefield", propertyRequirement: "3 BHK",
    budget: "₹1.2 Cr", timeline: "Within 30 days", message: "Would like to visit."
  });
  assert.equal(lead.name, "Rohan  Sharma (Dummy)");
});
