import test from "node:test";
import assert from "node:assert/strict";
import { readJsonObject } from "../lib/validation.ts";
import { validateAnalysis } from "../lib/validation.ts";
import { validateLead } from "../lib/validation.ts";

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
