// Shared, dependency-free landing content. Kept free of JSX and framework
// imports so the Node test runner can assert the public route wiring and the
// workflow copy without a browser or a React test setup — the only way to test
// the root route with the repository's framework-free `node --test` harness.
import { scoreLead } from "./scoring.ts";

export const DASHBOARD_PATH = "/dashboard";
export const WORKFLOW_ANCHOR = "how-it-works";

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

export interface PreviewDimension {
  label: string;
  max: number;
}

// The five scoring dimensions the landing page shows as a capability list. They
// come from the real engine (empty input), so the labels and weights can never
// drift from what the dashboard actually scores. No customer data is involved.
export function previewDimensions(): PreviewDimension[] {
  return scoreLead({ name: "", location: "", propertyRequirement: "", budget: "", timeline: "Just exploring / no rush", message: "" })
    .dimensions
    .map((dim) => ({ label: dim.label, max: dim.max }));
}
