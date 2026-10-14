import { z } from "zod";

export const leadInputSchema = z.object({
  name: z.string().trim().min(1, "Enter the customer's name.").max(120),
  location: z.string().trim().min(1, "Enter a location.").max(160),
  propertyRequirement: z.string().trim().min(1, "Describe the property requirement.").max(500),
  budget: z.string().trim().min(1, "Enter the customer's budget.").max(120),
  timeline: z.string().trim().min(1, "Choose the buying timeline.").max(120),
  message: z.string().trim().min(8, "Add a little more detail from the customer.").max(6000),
});

export const leadAnalysisSchema = z.object({
  summary: z.string().min(1).max(1200),
  intent: z.string().min(1).max(800),
  keyRequirements: z.array(z.string().min(1).max(300)).max(8),
  objections: z.array(z.string().min(1).max(300)).max(8),
  nextAction: z.string().min(1).max(800),
  suggestedReply: z.string().min(1).max(1600),
  intentStrength: z.enum(["Strong", "Moderate", "Weak"]),
  confidenceNote: z.string().min(1).max(500),
});

export const chatRequestSchema = z.object({
  lead: leadInputSchema.extend({
    analysis: leadAnalysisSchema.nullable().optional(),
    priorityScore: z.number().min(0).max(100).optional(),
    priority: z.enum(["Hot", "Warm", "Cold"]).optional(),
  }),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(3000),
  })).max(12),
  question: z.string().trim().min(1).max(1000),
});

export const callBriefRequestSchema = z.object({
  lead: leadInputSchema.extend({
    analysis: leadAnalysisSchema.nullable().optional(),
    priorityScore: z.number().min(0).max(100).optional(),
    priority: z.enum(["Hot", "Warm", "Cold"]).optional(),
  }),
});

export function readJsonObject(text: string): unknown {
  const cleaned = text.trim().replace(/^`{3}(?:json)?\\s*/i, "").replace(/\\s*`{3}$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("The AI returned an unreadable response. Please try again.");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}
