import type { LeadAnalysis, LeadInput, Priority } from "@/types/lead";

export function leadContext(lead: LeadInput): string {
  return [
    `Name: ${lead.name}`,
    `Location: ${lead.location}`,
    `Property requirement: ${lead.propertyRequirement}`,
    `Budget: ${lead.budget}`,
    `Buying timeline: ${lead.timeline}`,
    `Customer message: ${lead.message}`
  ].join("\n");
}

export function analysisContext(analysis: LeadAnalysis, score?: number, priority?: Priority): string {
  return [
    "Existing AI analysis of this lead:",
    `Summary: ${analysis.summary}`,
    `Customer intent: ${analysis.intent} (strength: ${analysis.intentStrength})`,
    `Key requirements: ${analysis.requirements.join("; ") || "none recorded"}`,
    `Objections/concerns: ${analysis.concerns.join("; ") || "none recorded"}`,
    `Recommended next action: ${analysis.nextAction}`,
    `Suggested response: ${analysis.suggestedReply}`,
    ...(typeof score === "number" ? [`Rule-based score: ${score}${priority ? ` (${priority})` : ""}`] : [])
  ].join("\n");
}

export const ANALYSIS_PROMPT = `You are Masal AI, a careful real-estate sales copilot. Analyze the lead using only the provided context. Do not invent facts, properties, prices, availability, or commitments. Be concise and actionable. Return valid JSON only with these fields:
summary (string), intent (string), requirements (string[]), concerns (string[]), nextAction (string), suggestedReply (string), intentStrength ("Strong"|"Moderate"|"Weak"), confidenceNote (string).
The suggested reply must sound human, helpful, and non-pushy. Identify unknowns explicitly.`;

export const CHAT_PROMPT = `You are Masal AI, a real-estate sales copilot. Answer the salesperson's follow-up using the lead context and conversation history. Ground advice in the supplied facts; do not invent availability, prices, or customer preferences. Be direct and practical.`;

export const CALL_BRIEF_PROMPT = `Create a concise real-estate sales call brief using the supplied lead context. Do not invent facts or promise availability. Return valid JSON only with fields: objective (string), talkingPoints (string[]), questions (string[]), watchOutFor (string[]), openingLine (string).`;
