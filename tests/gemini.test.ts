import test from "node:test";
import assert from "node:assert/strict";
import { answerChat } from "../lib/gemini.ts";
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

async function capturedPrompt(run: () => Promise<void>): Promise<string> {
  const original = globalThis.fetch;
  let prompt = "";
  globalThis.fetch = (async (_url: string, init?: { body?: string }) => {
    prompt = JSON.parse(String(init?.body ?? "{}")).contents?.[0]?.parts?.[0]?.text ?? "";
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }) } as unknown as Response;
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
  return prompt;
}

test("the selected lead's analysis and score reach the chat prompt", async () => {
  const credentials = { apiKey: "test-key", model: "gemini-2.5-flash" };
  const prompt = await capturedPrompt(async () => {
    await answerChat(credentials, lead, [], "What should I emphasize?", analysis, 92, "Hot");
  });
  assert.match(prompt, /SUMMARY_SENTINEL/);
  assert.match(prompt, /CONCERN_SENTINEL/);
  assert.match(prompt, /REPLY_SENTINEL/);
  assert.match(prompt, /Rule-based score: 92 \(Hot\)/);
});

test("chat works without an analysis and omits the analysis block", async () => {
  const credentials = { apiKey: "test-key", model: "gemini-2.5-flash" };
  const prompt = await capturedPrompt(async () => {
    await answerChat(credentials, lead, [], "Hi");
  });
  assert.doesNotMatch(prompt, /Existing AI analysis/);
  assert.match(prompt, /Priya Sharma/);
});
