import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MODEL, isSupportedModel, serverCredentials, SUPPORTED_MODELS } from "../lib/ai.ts";

test("supported model IDs are unique", () => {
  const ids = SUPPORTED_MODELS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("gemini-2.5-flash"));
});

test("server credentials come from the environment", () => {
  process.env.GEMINI_API_KEY = " test-key ";
  process.env.GEMINI_MODEL = "gemini-2.5-flash-lite";
  assert.deepEqual(serverCredentials(), { apiKey: "test-key", model: "gemini-2.5-flash-lite" });

  process.env.GEMINI_MODEL = "unknown-model";
  assert.equal(serverCredentials().model, DEFAULT_MODEL);

  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
});

test("server credentials require a configured key", () => {
  delete process.env.GEMINI_API_KEY;
  assert.throws(() => serverCredentials());
});

test("model allowlist does not accept arbitrary values", () => {
  assert.equal(isSupportedModel("gemini-2.5-flash"), true);
  assert.equal(isSupportedModel("gemini-made-up-model"), false);
});
