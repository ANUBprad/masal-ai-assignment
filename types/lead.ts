export const BUYING_TIMELINES = [
  "Within 30 days",
  "31–60 days",
  "61–90 days",
  "Over 90 days",
  "Just exploring / no rush"
] as const;

export type BuyingTimeline = (typeof BUYING_TIMELINES)[number];

// Older intake labels (from before the current buckets) mapped to their closest
// current option, so leads saved with a legacy timeline still load and score.
const LEGACY_TIMELINES: Record<string, BuyingTimeline> = {
  "Immediately": "Within 30 days",
  "1–3 months": "61–90 days",
  "3–6 months": "Over 90 days"
};

export function normalizeTimeline(value: unknown): BuyingTimeline | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if ((BUYING_TIMELINES as readonly string[]).includes(trimmed)) return trimmed as BuyingTimeline;
  return LEGACY_TIMELINES[trimmed];
}
export type Priority = "Act Now" | "Follow Up" | "Nurture";
export type LeadStatus = "New" | "Contacted" | "Visit scheduled" | "Qualified" | "Closed";

export type ScoreDimensionKey = "timeline" | "intent" | "clarity" | "budget" | "engagement";

// One scored dimension of the deterministic 100-point engine. `earned` is out of
// `max`; `evidence` lists positive signals supported by recorded lead data and
// `missing` lists qualification gaps (so an empty `evidence` at 0 points is
// distinguishable from genuinely unknown information).
export interface ScoreDimension {
  key: ScoreDimensionKey;
  label: string;
  earned: number;
  max: number;
  evidence: string[];
  missing: string[];
}

export interface LeadScoreDetail {
  dimensions: ScoreDimension[];
  missing: string[];
  summary: string;
}

export interface LeadInput {
  name: string;
  location: string;
  propertyRequirement: string;
  budget: string;
  timeline: BuyingTimeline;
  message: string;
}

export interface LeadAnalysis {
  summary: string;
  intent: string;
  requirements: string[];
  concerns: string[];
  nextAction: string;
  suggestedReply: string;
  intentStrength: "Strong" | "Moderate" | "Weak";
  confidenceNote: string;
  knownFacts?: string[];
  inferences?: string[];
  unknowns?: string[];
  dealRisks?: string[];
}

export interface Lead extends LeadInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  score: number;
  priority: Priority;
  scoreReasons: string[];
  scoreDetail?: LeadScoreDetail;
  status: LeadStatus;
  analysis?: LeadAnalysis;
  chat: ChatMessage[];
  callBrief?: CallBrief;
  demo?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface CallBrief {
  objective: string;
  talkingPoints: string[];
  questions: string[];
  watchOutFor: string[];
  openingLine: string;
}
