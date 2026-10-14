import { BUYING_TIMELINES, type LeadInput } from "../types/lead.ts";

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
  if (!(BUYING_TIMELINES as readonly string[]).includes(result.timeline)) throw new Error("Choose a valid buying timeline.");
  if (result.message.length < 5 || result.message.length > 10000) throw new Error("Customer message must be between 5 and 10,000 characters.");
  return result;
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
