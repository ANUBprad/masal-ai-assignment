import test from "node:test";
import assert from "node:assert/strict";
import { allowRequest } from "../lib/rate-limit.ts";
import { guard, HttpError } from "../lib/guard.ts";

test("guard throws 429 once the client IP is rate limited", () => {
  const ip = "203.0.113.10";
  for (let i = 0; i < 20; i++) assert.equal(allowRequest(ip), true);
  const request = new Request("http://localhost", { headers: { "x-forwarded-for": ip } });
  assert.throws(() => guard(request), (error: unknown) => error instanceof HttpError && error.status === 429);
});

test("guard throws 503 when no provider key is configured", () => {
  delete process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.AI_PROVIDER;
  const request = new Request("http://localhost", { headers: { "x-forwarded-for": "203.0.113.11" } });
  assert.throws(() => guard(request), (error: unknown) => error instanceof HttpError && error.status === 503);
});

test("guard returns the configured provider plan", () => {
  process.env.GROQ_API_KEY = "test-key";
  const request = new Request("http://localhost", { headers: { "x-forwarded-for": "203.0.113.12" } });
  try {
    const plan = guard(request);
    assert.equal(plan[0].provider, "groq");
    assert.equal(plan[0].apiKey, "test-key");
  } finally {
    delete process.env.GROQ_API_KEY;
  }
});
