import test from "node:test";
import assert from "node:assert/strict";
import { leadInputSchema, readJsonObject } from "../lib/validation.ts";

const valid = {
  name: "Aditi",
  location: "Bengaluru",
  propertyRequirement: "2 BHK apartment",
  budget: "INR 90 lakh",
  timeline: "Within 1-3 months",
  message: "Please send information about apartments.",
};

test("lead validation accepts complete intake", () => {
  assert.equal(leadInputSchema.safeParse(valid).success, true);
});

test("lead validation rejects missing name and oversized message", () => {
  assert.equal(leadInputSchema.safeParse({ ...valid, name: " " }).success, false);
  assert.equal(leadInputSchema.safeParse({ ...valid, message: "x".repeat(6001) }).success, false);
});

test("AI JSON parser handles fenced JSON and surrounding text", () => {
  assert.deepEqual(readJsonObject(' ```json\n{"intent":"ready"}\n``` '), { intent: "ready" });
  assert.deepEqual(readJsonObject('Result: {"intent":"ready"} thanks'), { intent: "ready" });
});
