// Shared, dependency-free landing content. Kept free of JSX and framework
// imports so the Node test runner can assert the public route wiring and the
// workflow copy without a browser or a React test setup — the only way to test
// the root route with the repository's framework-free `node --test` harness.
export const DASHBOARD_PATH = "/dashboard";
export const WORKFLOW_ANCHOR = "how-it-works";

export const HERO = {
  title: "Turn property inquiries into clear next steps.",
  body: "Understand buyer requirements, prioritize follow-ups, and prepare better sales conversations in one focused workspace."
} as const;

export const WORKFLOW_STEPS = [
  {
    title: "Capture",
    body: "Record the buyer's needs, budget, location, and timeline."
  },
  {
    title: "Qualify",
    body: "Review sales priority, known facts, and what information is still missing."
  },
  {
    title: "Follow through",
    body: "Prepare the next conversation with AI analysis, a Call Brief, and Sales Copilot."
  }
] as const;
