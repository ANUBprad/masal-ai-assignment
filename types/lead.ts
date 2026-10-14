export const leadStatuses = ["New", "Contacted", "Qualified", "Closed"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const priorities = ["Hot", "Warm", "Cold"] as const;
export type LeadPriority = (typeof priorities)[number];

export type LeadInput = {
  name: string;
  location: string;
  propertyRequirement: string;
  budget: string;
  timeline: string;
  message: string;
};

export type LeadAnalysis = {
  summary: string;
  intent: string;
  keyRequirements: string[];
  objections: string[];
  nextAction: string;
  suggestedReply: string;
  intentStrength: "Strong" | "Moderate" | "Weak";
  confidenceNote: string;
};

export type Lead = LeadInput & {
  id: string;
  createdAt: string;
  status: LeadStatus;
  analysis: LeadAnalysis | null;
  priorityScore: number;
  priority: LeadPriority;
  scoreReasons: string[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
