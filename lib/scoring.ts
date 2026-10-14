// Deterministic, explainable lead-scoring engine.
//
// The score is calculated here only — never by the LLM. It reads the recorded
// lead fields (plus the recorded lead status) and applies fixed rules, so the
// same input always produces the same score and breakdown. Missing information
// is reported as `missing`, never silently treated as a positive signal.
import { normalizeTimeline, type BuyingTimeline, type LeadInput, type LeadStatus, type Priority, type ScoreDimension, type ScoreDimensionKey } from "../types/lead.ts";

export const SCORE_MAX = 100;

// Fixed maximum per dimension; the totals sum to SCORE_MAX.
export const DIMENSION_MAX: Record<ScoreDimensionKey, number> = {
  timeline: 25,
  intent: 25,
  clarity: 20,
  budget: 20,
  engagement: 10
};

export interface LeadScore {
  score: number;
  priority: Priority;
  dimensions: ScoreDimension[];
  positives: string[];
  missing: string[];
  summary: string;
}

// Optional recorded context that is not part of the six intake fields. Only the
// lead's own recorded status is used, and only for the engagement dimension.
export interface ScoreContext {
  status?: LeadStatus;
}

// ---------------------------------------------------------------------------
// Priority labels, thresholds, and display styling (single source of truth).
// These are provisional sales-priority labels, not qualification certifications.
// ---------------------------------------------------------------------------
export const PRIORITIES: Priority[] = ["Act Now", "Follow Up", "Nurture"];
export const PRIORITY_THRESHOLDS = { actNow: 80, followUp: 50 } as const;
export const PRIORITY_STYLES: Record<Priority, string> = {
  "Act Now": "bg-[var(--hot-bg)] text-[var(--hot-fg)]",
  "Follow Up": "bg-[var(--warm-bg)] text-[var(--warm-fg)]",
  "Nurture": "bg-[var(--cold-bg)] text-[var(--cold-fg)]"
};
export const PRIORITY_BAR: Record<Priority, string> = {
  "Act Now": "var(--hot-bar)",
  "Follow Up": "var(--warm-bar)",
  "Nurture": "var(--cold-bar)"
};
export const PRIORITY_NOTE =
  "Sales priority is a provisional, rule-based estimate of who to work first — not a qualification status or a probability of closing.";

export function priorityForScore(score: number): Priority {
  if (score >= PRIORITY_THRESHOLDS.actNow) return "Act Now";
  if (score >= PRIORITY_THRESHOLDS.followUp) return "Follow Up";
  return "Nurture";
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Pattern helpers. Each dimension has fixed, documented rules.
// ---------------------------------------------------------------------------
const TIMELINE_POINTS: Record<BuyingTimeline, number> = {
  "Within 30 days": 25,
  "31–60 days": 20,
  "61–90 days": 14,
  "Over 90 days": 7,
  "Just exploring / no rush": 0 // no stated timeline
};

// Clauses are split on sentence punctuation and contrastive conjunctions so a
// positive phrase ("ready to buy") in one clause cannot be cancelled by a
// negation or an exploratory phrase in another.
const CLAUSE_SPLIT_RE = /[.,;!?]|\b(?:but|however|although|though|yet)\b/i;

function clauses(message: string): string[] {
  return message.toLowerCase().split(CLAUSE_SPLIT_RE).map((part) => part.trim()).filter(Boolean);
}

// A negation immediately around an intent verb ("not ready to buy", "won't buy",
// "no plans to purchase") cancels the positive tier for that clause.
const NEGATED_INTENT_RE =
  /\b(?:not|never|no|won'?t|can'?t|cannot|don'?t|doesn'?t|isn'?t|aren'?t|without)\b[^.]{0,40}?\b(?:buy|purchase|book|pay|proceed|ready)\b|\bno (?:plans?|intent|interest|intention)\b/i;

// A negation around a visit/next-step verb ("can't visit", "not ready to meet")
// means the engagement action was not actually committed to.
const NEGATED_ENGAGEMENT_RE =
  /\b(?:not|never|no|won'?t|can'?t|cannot|don'?t|doesn'?t|isn'?t|aren'?t|unable)\b[^.]{0,40}?\b(?:visit|tour|meet|call|schedule|appointment)\b/i;

interface IntentRule { points: number; label: string; patterns: RegExp[]; }
// Evaluated top to bottom; the first tier with any match wins.
const INTENT_RULES: IntentRule[] = [
  {
    points: 25,
    label: "Explicitly ready to purchase",
    patterns: [/\bready to (buy|purchase|book|pay|proceed)\b/, /\bwant to (buy|purchase|book)\b/, /\bbook(?:ing)? (?:a |the )?\w*(?:flat|unit|apartment|property|place)\b/, /\bpay (?:a )?(?:token|booking|advance)\b/]
  },
  {
    points: 18,
    label: "Actively comparing or shortlisting",
    patterns: [/\bcompar\w*\b/, /\bshortlist\w*\b/, /\bnarrowed (?:it )?down\b/, /\bsend (?:me )?(?:the )?floor ?plans?\b/, /\bdeciding between\b/, /\bwhich (?:project|option|builder)\b/]
  },
  {
    points: 3,
    label: "Browsing without a purchase commitment",
    patterns: [/\bjust (?:looking|browsing|exploring|starting)\b/, /\bonly (?:researching|exploring|looking|browsing|starting)\b/, /\bexploring\b/, /\bcurious\b/, /\bno (?:urgency|rush)\b/, /\blook(?:ing)? around\b/]
  },
  {
    points: 10,
    label: "General interest in purchasing",
    patterns: [/\blooking for\b/, /\binterested in (?:buying|a|an|this|that)\b/, /\bplanning to (?:buy|purchase)\b/, /\bwant (?:a|an|to buy)\b/, /\bneed (?:a|an)\b/, /\blooking to (?:buy|purchase)\b/]
  }
];

const CONFIG_RE = /(?:\d+\s*bhk|bhk|apartment|flat|villa|plot|row ?house|penthouse|studio|independent house|house)/i;
const CONSTRAINT_RE = /\b(gated|security|secure|parking|car ?park|amenit\w*|near|close to|walking distance|metro|school|hospital|itpl|access|ready[- ]?to[- ]?move|vaastu|vastu|facing|floor|balcony|gym|pool|swimming|garden|clubhouse|pet)\b/i;
const NO_BUDGET_RE = /^\s*(?:not decided|undecided|unknown|n\/?a|none|-|—)?\s*$/i;
const BUDGET_SYMBOL_RE = /(?:₹|rs\.?|inr)\s*\d/i;
const BUDGET_UNIT_RE = /\d[\d.,]*\s*(?:cr\b|crore|l\b|lakh|lac|k\b|thousand)/i;
const FINANCE_FULL_RE = /\b(pre[- ]?approv\w*|loan (?:is |has been )?approved|sanction\w*|self[- ]?fund\w*|self[- ]?financ\w*|cash (?:purchase|buy|ready)|own funds|funds (?:are )?ready|down ?payment ready|financing (?:arranged|ready|approved)|home loan approved|mortgage approved)\b/i;
const FINANCE_PARTIAL_RE = /\b(loan|home loan|housing loan|mortgage|emi|financ\w*|bank)\b/i;
const COMMITMENT_MSG_RE = /\b(visit is )?(confirmed|booked|scheduled)\b|\blet'?s meet\b|\bready to visit\b|\btoken (?:paid|ready)\b/i;
const NEXT_STEP_MSG_RE = /\b(?:site )?visit\b|\btour\b|\bcall me\b|\bcall back\b|\bschedule\b|\bappointment\b|\bsend (?:me )?(?:the )?(?:floor ?plans?|details|brochure|price ?list)\b|\bshare (?:the )?(?:details|brochure|floor ?plans?)\b|\bfollow up\b/i;

function dimension(key: ScoreDimensionKey, label: string, earned: number, evidence: string[], missing: string[]): ScoreDimension {
  const max = DIMENSION_MAX[key];
  return { key, label, earned: Math.max(0, Math.min(earned, max)), max, evidence, missing };
}

// Buying timeline (25). Parses the recorded timeline only — urgency stated by
// the LLM is never used. Legacy labels are normalized to the current buckets.
function timelineDimension(input: LeadInput): ScoreDimension {
  const timeline = normalizeTimeline(input.timeline);
  const points = timeline ? TIMELINE_POINTS[timeline] : 0;
  if (!timeline || points === 0) return dimension("timeline", "Buying timeline", 0, [], ["No buying timeline stated (exploratory)"]);
  return dimension("timeline", "Buying timeline", points, [`Stated timeline: ${timeline}`], []);
}

// Purchase intent (25). Classified only from the customer message; a short
// timeline alone never implies a purchase commitment. Positive tiers are judged
// per affirmative clause so a negation in one clause does not mask a real signal
// in another; the browsing tier is judged on every clause so exploratory
// phrasing always caps the score below a general-interest claim.
function intentDimension(input: LeadInput): ScoreDimension {
  const parts = clauses(input.message);
  const affirmative = parts.filter((part) => !NEGATED_INTENT_RE.test(part));
  for (const rule of INTENT_RULES) {
    const target = rule.points === 3 ? parts : affirmative;
    if (target.some((part) => rule.patterns.some((pattern) => pattern.test(part)))) {
      return dimension("intent", "Purchase intent", rule.points, [rule.label], []);
    }
  }
  return dimension("intent", "Purchase intent", 0, [], ["No purchase-intent evidence in the customer message"]);
}

// Requirement clarity (20). Four 5-point components, each awarded only when the
// stored data supports it.
function clarityDimension(input: LeadInput): ScoreDimension {
  const evidence: string[] = [];
  const missing: string[] = [];
  let earned = 0;

  if (input.location.trim()) { earned += 5; evidence.push(`Location: ${input.location.trim()}`); }
  else missing.push("Location not specified");

  if (CONFIG_RE.test(input.propertyRequirement)) { earned += 5; evidence.push("Property type/configuration stated"); }
  else missing.push("Property type/configuration (e.g. BHK, villa, plot) not stated");

  if (!NO_BUDGET_RE.test(input.budget)) { earned += 5; evidence.push("Budget specified"); }
  else missing.push("Budget amount not specified");

  if (CONSTRAINT_RE.test(`${input.propertyRequirement} ${input.message}`)) { earned += 5; evidence.push("Preferences/constraints noted"); }
  else missing.push("No specific preferences or constraints recorded");

  return dimension("clarity", "Requirement clarity", earned, evidence, missing);
}

// Budget readiness (20): budget specificity (0–10) plus explicit financial
// readiness (0–10). A flexible budget is not penalised; a stated budget is not
// evidence of financing.
function budgetDimension(input: LeadInput): ScoreDimension {
  const budget = input.budget.trim();
  const message = input.message.toLowerCase();
  const evidence: string[] = [];
  const missing: string[] = [];
  let earned = 0;

  if (NO_BUDGET_RE.test(budget)) {
    missing.push("Budget not stated");
  } else if (BUDGET_SYMBOL_RE.test(budget) || BUDGET_UNIT_RE.test(budget)) {
    earned += 10;
    evidence.push(`Specific budget stated: ${budget}`);
  } else {
    earned += 5;
    evidence.push("Budget discussed but not quantified");
    missing.push("No specific budget figure");
  }

  if (FINANCE_FULL_RE.test(message)) { earned += 10; evidence.push("Financing readiness evidenced (pre-approval / funds ready)"); }
  else if (FINANCE_PARTIAL_RE.test(message)) { earned += 5; evidence.push("Financing mentioned but not confirmed"); missing.push("Financing approval not confirmed"); }
  else missing.push("Financing readiness not established");

  return dimension("budget", "Budget readiness", earned, evidence, missing);
}

// Engagement and commitment (10). Uses only recorded actions. A scheduled visit
// is a confirmed commitment (10); a qualified lead shows recorded engagement but
// not yet a visit (5). Message-based clues are judged on affirmative clauses so
// "can't visit" does not earn credit. We never assume a reply or booking happened.
function engagementDimension(input: LeadInput, status?: LeadStatus): ScoreDimension {
  if (status === "Visit scheduled") {
    return dimension("engagement", "Engagement & commitment", 10, ["Recorded commitment (status: Visit scheduled)"], []);
  }
  if (status === "Qualified") {
    return dimension("engagement", "Engagement & commitment", 5, ["Recorded engagement (status: Qualified)"], []);
  }
  const affirmative = clauses(input.message).filter((part) => !NEGATED_ENGAGEMENT_RE.test(part));
  if (affirmative.some((part) => COMMITMENT_MSG_RE.test(part))) return dimension("engagement", "Engagement & commitment", 10, ["Customer confirmed a next step"], []);
  if (affirmative.some((part) => NEXT_STEP_MSG_RE.test(part))) return dimension("engagement", "Engagement & commitment", 5, ["Customer requested a concrete next step"], []);
  return dimension("engagement", "Engagement & commitment", 0, [], ["No confirmed site visit or next-step commitment recorded"]);
}

function summarize(priority: Priority, score: number, positives: string[], missing: string[]): string {
  const gained = positives.slice(0, 2).join("; ");
  const gaps = missing.length ? ` Gaps to verify: ${missing.slice(0, 2).join("; ")}.` : "";
  const head = `${priority} · ${score}/${SCORE_MAX}.`;
  return `${head}${gained ? ` ${gained}.` : ""}${gaps}`.replace(/\s+/g, " ").trim();
}

export function scoreLead(input: LeadInput, context: ScoreContext = {}): LeadScore {
  const dimensions = [
    timelineDimension(input),
    intentDimension(input),
    clarityDimension(input),
    budgetDimension(input),
    engagementDimension(input, context.status)
  ];
  const score = Math.max(0, Math.min(SCORE_MAX, dimensions.reduce((sum, item) => sum + item.earned, 0)));
  const priority = priorityForScore(score);
  const positives = dimensions.flatMap((item) => item.evidence);
  const missing = dimensions.flatMap((item) => item.missing);
  return { score, priority, dimensions, positives, missing, summary: summarize(priority, score, positives, missing) };
}
