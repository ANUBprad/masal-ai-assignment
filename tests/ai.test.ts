import test from "node:test";
import assert from "node:assert/strict";
import { isSupportedModel, parseAiCredentials, SUPPORTED_MODELS } from "../lib/ai.ts";

test("supported model IDs are unique", () => {
  const ids = SUPPORTED_MODELS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("gemini-2.5-flash"));
});

test("credential parser accepts a key and supported model", () => {
  const result = parseAiCredentials(new Headers({
    "x-gemini-api-key": " test-key ",
    "x-gemini-model": "gemini-2.5-flash"
  }));
  assert.deepEqual(result, { apiKey: "test-key", model: "gemini-2.5-flash" });
});

test("credential parser rejects missing key and unsupported model", () => {
  assert.throws(() => parseAiCredentials(new Headers({ "x-gemini-model": "gemini-2.5-flash" })));
  assert.throws(() => parseAiCredentials(new Headers({ "x-gemini-api-key": "key", "x-gemini-model": "unknown" })));
});

test("model allowlist does not accept arbitrary values", () => {
  assert.equal(isSupportedModel("gemini-2.5-flash"), true);
  assert.equal(isSupportedModel("gemini-made-up-model"), false);
});
