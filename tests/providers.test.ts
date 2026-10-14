import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MODELS,
  AiFailure,
  analyzeLead,
  attemptWithFailover,
  generateCallBrief,
  isCoolingDown,
  isSupportedModel,
  providerPlan,
  resetProviderStateForTests,
  type ProviderKey
} from "../lib/providers.ts";
import type { LeadInput } from "../types/lead.ts";

const lead: LeadInput = {
  name: "Priya Sharma", location: "Whitefield", propertyRequirement: "3 BHK",
  budget: "₹1.4 Cr", timeline: "Within 30 days", message: "Would like to visit this weekend."
};

const analysisJson = JSON.stringify({
  summary: "S", intent: "I", requirements: ["R"], concerns: ["C"],
  nextAction: "N", suggestedReply: "R", intentStrength: "Strong", confidenceNote: "N"
});

const KEY_VARS = [
  "GROQ_API_KEY", "GROQ_API_KEY_2", "GROQ_API_KEY_3", "GROQ_API_KEY_4", "GROQ_API_KEY_5",
  "GEMINI_API_KEY", "GEMINI_API_KEY_2", "GROQ_MODEL", "GEMINI_MODEL", "AI_PROVIDER"
];

function setEnv(values: Record<string, string>): void {
  for (const name of KEY_VARS) delete process.env[name];
  for (const [name, value] of Object.entries(values)) process.env[name] = value;
  resetProviderStateForTests();
}

interface StubResponse {
  status: number;
  ok: boolean;
  headers?: Headers;
  body: unknown;
}

// Install a fetch stub keyed by the Authorization / x-goog-api-key header.
function stubFetch(handler: (url: string, key: string) => StubResponse): { calls: string[]; restore: () => void } {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const key = String(init?.headers && (init.headers as Record<string, string>).authorization
      ? (init.headers as Record<string, string>).authorization
      : (init?.headers as Record<string, string>)?.["x-goog-api-key"] ?? "");
    calls.push(`${url} :: ${key}`);
    const stub = handler(url, key);
    return {
      status: stub.status,
      ok: stub.ok,
      headers: stub.headers ?? new Headers(),
      json: async () => stub.body
    } as unknown as Response;
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test("groq is the primary provider when configured", () => {
  setEnv({ GROQ_API_KEY: "groq-key", GEMINI_API_KEY: "gemini-key" });
  const plan = providerPlan();
  assert.equal(plan[0].provider, "groq");
  assert.equal(plan[0].apiKey, "groq-key");
  assert.equal(plan.at(-1)!.provider, "gemini");
});

test("AI_PROVIDER=gemini makes gemini primary but groq stays configured", () => {
  setEnv({ AI_PROVIDER: "gemini", GROQ_API_KEY: "groq-key", GEMINI_API_KEY: "gemini-key" });
  const plan = providerPlan();
  assert.equal(plan[0].provider, "gemini");
  assert.ok(plan.some((item) => item.provider === "groq"));
});

test("the default groq model is a currently supported id", () => {
  assert.equal(DEFAULT_MODELS.groq, "openai/gpt-oss-120b");
  setEnv({ GROQ_API_KEY: "groq-key" });
  assert.equal(providerPlan()[0].model, DEFAULT_MODELS.groq);
  assert.equal(isSupportedModel("groq", "openai/gpt-oss-120b"), true);
  assert.equal(isSupportedModel("groq", "llama-3.3-70b-versatile"), false);
});

test("an unsupported GROQ_MODEL falls back to the default", () => {
  setEnv({ GROQ_API_KEY: "groq-key", GROQ_MODEL: "made-up-model" });
  assert.equal(providerPlan()[0].model, DEFAULT_MODELS.groq);
});

test("the default gemini model is a currently supported, non-retired id", () => {
  assert.equal(DEFAULT_MODELS.gemini, "gemini-flash-lite-latest");
  assert.equal(isSupportedModel("gemini", DEFAULT_MODELS.gemini), true);
  // The retired 2.5 ids must no longer be selectable; they return HTTP 404.
  assert.equal(isSupportedModel("gemini", "gemini-2.5-flash"), false);
  assert.equal(isSupportedModel("gemini", "gemini-2.5-flash-lite"), false);
});

test("a retired GEMINI_MODEL falls back to the current default", () => {
  setEnv({ GEMINI_API_KEY: "gemini-key", GEMINI_MODEL: "gemini-2.5-flash" });
  const gemini = providerPlan().find((item) => item.provider === "gemini");
  assert.ok(gemini);
  assert.equal(gemini!.model, DEFAULT_MODELS.gemini);
});

test("a retired-model 404 is a safe, non-retried failure that logs no secrets", async () => {
  setEnv({ GEMINI_API_KEY: "secret-gemini-key" });
  const plan = providerPlan();
  const logged: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => { logged.push(args.map(String).join(" ")); };
  const stub = stubFetch(() => ({ status: 404, ok: false, body: { error: { code: 404, status: "NOT_FOUND", message: "model no longer available" } } }));
  try {
    await assert.rejects(
      () => analyzeLead(plan, lead),
      (error: unknown) => error instanceof AiFailure && error.kind === "invalid" &&
        error.status === 502 && !/secret-gemini-key/.test(error.message)
    );
    assert.equal(stub.calls.length, 1); // deterministic, so it is not retried
    assert.ok(logged.some((line) => line.includes('"provider":"gemini"') && line.includes('"upstreamStatus":404')));
    assert.ok(logged.every((line) => !line.includes("secret-gemini-key")), "diagnostics must not leak the key");
  } finally {
    console.error = originalError;
    stub.restore();
  }
});

test("missing or blank optional keys are ignored", () => {
  setEnv({ GROQ_API_KEY: "groq-key", GROQ_API_KEY_2: "   ", GROQ_API_KEY_3: "groq-key-3" });
  const plan = providerPlan();
  assert.equal(plan.length, 2);
  assert.deepEqual(plan.map((item) => item.apiKey).sort(), ["groq-key", "groq-key-3"]);
});

test("multiple configured keys rotate the starting key between requests", () => {
  setEnv({ GROQ_API_KEY: "key-a", GROQ_API_KEY_2: "key-b" });
  const first = providerPlan()[0].apiKey;
  const second = providerPlan()[0].apiKey;
  assert.notEqual(first, second);
});

test("a rate-limited key is put in cooldown and skipped", async () => {
  setEnv({ GROQ_API_KEY: "key-a", GROQ_API_KEY_2: "key-b" });
  const plan = providerPlan();
  const stub = stubFetch((_url, key) => key.includes("key-a")
    ? { status: 429, ok: false, headers: new Headers({ "retry-after": "60" }), body: { error: { message: "rate limited" } } }
    : { status: 200, ok: true, body: { choices: [{ message: { content: analysisJson } }] } });
  try {
    const result = await analyzeLead(plan, lead);
    assert.equal(result.summary, "S");
    assert.equal(isCoolingDown(plan.find((item) => item.apiKey === "key-a")!), true);
    assert.equal(isCoolingDown(plan.find((item) => item.apiKey === "key-b")!), false);
  } finally {
    stub.restore();
  }
});

test("a provider 429 fails over to the configured secondary provider", async () => {
  setEnv({ GROQ_API_KEY: "groq-key", GEMINI_API_KEY: "gemini-key" });
  const plan = providerPlan();
  const stub = stubFetch((url, key) => {
    if (url.includes("groq.com")) return { status: 429, ok: false, headers: new Headers({ "retry-after": "30" }), body: {} };
    assert.equal(key, "gemini-key");
    return { status: 200, ok: true, body: { candidates: [{ content: { parts: [{ text: analysisJson }] } }] } };
  });
  try {
    const result = await analyzeLead(plan, lead);
    assert.equal(result.intent, "I");
    assert.ok(stub.calls.some((call) => call.includes("groq.com")));
    assert.ok(stub.calls.some((call) => call.includes("generativelanguage.googleapis.com")));
  } finally {
    stub.restore();
  }
});

test("a 401/403 does not cause endless retries", async () => {
  setEnv({ GROQ_API_KEY: "only-key" });
  const plan = providerPlan();
  const stub = stubFetch(() => ({ status: 403, ok: false, body: { error: { message: "forbidden" } } }));
  try {
    await assert.rejects(() => analyzeLead(plan, lead), (error: unknown) => error instanceof AiFailure);
    assert.equal(stub.calls.length, 1);
  } finally {
    stub.restore();
  }
});

test("a 5xx failure is handled within the retry bound", async () => {
  setEnv({ GROQ_API_KEY: "only-key" });
  const plan = providerPlan();
  const stub = stubFetch(() => ({ status: 503, ok: false, body: {} }));
  try {
    await assert.rejects(() => analyzeLead(plan, lead), (error: unknown) => error instanceof AiFailure);
    assert.ok(stub.calls.length >= 1 && stub.calls.length <= 2);
  } finally {
    stub.restore();
  }
});

test("when every provider fails the result is a safe error, never fabricated content", async () => {
  setEnv({ GROQ_API_KEY: "key-a", GROQ_API_KEY_2: "key-b" });
  const plan = providerPlan();
  const stub = stubFetch(() => ({ status: 429, ok: false, headers: new Headers({ "retry-after": "60" }), body: {} }));
  try {
    await assert.rejects(
      () => analyzeLead(plan, lead),
      (error: unknown) => error instanceof AiFailure &&
        !/key-a|key-b|gpt-oss/.test(error.message) &&
        /too many requests|unavailable|try again/i.test(error.message)
    );
  } finally {
    stub.restore();
  }
});

test("saturated keys stay skipped on the next request during cooldown", async () => {
  setEnv({ GROQ_API_KEY: "key-a", GROQ_API_KEY_2: "key-b" });
  const stub = stubFetch(() => ({ status: 429, ok: false, headers: new Headers({ "retry-after": "60" }), body: {} }));
  try {
    await assert.rejects(() => analyzeLead(providerPlan(), lead));
    const callsBefore = stub.calls.length;
    await assert.rejects(() => analyzeLead(providerPlan(), lead));
    assert.equal(stub.calls.length, callsBefore);
  } finally {
    stub.restore();
  }
});

test("attemptWithFailover only retries transient failures once per option", async () => {
  resetProviderStateForTests();
  const candidates: ProviderKey[] = [
    { id: "groq#0", provider: "groq", apiKey: "k", model: "openai/gpt-oss-120b" }
  ];
  let attempts = 0;
  await assert.rejects(() => attemptWithFailover(candidates, async () => {
    attempts += 1;
    throw new TypeError("fetch failed");
  }));
  assert.equal(attempts, 2);
});

test("call brief uses the shared provider layer", async () => {
  setEnv({ GROQ_API_KEY: "groq-key" });
  const plan = providerPlan();
  const briefJson = JSON.stringify({
    objective: "O", talkingPoints: ["T"], questions: ["Q"], watchOutFor: ["W"], openingLine: "L"
  });
  const stub = stubFetch(() => ({ status: 200, ok: true, body: { choices: [{ message: { content: briefJson } }] } }));
  try {
    const brief = await generateCallBrief(plan, lead);
    assert.equal(brief.objective, "O");
    assert.ok(stub.calls.some((call) => call.includes("api.groq.com")));
  } finally {
    stub.restore();
  }
});
