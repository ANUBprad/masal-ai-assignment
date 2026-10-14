import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | undefined;

export function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Gemini isn't configured yet. Add a free-tier API key as GEMINI_API_KEY in your environment settings.");
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export function getModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
}

export async function generateText(prompt: string): Promise<string> {
  const result = await getAiClient().models.generateContent({
    model: getModelName(),
    contents: prompt,
  });
  const text = result.text?.trim();
  if (!text) throw new Error("The AI returned an empty response. Please try again.");
  return text;
}

export function userFacingAiError(error: unknown): { message: string; status: number } {
  const raw = error instanceof Error ? error.message : "Unexpected AI provider error.";
  if (/isn't configured|GEMINI_API_KEY/i.test(raw)) return { message: raw, status: 503 };
  if (/429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(raw)) {
    return { message: "The free AI quota is currently limited. Wait and try again, or check your Google AI Studio limits.", status: 429 };
  }
  if (/API key|unauthorized|permission denied|401|403/i.test(raw)) {
    return { message: "Gemini rejected the API key. Check that GEMINI_API_KEY is valid and enabled for the Gemini API.", status: 401 };
  }
  return { message: "The AI request failed. Please retry in a moment. If it keeps failing, check the server logs and selected model.", status: 502 };
}
