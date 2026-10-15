import test from "node:test";
import assert from "node:assert/strict";
import { allowRequest } from "../lib/rate-limit.ts";
import { guard, HttpError } from "../lib/guard.ts";
import { jsonBody, MAX_BODY_BYTES } from "../lib/body.ts";

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

test("jsonBody parses a valid object and rejects malformed bodies", async () => {
  const ok = new Request("http://localhost", { method: "POST", body: JSON.stringify({ lead: { name: "A" } }) });
  assert.deepEqual(await jsonBody(ok), { lead: { name: "A" } });

  await assert.rejects(jsonBody(new Request("http://localhost", { method: "POST", body: "not json" })),
    (error: unknown) => error instanceof HttpError && error.status === 400);
  await assert.rejects(jsonBody(new Request("http://localhost", { method: "POST", body: "[1,2,3]" })),
    (error: unknown) => error instanceof HttpError && error.status === 400);
});

test("jsonBody rejects a body over the byte cap with 413", async () => {
  const huge = JSON.stringify({ message: "x".repeat(MAX_BODY_BYTES + 100) });
  await assert.rejects(jsonBody(new Request("http://localhost", { method: "POST", body: huge })),
    (error: unknown) => error instanceof HttpError && error.status === 413);
});

test("jsonBody enforces the cap from a stream with no content-length", async () => {
  const chunk = new TextEncoder().encode("x".repeat(64 * 1024));
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(chunk); // never closes: forces the reader to hit the cap
    }
  });
  const request = new Request("http://localhost", { method: "POST", body: stream, duplex: "half" } as RequestInit & { duplex: "half" });
  await assert.rejects(jsonBody(request),
    (error: unknown) => error instanceof HttpError && error.status === 413);
});
