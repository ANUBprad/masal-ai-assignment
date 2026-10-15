// Optional sample data. These records exist only to let a new user see the
// workspace working; they are never loaded automatically. `buildSampleLeads()`
// runs only from the explicit "Load sample leads" action, and every record is
// marked with `sample: true` plus a reserved `sample-` id prefix so it is always
// identifiable and removable — and so it is never mistaken for, or purged like,
// the legacy `demo-` seeds in lib/leads.ts.
import { scoreLead } from "./scoring.ts";
import type { Lead, LeadInput } from "../types/lead.ts";

export const SAMPLE_ID_PREFIX = "sample-";

export function isSampleLead(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.sample === true) return true;
  return typeof record.id === "string" && record.id.startsWith(SAMPLE_ID_PREFIX);
}

const SAMPLE_SEEDS: LeadInput[] = [
  {
    name: "Rahul (Dummy)",
    location: "Sarjapur Road, Bengaluru",
    propertyRequirement: "2 BHK apartment with clubhouse and covered parking",
    budget: "₹90 lakh–1 Cr",
    timeline: "Within 30 days",
    message: "I'm comparing a few 2 BHK projects around Sarjapur and ready to buy. Please share the full cost and can we book a site visit this weekend?"
  },
  {
    name: "Priya (Dummy)",
    location: "Whitefield, Bengaluru",
    propertyRequirement: "3 BHK apartment close to a good school",
    budget: "₹1.4–1.7 Cr",
    timeline: "61–90 days",
    message: "We're relocating in a couple of months and shortlisting Whitefield projects. Please send the floor plans; we'd like to visit once before deciding."
  },
  {
    name: "Ananya (Dummy)",
    location: "Electronic City, Bengaluru",
    propertyRequirement: "Apartment — 2 or 3 BHK, open to options",
    budget: "Not decided",
    timeline: "Just exploring / no rush",
    message: "Just exploring what flats are available in Electronic City. Not sure about the budget yet — would like to understand the prices."
  }
];

export function buildSampleLeads(now: string = new Date().toISOString()): Lead[] {
  return SAMPLE_SEEDS.map((seed, index) => {
    const scoring = scoreLead(seed, { status: "New" });
    return {
      ...seed,
      id: `${SAMPLE_ID_PREFIX}${index + 1}`,
      createdAt: now,
      updatedAt: now,
      score: scoring.score,
      priority: scoring.priority,
      scoreReasons: scoring.positives,
      scoreDetail: { dimensions: scoring.dimensions, missing: scoring.missing, summary: scoring.summary },
      status: "New",
      chat: [],
      sample: true
    };
  });
}

export function removeSampleLeads(leads: Lead[]): Lead[] {
  return leads.filter((lead) => !isSampleLead(lead));
}
