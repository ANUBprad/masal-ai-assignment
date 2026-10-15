// The three representative demo scenarios. They are invented examples for
// demonstration, never real customers, and they exist only to show the three
// sales-priority categories working end to end. Every record carries the real
// `demo: true` model flag *and* the reserved `demo-` id prefix, so the app can
// always tell a demo record from a genuine lead — the `(Dummy)` suffix shown in
// the UI is derived from that flag, never trusted from a customer name.
import { scoreLead } from "./scoring.ts";
import type { Lead, LeadInput } from "../types/lead.ts";

export const DEMO_ID_PREFIX = "demo-";
// Earlier revisions shipped the same idea under a `sample-` id prefix and a
// `sample: true` flag. Both are still recognised so those records migrate
// cleanly instead of resurfacing as genuine leads.
const LEGACY_SAMPLE_ID_PREFIX = "sample-";

// The persisted marker that a user has explicitly removed the demo scenarios,
// so they are not installed again on the next visit.
export const DEMOS_DISMISSED_KEY = "masal-ai-demos-dismissed";

export function isDemoLead(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.demo === true || record.sample === true) return true;
  if (typeof record.id !== "string") return false;
  return record.id.startsWith(DEMO_ID_PREFIX) || record.id.startsWith(LEGACY_SAMPLE_ID_PREFIX);
}

export function demoDisplayName(name: string): string {
  return `${name.trim()} (Dummy)`;
}

// The label shown in the sidebar and detail view. A genuine customer keeps
// their name exactly; only a flagged demo record gains the `(Dummy)` suffix.
export function leadDisplayName(lead: Pick<Lead, "name" | "id" | "demo">): string {
  return isDemoLead(lead) ? demoDisplayName(lead.name) : lead.name;
}

// These values are tuned against the deterministic scoring engine (lib/scoring.ts)
// so each scenario lands in its intended priority band. See tests/demos.test.ts,
// which re-runs the real engine and asserts the resulting priority.
const DEMO_SEEDS: LeadInput[] = [
  {
    // timeline 25 + intent 25 + clarity 20 + budget 10 + engagement 0 = 80 → Act Now
    name: "Rahul",
    location: "Whitefield, Bengaluru",
    propertyRequirement: "3 BHK apartment in a gated community with parking",
    budget: "₹1.2 Cr",
    timeline: "Within 30 days",
    message: "Ready to buy a 3 BHK in Whitefield this month. We want a gated community with parking and our budget is about ₹1.2 crore. We have not confirmed a site visit yet."
  },
  {
    // timeline 14 + intent 18 + clarity 15 + budget 10 + engagement 0 = 57 → Follow Up
    name: "Priya",
    location: "Sarjapur, Bengaluru",
    propertyRequirement: "2 BHK apartment",
    budget: "₹85 lakh",
    timeline: "61–90 days",
    message: "We are planning to buy a 2 BHK in Sarjapur and comparing a few projects within the next 2–3 months. Our possession preference and exact requirements still need to be finalised."
  },
  {
    // timeline 7 + intent 3 + clarity 15 + budget 10 + engagement 0 = 35 → Nurture
    name: "Arjun",
    location: "North Bengaluru",
    propertyRequirement: "2 BHK apartment",
    budget: "₹70 lakh",
    timeline: "Over 90 days",
    message: "Just exploring 2 BHK options in a preferred area of Bengaluru over the next 6–12 months. Budget is around ₹70 lakh and we are not in a hurry."
  }
];

export function buildDemoLeads(now: string = new Date().toISOString()): Lead[] {
  return DEMO_SEEDS.map((seed, index) => {
    const scoring = scoreLead(seed, { status: "New" });
    return {
      ...seed,
      id: `${DEMO_ID_PREFIX}${index + 1}`,
      createdAt: now,
      updatedAt: now,
      score: scoring.score,
      priority: scoring.priority,
      scoreReasons: scoring.positives,
      scoreDetail: { dimensions: scoring.dimensions, missing: scoring.missing, summary: scoring.summary },
      status: "New",
      chat: [],
      demo: true
    };
  });
}

export function removeDemoLeads(leads: Lead[]): Lead[] {
  return leads.filter((lead) => !isDemoLead(lead));
}
