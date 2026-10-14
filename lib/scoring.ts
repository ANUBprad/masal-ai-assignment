import type { LeadInput, Priority } from "../types/lead";

export interface LeadScore {
  score: number;
  priority: Priority;
  reasons: string[];
}

export function scoreLead(input: LeadInput): LeadScore {
  let score = 35;
  const reasons: string[] = [];
  const timeline = input.timeline.toLowerCase();

  if (timeline.includes("immediately")) {
    score += 35;
    reasons.push("Immediate buying timeline");
  } else if (timeline.includes("30 days")) {
    score += 28;
    reasons.push("Near-term buying timeline");
  } else if (timeline.includes("1–3 months")) {
    score += 18;
    reasons.push("Defined buying window");
  } else if (timeline.includes("3–6 months")) {
    score += 8;
    reasons.push("Medium-term buying window");
  } else {
    score -= 8;
    reasons.push("Exploratory timeline");
  }

  const message = input.message.toLowerCase();
  const strongSignals = [
    ["visit", 12, "Asked about a property visit"],
    ["loan", 8, "Mentioned financing or loan approval"],
    ["ready to move", 8, "Ready-to-move preference"],
    ["book", 8, "Mentioned booking"],
    ["site", 6, "Asked about a site visit"],
    ["available", 5, "Asked about availability"]
  ] as const;
  for (const [term, points, reason] of strongSignals) {
    if (message.includes(term)) {
      score += points;
      reasons.push(reason);
    }
  }

  if (input.budget.trim()) {
    score += 5;
    reasons.push("Budget provided");
  }
  if (input.propertyRequirement.trim()) {
    score += 5;
    reasons.push("Property requirement specified");
  }

  score = Math.max(0, Math.min(100, score));
  const priority: Priority = score >= 70 ? "Hot" : score >= 48 ? "Warm" : "Cold";
  return { score, priority, reasons };
}

export function priorityForScore(score: number): Priority {
  return score >= 70 ? "Hot" : score >= 48 ? "Warm" : "Cold";
}
