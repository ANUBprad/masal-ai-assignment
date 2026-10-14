export const SUPPORTED_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Recommended · balanced speed and quality" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", description: "Lower-latency, lightweight option" }
] as const;

export const DEFAULT_MODEL = SUPPORTED_MODELS[0].id;
const MAX_KEY_LENGTH = 512;

export function isSupportedModel(model: string): boolean {
  return SUPPORTED_MODELS.some((item) => item.id === model);
}

export type AiCredentials = { apiKey: string; model: string };

export function serverCredentials(): AiCredentials {
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("The server is missing GEMINI_API_KEY. Set it in the host's environment.");
  if (apiKey.length > MAX_KEY_LENGTH || /[\r\n]/.test(apiKey)) {
    throw new Error("The configured GEMINI_API_KEY looks invalid.");
  }
  const requested = (process.env.GEMINI_MODEL ?? "").trim();
  return { apiKey, model: isSupportedModel(requested) ? requested : DEFAULT_MODEL };
}

export function safeAiError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/API_KEY_INVALID|invalid api key|unauthenticated|API key not valid/i.test(message)) {
    return "Gemini rejected this API key. Check the key and try again.";
  }
  if (/quota|resource_exhausted|rate.?limit|429/i.test(message)) {
    return "Gemini's usage limit was reached. Check your API quota or try again later.";
  }
  if (/permission|forbidden|403/i.test(message)) {
    return "This key does not have access to the requested Gemini model.";
  }
  if (/timed out|timeout|network|fetch failed/i.test(message)) {
    return "Gemini could not be reached. Check your connection and retry.";
  }
  return "Gemini could not complete this request. Please retry.";
}
