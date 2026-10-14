import { normalizeTimeline, type LeadAnalysis, type LeadInput } from "../types/lead.ts";

const ANALYSIS_TEXT_LIMIT = 4000;
const ANALYSIS_ITEM_LIMIT = 600;
const ANALYSIS_LIST_LIMIT = 20;

export function validateLead(value: unknown): LeadInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Provide lead details as an object.");
  }
  const record = value as Record<string, unknown>;
  const fields = ["name", "location", "propertyRequirement", "budget", "timeline", "message"] as const;
  for (const field of fields) {
    if (typeof record[field] !== "string") throw new Error(`Enter a valid ${field.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`)}.`);
  }
  const result = Object.fromEntries(fields.map((field) => [field, (record[field] as string).trim()])) as unknown as LeadInput;
  if (result.name.length < 2 || result.name.length > 120) throw new Error("Name must be between 2 and 120 characters.");
  if (!result.location || result.location.length > 160) throw new Error("Enter a valid location.");
  if (!result.propertyRequirement || result.propertyRequirement.length > 300) throw new Error("Enter a valid property requirement.");
  if (!result.budget || result.budget.length > 120) throw new Error("Enter a valid budget.");
  const timeline = normalizeTimeline(result.timeline);
  if (!timeline) throw new Error("Choose a valid buying timeline.");
  result.timeline = timeline;
  if (result.message.length < 5 || result.message.length > 10000) throw new Error("Customer message must be between 5 and 10,000 characters.");
  return result;
}

export function validateAnalysis(value: unknown): LeadAnalysis | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const text = (field: string) =>
    typeof record[field] === "string" ? (record[field] as string).trim().slice(0, ANALYSIS_TEXT_LIMIT) : "";
  const list = (field: string) =>
    (Array.isArray(record[field]) ? (record[field] as unknown[]) : [])
      .filter((item): item is string => typeof item === "string")
      .slice(0, ANALYSIS_LIST_LIMIT)
      .map((item) => item.trim().slice(0, ANALYSIS_ITEM_LIMIT))
      .filter(Boolean);
  const analysis: LeadAnalysis = {
    summary: text("summary"),
    intent: text("intent"),
    requirements: list("requirements"),
    concerns: list("concerns"),
    nextAction: text("nextAction"),
    suggestedReply: text("suggestedReply"),
    intentStrength: ["Strong", "Moderate", "Weak"].includes(String(record.intentStrength))
      ? (record.intentStrength as LeadAnalysis["intentStrength"])
      : "Weak",
    confidenceNote: text("confidenceNote"),
    knownFacts: list("knownFacts"),
    inferences: list("inferences"),
    unknowns: list("unknowns"),
    dealRisks: list("dealRisks")
  };
  const hasContent = Boolean(analysis.summary || analysis.intent || analysis.nextAction ||
    analysis.suggestedReply || analysis.requirements.length || analysis.concerns.length);
  return hasContent ? analysis : undefined;
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request body must be a JSON object.");
  return value as Record<string, unknown>;
}
