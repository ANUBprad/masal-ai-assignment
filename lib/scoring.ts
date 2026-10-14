import type { LeadInput, LeadAnalysis, LeadPriority } from "@/types/lead";

export type ScoreResult = {
  score: number;
  priority: LeadPriority;
  reasons: string[];
};

function timelinePoints(timeline: string): number {
  const value = timeline.toLowerCase();
  if (/immediate|this week|asap|within 2 weeks|1-2 week|urgent/.test(value)) return 30;
  if (/this month|within a month|2-4 week|30 day/.test(value)) return 24;
  if (/1-3 month|3 month|this quarter/.test(value)) return 17;
  if (/3-6 month|six month/.test(value)) return 10;
  if (/explor|just looking|not sure|no rush|6+ month/.test(value)) return 5;
  return 12;
}

export function scoreLead(input: LeadInput, analysis: LeadAnalysis | null): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  const timing = timelinePoints(input.timeline);
  score += timing;
  if (timing >= 24) reasons.push("Near-term buying timeline");
  else if (timing <= 5) reasons.push("Long or exploratory timeline");

  if (/d/.test(input.budget) || /lakh|lac|crore|million|thousand|$|₹|inr/i.test(input.budget)) {
    score += 15;
    reasons.push("Budget information provided");
  } else {
    score += 5;
  }

  if (input.propertyRequirement.trim().length >= 20) {
    score += 15;
    reasons.push("Specific property requirements");
  } else {
    score += 7;
  }

  const message = input.message.toLowerCase();
  if (/visit|site visit|book|booking|ready to buy|ready to purchase|finali[sz]e|down payment|loan approved/.test(message)) {
    score += 25;
    reasons.push("Message signals concrete purchase intent");
  } else if (/price|availability|available|loan|finance|amenit|possession|floor plan|schedule/.test(message)) {
    score += 17;
    reasons.push("Asks actionable purchase questions");
  } else {
    score += 8;
  }

  if (analysis?.intentStrength === "Strong") {
    score += 15;
    reasons.push("AI assessment indicates strong intent");
  } else if (analysis?.intentStrength === "Moderate") {
    score += 10;
  } else if (analysis?.intentStrength === "Weak") {
    score += 3;
  }

  score = Math.min(100, score);
  const priority: LeadPriority = score >= 70 ? "Hot" : score >= 45 ? "Warm" : "Cold";
  if (reasons.length === 0) reasons.push("Limited details so far; ask a clarifying question");
  return { score, priority, reasons };
}
