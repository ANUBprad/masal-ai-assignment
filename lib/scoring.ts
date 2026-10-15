// Deterministic, explainable lead-scoring engine.
//
// The score is calculated here only — never by the LLM. It reads the recorded
// lead fields (plus the recorded lead status) and applies fixed rules, so the
// same input always produces the same score and breakdown. Missing information
// is reported as `missing`, never silently treated as a positive signal.
import { normalizeTimeline, type BuyingTimeline, type LeadInput, type LeadStatus, type Priority, type ScoreDimension, type ScoreDimensionKey } from "../types/lead.ts";
import { readBudget } from "./budget.ts";

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
// Display-only, and the single source of truth for priority colour. The class
// names are defined once in app/globals.css against the `--priority-*` theme
// tokens, so a priority reads the same in labels, filters, indicators, and score
// summaries, and stays accessible in both themes. `PRIORITY_BAR` is the raw
// colour for SVG strokes and bar fills; the glow lives only on the text label.
export const PRIORITY_STYLES: Record<Priority, string> = {
  "Act Now": "priority-act",
  "Follow Up": "priority-follow",
  "Nurture": "priority-nurture"
};
export const PRIORITY_BAR: Record<Priority, string> = {
  "Act Now": "var(--priority-act)",
  "Follow Up": "var(--priority-follow)",
  "Nurture": "var(--priority-nurture)"
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

// Intent is assembled from independent, non-overlapping evidence signals rather
// than a single first-match tier. Strong signals are summed (partial credit for
// combined evidence, capped at the dimension max); weak signals are fallbacks
// that apply only when no strong signal is present, and browsing caps the score
// so exploratory phrasing can never outrank a genuine interest statement. Each
// phrase belongs to exactly one signal, so the same evidence is never counted
// twice.
interface IntentSignal { points: number; label: string; patterns: RegExp[]; }

const READY_SIGNAL: IntentSignal = {
  points: 25,
  label: "Explicitly ready to purchase",
  patterns: [/\bready to (?:buy|purchase|book|pay|proceed)\b/, /\bwant to (?:buy|purchase|book)\b/, /\bintend(?:ing)? to (?:buy|purchase)\b/]
};
const COMPARING_SIGNAL: IntentSignal = {
  points: 18,
  label: "Actively comparing or shortlisting options",
  patterns: [/\bcompar\w+\b/, /\bshortlist\w+\b/, /\bnarrowed (?:it )?down\b/, /\bdeciding between\b/, /\bwhich (?:project|option|builder|one)\b/, /\b(?:evaluating|reviewing) (?:a few|multiple|several|options|projects)\b/]
};
const BOOKING_SIGNAL: IntentSignal = {
  points: 12,
  label: "Concrete booking or payment action stated",
  patterns: [/\bbook(?:ing)?\b.*\b(?:bhk|flat|unit|apartment|property|place|home)\b/, /\bpay (?:a )?(?:token|booking|advance)\b/, /\bbooking amount\b/, /\btoken (?:amount|money|ready|paid)\b/, /\badvance payment\b/]
};
const GENERAL_SIGNAL: IntentSignal = {
  points: 10,
  label: "General interest in purchasing",
  patterns: [/\blooking for\b/, /\binterested in\b/, /\bneed (?:a|an)\b/, /\bwant (?:a|an)\b/, /\blooking to (?:buy|purchase)\b/, /\bplanning to (?:buy|purchase)\b/, /\bhoping to (?:buy|purchase)\b/, /\bkeen (?:on|to) (?:buy|purchase|own)\b/]
};
const BROWSING_SIGNAL: IntentSignal = {
  points: 3,
  label: "Browsing without a purchase commitment",
  patterns: [/\bjust (?:looking|browsing|exploring|starting)\b/, /\bonly (?:researching|exploring|looking|browsing|starting|checking)\b/, /\bexploring\b/, /\bcurious\b/, /\bno (?:urgency|rush|hurry)\b/, /\bnot in a (?:hurry|rush)\b/, /\blook(?:ing)? around\b/, /\bearly (?:stage|stages|days)\b/]
};

const STRONG_INTENT_SIGNALS = [READY_SIGNAL, COMPARING_SIGNAL, BOOKING_SIGNAL];

// ponytail: intent is still keyword-based, so it reads phrasing, not meaning. The
// ceiling is unusual wording ("looking to acquire") scoring low; the upgrade path
// is structured intake fields or a calibrated model, neither of which belongs in
// this deterministic module.
const SPECIFIC_CONFIG_RE = /\d+(?:\.\d+)?\s*(?:bhk|bed(?:room)?s?|br)\b|\b\d[\d,.]*\s*(?:sq\.?\s*ft|sqft|square\s*feet|sq\.?\s*m(?:etre|eter)?s?)\b/i;
const CONFIG_RE = /(?:\d+\s*bhk|bhk|apartment|flat|villa|plot|row ?house|penthouse|studio|independent house|house)/i;
const CONSTRAINT_RE = /\b(gated|security|secure|parking|car ?park|amenit\w*|near|close to|walking distance|metro|school|hospital|itpl|access|ready[- ]?to[- ]?move|vaastu|vastu|facing|floor|balcony|gym|pool|swimming|garden|clubhouse|pet)\b/i;
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

// Purchase intent (25). Judged only from the customer message; a short timeline
// alone never implies a purchase commitment. Strong signals are summed per
// affirmative clause, so combined evidence earns partial credit and a negation
// in one clause cannot mask a real signal in another; browsing is judged on
// every clause and caps the weak tiers.
function intentDimension(input: LeadInput): ScoreDimension {
  const parts = clauses(input.message);
  const affirmative = parts.filter((part) => !NEGATED_INTENT_RE.test(part));
  const matches = (signal: IntentSignal, scope: string[]) => scope.some((part) => signal.patterns.some((pattern) => pattern.test(part)));

  const strong = STRONG_INTENT_SIGNALS.filter((signal) => matches(signal, affirmative));
  if (strong.length) {
    const points = Math.min(DIMENSION_MAX.intent, strong.reduce((sum, signal) => sum + signal.points, 0));
    return dimension("intent", "Purchase intent", points, strong.map((signal) => signal.label), []);
  }
  if (matches(BROWSING_SIGNAL, parts)) return dimension("intent", "Purchase intent", BROWSING_SIGNAL.points, [BROWSING_SIGNAL.label], []);
  if (matches(GENERAL_SIGNAL, affirmative)) return dimension("intent", "Purchase intent", GENERAL_SIGNAL.points, [GENERAL_SIGNAL.label], []);
  return dimension("intent", "Purchase intent", 0, [], ["No purchase-intent evidence in the customer message"]);
}

// Requirement clarity (20). Built from four independently-scored components,
// each with partial credit where the recorded evidence is partial: a bare type
// word earns less than a stated configuration, and a budget that is discussed
// but not quantified earns less than a figure. A property type alone never earns
// the full dimension.
function clarityDimension(input: LeadInput): ScoreDimension {
  const evidence: string[] = [];
  const missing: string[] = [];
  let earned = 0;
  const requirement = input.propertyRequirement;

  if (input.location.trim()) { earned += 5; evidence.push(`Location provided: ${input.location.trim()}`); }
  else missing.push("Location not specified");

  if (SPECIFIC_CONFIG_RE.test(requirement)) { earned += 5; evidence.push("Specific property configuration stated"); }
  else if (CONFIG_RE.test(requirement)) { earned += 3; evidence.push("Property type stated without a specific configuration"); missing.push("Property size/configuration (e.g. 3 BHK) not specified"); }
  else missing.push("Property type/configuration (e.g. BHK, villa, plot) not stated");

  const budget = readBudget(input.budget);
  if (budget.kind === "quantified") { earned += 5; evidence.push("Budget amount provided"); }
  else if (budget.kind === "described") { earned += 3; evidence.push("Budget discussed but not quantified"); missing.push("Budget amount not specified"); }
  else missing.push("Budget amount not specified");

  if (CONSTRAINT_RE.test(`${requirement} ${input.message}`)) { earned += 5; evidence.push("Preferences or constraints noted (location, amenities, etc.)"); }
  else missing.push("No specific preferences or constraints recorded");

  return dimension("clarity", "Requirement clarity", earned, evidence, missing);
}

// Budget readiness (20): budget specificity (0–10) plus explicit financial
// readiness (0–10), scored as separate evidence. A flexible budget is not
// penalised. A stated budget is not financing: missing financing information is
// reported as unconfirmed, never treated as proof of financial weakness.
function budgetDimension(input: LeadInput): ScoreDimension {
  const budget = readBudget(input.budget);
  const message = input.message.toLowerCase();
  const evidence: string[] = [];
  const missing: string[] = [];
  let earned = 0;

  if (budget.kind === "quantified") { earned += 10; evidence.push(`Specific budget stated: ${input.budget.trim()}`); }
  else if (budget.kind === "described") { earned += 5; evidence.push("Budget discussed but not quantified"); missing.push("No specific budget figure"); }
  else { missing.push("Budget not stated"); }

  if (FINANCE_FULL_RE.test(message)) { earned += 10; evidence.push("Financing readiness evidenced (pre-approval / funds ready)"); }
  else if (FINANCE_PARTIAL_RE.test(message)) { earned += 5; evidence.push("Financing mentioned but not confirmed"); missing.push("Financing approval not confirmed"); }
  else missing.push("Financing readiness not established (unconfirmed, not a weakness)");

  return dimension("budget", "Budget readiness", earned, evidence, missing);
}

// Engagement and commitment (10). Uses only recorded actions. The recorded
// status and the customer message are distinct evidence and are summed, capped
// at the dimension max: a qualified lead who also asks for a visit earns full
// marks, while a scheduled visit already maxes the dimension and the message is
// not counted a second time. Message-based clues are judged on affirmative
// clauses so "can't visit" does not earn credit. A reply or booking is never
// assumed.
function engagementDimension(input: LeadInput, status?: LeadStatus): ScoreDimension {
  if (status === "Visit scheduled") {
    return dimension("engagement", "Engagement & commitment", 10, ["Recorded commitment (status: Visit scheduled)"], []);
  }

  const evidence: string[] = [];
  let earned = status === "Qualified" ? 5 : 0;
  if (status === "Qualified") evidence.push("Recorded engagement (status: Qualified)");

  const affirmative = clauses(input.message).filter((part) => !NEGATED_ENGAGEMENT_RE.test(part));
  if (affirmative.some((part) => COMMITMENT_MSG_RE.test(part))) { earned += 10; evidence.push("Customer confirmed a next step"); }
  else if (affirmative.some((part) => NEXT_STEP_MSG_RE.test(part))) { earned += 5; evidence.push("Customer requested a concrete next step"); }

  if (earned === 0) return dimension("engagement", "Engagement & commitment", 0, [], ["No confirmed site visit or next-step commitment recorded"]);
  return dimension("engagement", "Engagement & commitment", earned, evidence, []);
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
