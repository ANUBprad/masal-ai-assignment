// Shared, dependency-free landing content. Kept free of JSX and framework
// imports so the Node test runner can assert the public route wiring and the
// scoring copy without a browser or a React test setup — the only way to test
// the root route with the repository's framework-free `node --test` harness.
import { PRIORITY_THRESHOLDS, SCORE_MAX, scoreLead } from "./scoring.ts";
import type { Priority } from "../types/lead.ts";

export const DASHBOARD_PATH = "/dashboard";
export const WORKFLOW_ANCHOR = "how-it-works";
export const SCORING_ANCHOR = "scoring";

export const HERO = {
  title: "Every property lead deserves a clear next move.",
  body: "Understand buyer readiness, surface unanswered questions, and prepare your next sales conversation from one focused workspace."
} as const;

export const WORKFLOW_STEPS = [
  {
    title: "Capture the enquiry",
    body: "Collect the buyer's property requirements, budget, and timeline."
  },
  {
    title: "Understand readiness",
    body: "See the deterministic sales priority, score evidence, and the qualification details that are missing."
  },
  {
    title: "Take the next action",
    body: "Prepare a useful follow-up, a call brief, or a contextual sales conversation."
  }
] as const;

// Explanations for the five fixed scoring dimensions, keyed by the engine's
// dimension key. The weight (points) and label are read from the engine itself,
// never restated here, so the landing copy cannot drift from the real rubric.
const FACTOR_EXPLANATIONS: Record<string, string> = {
  timeline: "Indicates how soon the buyer intends to purchase and how urgently the team should respond.",
  intent: "Reflects how clearly the enquiry demonstrates an intention to buy.",
  clarity: "Measures how clearly the buyer has communicated property needs and preferences.",
  budget: "Indicates whether the buyer's budget is sufficiently understood and aligned with the requirement.",
  engagement: "Reflects responsiveness, engagement, and commitment to the next step."
};

export interface ScoringFactor {
  key: string;
  label: string;
  points: number;
  explanation: string;
}

// The five factors that make up the 100-point score. They are built from the real
// engine (empty input), so a label or weight can never drift from what the
// workspace actually applies. No customer data is involved.
export function scoringFactors(): ScoringFactor[] {
  return scoreLead({ name: "", location: "", propertyRequirement: "", budget: "", timeline: "Just exploring / no rush", message: "" })
    .dimensions
    .map((dim) => ({ key: dim.key, label: dim.label, points: dim.max, explanation: FACTOR_EXPLANATIONS[dim.key] }));
}

export interface PriorityGuidance {
  priority: Priority;
  band: string;
  action: string;
}

// The score range for each priority, derived from the engine's thresholds rather
// than restated, so the landing page can never advertise a cut-off the classifier
// does not use.
export function priorityBand(priority: Priority): string {
  if (priority === "Act Now") return `${PRIORITY_THRESHOLDS.actNow}–${SCORE_MAX}`;
  if (priority === "Follow Up") return `${PRIORITY_THRESHOLDS.followUp}–${PRIORITY_THRESHOLDS.actNow - 1}`;
  return `0–${PRIORITY_THRESHOLDS.followUp - 1}`;
}

// What each priority asks the salesperson to do, paired with its score band.
export const PRIORITY_GUIDANCE: PriorityGuidance[] = [
  { priority: "Act Now", band: priorityBand("Act Now"), action: "Prioritise timely sales engagement." },
  { priority: "Follow Up", band: priorityBand("Follow Up"), action: "Schedule a relevant next contact." },
  { priority: "Nurture", band: priorityBand("Nurture"), action: "Continue appropriate engagement until readiness improves." }
];
