// Shared, dependency-free landing content. Kept free of JSX and framework
// imports so the Node test runner can assert the public route wiring and the
// workflow copy without a browser or a React test setup — the only way to test
// the root route with the repository's framework-free `node --test` harness.
export const DASHBOARD_PATH = "/dashboard";
export const WORKFLOW_ANCHOR = "how-it-works";

export const HERO = {
  title: "Turn property inquiries into clear next steps.",
  body: "Organize property leads, understand buyer intent, identify open questions, and prepare your next sales conversation in one workspace."
} as const;

export const WORKFLOW_STEPS = [
  {
    title: "Capture a lead",
    body: "Record the buyer's requirements, budget, location, and timeline."
  },
  {
    title: "Understand readiness",
    body: "Review the explainable priority score, known facts, and missing information."
  },
  {
    title: "Take the next step",
    body: "Use AI-generated analysis, a Call Brief, and Sales Copilot to prepare a relevant follow-up."
  }
] as const;
