// Shared, dependency-free landing content. Kept free of JSX and framework
// imports so the Node test runner can assert the public route wiring and the
// workflow copy without a browser or a React test setup — the only way to test
// the root route with the repository's framework-free `node --test` harness.
import { buildDemoLeads, leadDisplayName } from "./demos.ts";
import type { Priority } from "../types/lead.ts";

export const DASHBOARD_PATH = "/dashboard";
export const WORKFLOW_ANCHOR = "how-it-works";

export const HERO = {
  title: "Every property lead deserves a clear next move.",
  body: "Understand buyer readiness, surface unanswered questions, and prepare your next sales conversation from one focused workspace."
} as const;

export const WORKFLOW_STEPS = [
  {
    title: "Capture requirements",
    body: "Record the buyer's location, property need, budget, timeline, and enquiry in one place."
  },
  {
    title: "Understand readiness and missing info",
    body: "See the deterministic score, the signals behind it, and the questions that are still open."
  },
  {
    title: "Take the next sales action",
    body: "Prepare the conversation with AI analysis, a Call Brief, and Sales Copilot."
  }
] as const;

export interface PreviewDimension {
  label: string;
  earned: number;
  max: number;
}

// A read-only view of the product for the landing page. It is built from the
// real demo scenario and the same deterministic engine the workspace uses, so
// the preview cannot claim a score, priority, or breakdown the app would not
// show. `nextAction` mirrors the workspace's pre-analysis guidance: the first
// gap the salesperson should confirm.
export interface LandingPreview {
  name: string;
  priority: Priority;
  score: number;
  location: string;
  property: string;
  budget: string;
  timeline: string;
  dimensions: PreviewDimension[];
  nextAction: string;
}

export function landingPreview(): LandingPreview {
  const [demo] = buildDemoLeads();
  const missing = demo.scoreDetail?.missing[0];
  return {
    name: leadDisplayName(demo),
    priority: demo.priority,
    score: demo.score,
    location: demo.location,
    property: demo.propertyRequirement,
    budget: demo.budget,
    timeline: demo.timeline,
    dimensions: (demo.scoreDetail?.dimensions ?? []).map((dim) => ({ label: dim.label, earned: dim.earned, max: dim.max })),
    nextAction: missing ? `Confirm first: ${missing.toLowerCase()}` : "Run the analysis to get a recommended next action."
  };
}
