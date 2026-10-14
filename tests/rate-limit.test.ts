import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { allowRequest, clientIp } from "../lib/rate-limit.ts";

test("rate limiter allows a burst then blocks a single IP", () => {
  let allowed = 0;
  for (let i = 0; i < 25; i++) if (allowRequest("9.9.9.9")) allowed += 1;
  assert.equal(allowed, 20);
  assert.equal(allowRequest("9.9.9.9"), false);
});

test("rate limiter tracks IPs independently", () => {
  assert.equal(allowRequest("8.8.8.8"), true);
});

test("rate limiter forgets requests once the window elapses", () => {
  mock.timers.enable({ apis: ["Date"] });
  try {
    const ip = "198.51.100.7";
    for (let i = 0; i < 20; i++) assert.equal(allowRequest(ip), true);
    assert.equal(allowRequest(ip), false);
    mock.timers.tick(10 * 60 * 1000 + 1);
    assert.equal(allowRequest(ip), true);
  } finally {
    mock.timers.reset();
  }
});

test("client IP prefers the first forwarded address", () => {
  const request = new Request("http://localhost", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
  assert.equal(clientIp(request), "1.2.3.4");
  assert.equal(clientIp(new Request("http://localhost")), "unknown");
});
