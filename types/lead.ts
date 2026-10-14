export const BUYING_TIMELINES = [
  "Immediately",
  "Within 30 days",
  "1–3 months",
  "3–6 months",
  "Just exploring / no rush"
] as const;

export type BuyingTimeline = (typeof BUYING_TIMELINES)[number];
export type Priority = "Hot" | "Warm" | "Cold";
export type LeadStatus = "New" | "Contacted" | "Visit scheduled" | "Qualified" | "Closed";

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
}

export interface Lead extends LeadInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  score: number;
  priority: Priority;
  scoreReasons: string[];
  status: LeadStatus;
  analysis: LeadAnalysis;
  chat: ChatMessage[];
  callBrief?: CallBrief;
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
