import test from "node:test";
import assert from "node:assert/strict";
import { readJsonObject } from "../lib/validation.ts";
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
