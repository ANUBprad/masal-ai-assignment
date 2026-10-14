import { leadContext, analysisContext, ANALYSIS_PROMPT, CHAT_PROMPT, CALL_BRIEF_PROMPT } from "./prompts.ts";
import { safeAiError, type AiCredentials } from "./ai.ts";
import type { CallBrief, ChatMessage, LeadAnalysis, LeadInput, Priority } from "@/types/lead";

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

async function generateText(credentials: AiCredentials, prompt: string, json = false): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${API_ROOT}/${credentials.model}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": credentials.apiKey
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          ...(json ? { responseMimeType: "application/json" } : {})
        }
      }),
      signal: controller.signal,
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({})) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string; status?: string };
    };
    if (!response.ok) {
      throw new Error(`${data.error?.status ?? response.status}: ${data.error?.message ?? "Provider request failed"}`);
    }
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini returned an empty response.");
    return text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Request timed out");
    throw new Error(safeAiError(error));
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Gemini returned an unreadable response. Please retry.");
  }
}

export async function analyzeLead(credentials: AiCredentials, lead: LeadInput): Promise<LeadAnalysis> {
  const raw = await generateText(credentials, `${ANALYSIS_PROMPT}\n\nLead context:\n${leadContext(lead)}`, true);
  const result = parseJson<LeadAnalysis>(raw);
  if (
    typeof result.summary !== "string" ||
    typeof result.intent !== "string" ||
    !Array.isArray(result.requirements) ||
    !Array.isArray(result.concerns) ||
    typeof result.nextAction !== "string" ||
    typeof result.suggestedReply !== "string" ||
    !["Strong", "Moderate", "Weak"].includes(result.intentStrength)
  ) {
    throw new Error("Gemini returned an incomplete lead analysis. Please retry.");
  }
  return result;
}

export async function answerChat(
  credentials: AiCredentials,
  lead: LeadInput,
  history: ChatMessage[],
  question: string,
  analysis?: LeadAnalysis,
  score?: number,
  priority?: Priority
): Promise<string> {
  const safeHistory = history.slice(-10).map((item) =>
    `${item.role === "user" ? "Salesperson" : "Copilot"}: ${item.content.slice(0, 3000)}`
  ).join("\n");
  const context = analysis
    ? `${leadContext(lead)}\n\n${analysisContext(analysis, score, priority)}`
    : leadContext(lead);
  return generateText(credentials, `${CHAT_PROMPT}\n\nLead context:\n${context}\n\nConversation:\n${safeHistory}\nSalesperson's latest question:\n${question.slice(0, 5000)}`);
}

export async function generateCallBrief(credentials: AiCredentials, lead: LeadInput): Promise<CallBrief> {
  const raw = await generateText(credentials, `${CALL_BRIEF_PROMPT}\n\nLead context:\n${leadContext(lead)}`, true);
  const result = parseJson<CallBrief>(raw);
  if (typeof result.objective !== "string" || !Array.isArray(result.talkingPoints) ||
      !Array.isArray(result.questions) || !Array.isArray(result.watchOutFor) ||
      typeof result.openingLine !== "string") {
    throw new Error("Gemini returned an incomplete call brief. Please retry.");
  }
  return result;
}

export async function testConnection(credentials: AiCredentials): Promise<void> {
  await generateText(credentials, "Reply with exactly: Masal AI connection successful.");
}
