import test from "node:test";
import assert from "node:assert/strict";
import { answerChat, resetProviderStateForTests } from "../lib/providers.ts";
import { SALESPERSON_NAME } from "../lib/site.ts";
import type { LeadAnalysis, LeadInput } from "../types/lead.ts";

const lead: LeadInput = {
  name: "Priya Sharma", location: "Whitefield", propertyRequirement: "3 BHK",
  budget: "₹1.4 Cr", timeline: "Within 30 days", message: "Would like to visit this weekend."
};
const analysis: LeadAnalysis = {
  summary: "SUMMARY_SENTINEL", intent: "INTENT_SENTINEL", requirements: ["REQ_SENTINEL"],
  concerns: ["CONCERN_SENTINEL"], nextAction: "ACTION_SENTINEL", suggestedReply: "REPLY_SENTINEL",
  intentStrength: "Strong", confidenceNote: "NOTE_SENTINEL"
};

function groqPlan() {
  process.env.GROQ_API_KEY = "test-key";
  delete process.env.AI_PROVIDER;
  resetProviderStateForTests();
  return [{ id: "groq#0", provider: "groq" as const, apiKey: "test-key", model: "openai/gpt-oss-120b" }];
}

async function capturedPrompt(run: () => Promise<void>): Promise<string> {
  const original = globalThis.fetch;
  let prompt = "";
  globalThis.fetch = (async (_url: string, init?: { body?: string }) => {
    prompt = JSON.parse(String(init?.body ?? "{}")).messages?.[0]?.content ?? "";
    return {
      ok: true, status: 200, headers: new Headers(),
      json: async () => ({ choices: [{ message: { content: "ok" } }] })
    } as unknown as Response;
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
    delete process.env.GROQ_API_KEY;
  }
  return prompt;
}

test("the selected lead's analysis and score reach the chat prompt", async () => {
  const plan = groqPlan();
  const prompt = await capturedPrompt(async () => {
    await answerChat(plan, lead, [], "What should I emphasize?", analysis, 92, "Act Now");
  });
  assert.match(prompt, /SUMMARY_SENTINEL/);
  assert.match(prompt, /CONCERN_SENTINEL/);
  assert.match(prompt, /REPLY_SENTINEL/);
  assert.match(prompt, /Rule-based score: 92 \(Act Now\)/);
});

test("chat works without an analysis and omits the analysis block", async () => {
  const plan = groqPlan();
  const prompt = await capturedPrompt(async () => {
    await answerChat(plan, lead, [], "Hi");
  });
  assert.doesNotMatch(prompt, /Existing AI analysis/);
  assert.match(prompt, /Priya Sharma/);
});

// Fix 1 + Fix 2: whatever the model returns, the chat answer shown to the
// salesperson has its identity resolved and unsupported booking claims softened.
test("a chat answer is stripped of identity placeholders and unconfirmed-visit claims", async () => {
  const plan = groqPlan();
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true, status: 200, headers: new Headers(),
    json: async () => ({ choices: [{ message: { content: "Sign as [Your Name]. Keep the site visit locked in." } }] })
  })) as unknown as typeof fetch;
  try {
    const answer = await answerChat(plan, lead, [], "Draft a reply.");
    assert.ok(answer.includes(SALESPERSON_NAME), "identity placeholder must be resolved");
    assert.doesNotMatch(answer, /\[[^\]]*\]/);
    assert.doesNotMatch(answer, /locked in/i);
  } finally {
    globalThis.fetch = original;
    delete process.env.GROQ_API_KEY;
  }
});
