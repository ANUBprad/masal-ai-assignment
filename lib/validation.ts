import { normalizeTimeline, type LeadAnalysis, type LeadInput } from "../types/lead.ts";
import { readBudget } from "./budget.ts";

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
  const budget = readBudget(result.budget);
  if (budget.kind === "invalid") throw new Error(budget.error ?? "Enter a valid budget.");
  const timeline = normalizeTimeline(result.timeline);
  if (!timeline) throw new Error("Choose a valid buying timeline.");
  result.timeline = timeline;
  if (result.message.length < 5 || result.message.length > 10000) throw new Error("Customer message must be between 5 and 10,000 characters.");
  return result;
}

// Client-side counterpart to `validateLead` for the intake form: returns a
// message per invalid field so the form can show inline errors, instead of
// throwing on the first problem. Same rules as the API validator, so a lead the
// form accepts also passes the server check.
export function validateLeadFields(input: LeadInput): Partial<Record<keyof LeadInput, string>> {
  const errors: Partial<Record<keyof LeadInput, string>> = {};
  if (input.name.trim().length < 2) errors.name = "Enter a name between 2 and 120 characters.";
  if (!input.location.trim()) errors.location = "Enter the lead's location.";
  if (!input.propertyRequirement.trim()) errors.propertyRequirement = "Describe the property they want.";
  const budget = readBudget(input.budget);
  if (!input.budget.trim()) errors.budget = "Enter a budget or indicate it is undecided.";
  else if (budget.kind === "invalid") errors.budget = budget.error ?? "Enter a valid budget.";
  if (input.message.trim().length < 5) errors.message = "Add at least 5 characters of the enquiry.";
  return errors;
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
