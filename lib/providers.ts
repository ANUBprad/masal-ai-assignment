// Server-only shared AI provider layer.
//
// Groq is the primary provider; Gemini is an optional secondary provider.
// Responsibilities:
//   * read provider credentials from the server environment (never the client);
//   * rotate the starting key between requests and skip keys that are cooling down;
//   * call the selected provider, honouring Retry-After on 429 responses;
//   * fail over across keys and providers on retryable errors, with a bounded
//     attempt budget and no retry loops;
//   * surface only safe, provider-agnostic errors (never keys, raw bodies, or traces).
//
// Cooldown state is in-memory and therefore per serverless instance. See
// docs/ARCHITECTURE.md for the caveats (per-instance, reset on cold start).
import { ANALYSIS_PROMPT, CALL_BRIEF_PROMPT, CHAT_PROMPT, analysisContext, leadContext } from "./prompts.ts";
import type { CallBrief, ChatMessage, LeadAnalysis, LeadInput, Priority } from "@/types/lead";

export type ProviderName = "groq" | "gemini";

export interface ProviderKey {
  id: string;
  provider: ProviderName;
  apiKey: string;
  model: string;
}

const MAX_KEY_LENGTH = 512;
const MAX_KEYS_PER_PROVIDER = 5; // base key plus _2 .. _5
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_PASSES = 2; // one failover pass, then one bounded retry pass
const MAX_COOLDOWN_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60_000;
const TRANSIENT_COOLDOWN_MS = 15_000;
const AUTH_COOLDOWN_MS = 60 * 60 * 1000;

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_ENDPOINT_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

const MODELS: Record<ProviderName, { readonly default: string; readonly ids: readonly string[] }> = {
  groq: { default: "openai/gpt-oss-120b", ids: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"] },
  gemini: { default: "gemini-2.5-flash", ids: ["gemini-2.5-flash", "gemini-2.5-flash-lite"] }
};

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  groq: MODELS.groq.default,
  gemini: MODELS.gemini.default
};

const KEY_ENV: Record<ProviderName, string> = { groq: "GROQ_API_KEY", gemini: "GEMINI_API_KEY" };
const MODEL_ENV: Record<ProviderName, string> = { groq: "GROQ_MODEL", gemini: "GEMINI_MODEL" };

// Safe, provider-agnostic messages. These never include keys or upstream bodies.
const MESSAGES = {
  rate_limit: "The AI service is receiving too many requests right now. Please wait a moment and try again.",
  auth: "The AI service rejected the server credentials. Check the server configuration and try again.",
  transient: "The AI service could not be reached. Please check the connection and try again.",
  timeout: "The AI request timed out. Please try again.",
  invalid: "The AI service rejected the request. Please try again.",
  malformed: "The AI service returned an unexpected response. Please try again.",
  none: "No AI provider is configured on the server. Add a provider API key and try again."
} as const;

export type FailureKind = "rate_limit" | "auth" | "transient" | "timeout" | "invalid" | "malformed";

export class AiFailure extends Error {
  readonly kind: FailureKind;
  readonly status: number;
  readonly retryAfterMs?: number;
  constructor(message: string, kind: FailureKind, retryAfterMs?: number) {
    super(message);
    this.name = "AiFailure";
    this.kind = kind;
    this.status = kind === "rate_limit" ? 429 : kind === "timeout" ? 504 : 502;
    this.retryAfterMs = retryAfterMs;
  }
}

// Internal marker for an HTTP error from a provider; carries only the status and
// the optional retry hint so we can classify without retaining the raw body.
class ProviderHttpError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;
  constructor(status: number, retryAfterMs?: number) {
    super(`Provider responded with status ${status}`);
    this.name = "ProviderHttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export function isSupportedModel(provider: ProviderName, model: string): boolean {
  return MODELS[provider].ids.includes(model);
}

function keyNames(base: string): string[] {
  const names = [base];
  for (let index = 2; index <= MAX_KEYS_PER_PROVIDER; index += 1) names.push(`${base}_${index}`);
  return names;
}

function isUsableKey(value: string): boolean {
  return value.length > 0 && value.length <= MAX_KEY_LENGTH && !/[\r\n]/.test(value);
}

function readKeys(base: string): string[] {
  return keyNames(base).map((name) => (process.env[name] ?? "").trim()).filter(isUsableKey);
}

function resolveModel(provider: ProviderName): string {
  const requested = (process.env[MODEL_ENV[provider]] ?? "").trim();
  return isSupportedModel(provider, requested) ? requested : MODELS[provider].default;
}

// Primary provider first (Groq by default), then the optional secondary provider.
export function providerOrder(): ProviderName[] {
  const requested = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  const primary: ProviderName = requested === "gemini" ? "gemini" : "groq";
  return primary === "groq" ? ["groq", "gemini"] : ["gemini", "groq"];
}

let rotation = 0;
const cooldowns = new Map<string, number>();

function rotate<T>(items: T[], offset: number): T[] {
  if (items.length <= 1) return items;
  const start = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

// Build the ordered candidate list for a request: primary provider keys first,
// then secondary, rotating the starting key of each group between requests.
export function providerPlan(): ProviderKey[] {
  const offset = rotation;
  rotation += 1;
  const plan: ProviderKey[] = [];
  for (const provider of providerOrder()) {
    const keys = readKeys(KEY_ENV[provider]);
    if (!keys.length) continue;
    const model = resolveModel(provider);
    const group = keys.map((apiKey, index) => ({ id: `${provider}#${index}`, provider, apiKey, model }));
    plan.push(...rotate(group, offset));
  }
  return plan;
}

export function isCoolingDown(candidate: ProviderKey): boolean {
  return (cooldowns.get(candidate.id) ?? 0) > Date.now();
}

function setCooldown(candidate: ProviderKey, ms: number): void {
  cooldowns.set(candidate.id, Date.now() + Math.min(Math.max(ms, 0), MAX_COOLDOWN_MS));
}

function cooldownFor(kind: FailureKind): number {
  if (kind === "auth") return AUTH_COOLDOWN_MS;
  if (kind === "rate_limit" || kind === "invalid" || kind === "malformed") return DEFAULT_RATE_LIMIT_COOLDOWN_MS;
  return TRANSIENT_COOLDOWN_MS;
}

// Test-only: clear in-memory cooldown and rotation state between cases.
export function resetProviderStateForTests(): void {
  cooldowns.clear();
  rotation = 0;
}

function classify(error: unknown): AiFailure {
  if (error instanceof AiFailure) return error;
  if (error instanceof ProviderHttpError) {
    if (error.status === 429) {
      return new AiFailure(MESSAGES.rate_limit, "rate_limit", error.retryAfterMs ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS);
    }
    if (error.status === 401 || error.status === 403) return new AiFailure(MESSAGES.auth, "auth");
    if (error.status >= 500 || error.status === 408 || error.status === 409 || error.status === 425) {
      return new AiFailure(MESSAGES.transient, "transient");
    }
    return new AiFailure(MESSAGES.invalid, "invalid");
  }
  if (error instanceof Error && error.name === "AbortError") return new AiFailure(MESSAGES.timeout, "timeout");
  return new AiFailure(MESSAGES.transient, "transient");
}

// Fail over across the candidate list. Retryable failures advance to the next
// option; rate-limited and rejected keys are put in cooldown; invalid or
// malformed responses stop immediately (they are deterministic, not quota).
export async function attemptWithFailover<T>(
  candidates: ProviderKey[],
  attempt: (candidate: ProviderKey) => Promise<T>
): Promise<T> {
  let lastFailure: AiFailure | undefined;
  let attempts = 0;
  const budget = Math.max(1, candidates.length) * MAX_PASSES;

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let progressed = false;
    for (const candidate of candidates) {
      if (attempts >= budget) break;
      if (isCoolingDown(candidate)) continue;
      progressed = true;
      attempts += 1;
      try {
        return await attempt(candidate);
      } catch (error) {
        const failure = classify(error);
        lastFailure = failure;
        if (failure.kind === "invalid" || failure.kind === "malformed") throw failure;
        if (failure.kind === "rate_limit" || failure.kind === "auth") {
          setCooldown(candidate, failure.retryAfterMs ?? cooldownFor(failure.kind));
        }
      }
    }
    if (!progressed) break;
  }
  throw lastFailure ?? new AiFailure(MESSAGES.none, "invalid");
}

interface RawResponse {
  status: number;
  ok: boolean;
  data: unknown;
  retryAfterMs?: number;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, MAX_COOLDOWN_MS);
  const at = Date.parse(value);
  if (!Number.isNaN(at)) return Math.min(Math.max(at - Date.now(), 0), MAX_COOLDOWN_MS);
  return undefined;
}

async function requestJson(url: string, init: RequestInit): Promise<RawResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      ok: response.ok,
      data,
      retryAfterMs: parseRetryAfter(response.headers.get("retry-after"))
    };
  } finally {
    clearTimeout(timer);
  }
}

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

async function groqText(candidate: ProviderKey, prompt: string, json: boolean): Promise<string> {
  const response = await requestJson(GROQ_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${candidate.apiKey}` },
    body: JSON.stringify({
      model: candidate.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      ...(json ? { response_format: { type: "json_object" } } : {})
    })
  });
  if (!response.ok) throw new ProviderHttpError(response.status, response.retryAfterMs);
  const text = (response.data as GroqResponse)?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new AiFailure(MESSAGES.malformed, "malformed");
  return text.trim();
}

async function geminiText(candidate: ProviderKey, prompt: string, json: boolean): Promise<string> {
  const response = await requestJson(`${GEMINI_ENDPOINT_ROOT}/${candidate.model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": candidate.apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, ...(json ? { responseMimeType: "application/json" } : {}) }
    })
  });
  if (!response.ok) throw new ProviderHttpError(response.status, response.retryAfterMs);
  const text = (response.data as GeminiResponse)?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new AiFailure(MESSAGES.malformed, "malformed");
  return text;
}

function generateText(candidate: ProviderKey, prompt: string, json = false): Promise<string> {
  return candidate.provider === "groq" ? groqText(candidate, prompt, json) : geminiText(candidate, prompt, json);
}

function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiFailure(MESSAGES.malformed, "malformed");
  }
}

export async function analyzeLead(plan: ProviderKey[], lead: LeadInput): Promise<LeadAnalysis> {
  const raw = await attemptWithFailover(plan, (candidate) =>
    generateText(candidate, `${ANALYSIS_PROMPT}\n\nLead context:\n${leadContext(lead)}`, true));
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
    throw new AiFailure(MESSAGES.malformed, "malformed");
  }
  return result;
}

export async function answerChat(
  plan: ProviderKey[],
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
  return attemptWithFailover(plan, (candidate) =>
    generateText(candidate, `${CHAT_PROMPT}\n\nLead context:\n${context}\n\nConversation:\n${safeHistory}\nSalesperson's latest question:\n${question.slice(0, 5000)}`));
}

export async function generateCallBrief(plan: ProviderKey[], lead: LeadInput): Promise<CallBrief> {
  const raw = await attemptWithFailover(plan, (candidate) =>
    generateText(candidate, `${CALL_BRIEF_PROMPT}\n\nLead context:\n${leadContext(lead)}`, true));
  const result = parseJson<CallBrief>(raw);
  if (typeof result.objective !== "string" || !Array.isArray(result.talkingPoints) ||
      !Array.isArray(result.questions) || !Array.isArray(result.watchOutFor) ||
      typeof result.openingLine !== "string") {
    throw new AiFailure(MESSAGES.malformed, "malformed");
  }
  return result;
}

export function safeAiError(error: unknown): string {
  if (error instanceof AiFailure) return error.message;
  const message = error instanceof Error ? error.message : "";
  if (/timed out|timeout/i.test(message)) return MESSAGES.timeout;
  if (/network|fetch failed|ECONN|ENOTFOUND|EAI_AGAIN/i.test(message)) return MESSAGES.transient;
  return MESSAGES.malformed;
}
