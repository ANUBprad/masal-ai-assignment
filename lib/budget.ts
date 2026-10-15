// Normalize the free-text budget into rupees. Keep parsing strict: a wrong
// amount silently changes qualification and scoring, so ambiguous input is an
// error rather than a best guess.
export type BudgetKind = "unspecified" | "quantified" | "described" | "invalid";

export interface BudgetReading {
  kind: BudgetKind;
  amount?: number;
  error?: string;
}

const UNSPECIFIED_RE = /^(?:not\s+decided|undecided|unknown|n\/?a|none|nil|tbd|[-–—])?$/i;
const UNIT_RE = /(?:crores?|cr|lakhs?|lacs?|thousands?|k)\b/i;
const FACTORS: Record<string, number> = {
  cr: 10_000_000, crore: 10_000_000, crores: 10_000_000,
  lakh: 100_000, lakhs: 100_000, lac: 100_000, lacs: 100_000,
  thousand: 1_000, thousands: 1_000, k: 1_000
};
const NUMBER = "(\\d[\\d,]*(?:\\.\\d+)?)";
const UNIT = "(crores?|cr|lakhs?|lacs?|thousands?|k)";

function parseNumber(value: string): number | undefined {
  if (!/^\d[\d,]*(?:\.\d+)?$/.test(value)) return undefined;
  // Commas must be conventional thousands separators, not arbitrary punctuation.
  if (value.includes(",") && !/^(?:\d{1,3}(,\d{3})+|\d{1,2}(,\d{2})*,\d{3})(?:\.\d+)?$/.test(value)) return undefined;
  const number = Number(value.replace(/,/g, ""));
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function factorFor(unit: string | undefined): number {
  if (!unit) return 1;
  return FACTORS[unit.toLowerCase()] ?? 1;
}

function invalid(error = "Enter one clear budget amount, such as 5000000, 50 lakhs, 1 cr, or 1.3 cr.") : BudgetReading {
  return { kind: "invalid", error };
}

export function readBudget(raw: string): BudgetReading {
  const text = (raw ?? "").trim();
  if (UNSPECIFIED_RE.test(text)) return { kind: "unspecified" };

  const normalized = text
    .replace(/\b(?:rs|inr|rupees?)\b\.?/gi, " ")
    .replace(/₹/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/(\d)\s*(crores?|cr|lakhs?|lacs?|thousands?|k)\b/gi, "$1 $2")
    .trim();

  // An explicit range is the only supported multi-number form. The unit may
  // follow the upper bound ("1.2-1.5 Cr") or both bounds ("1.2 Cr-1.5 Cr").
  const range = new RegExp("^\\s*" + NUMBER + "\\s*(?:" + UNIT + "\\s*)?-\\s*" + NUMBER + "\\s*" + UNIT + "\\s*$", "i").exec(normalized)
    ?? new RegExp("^\\s*" + NUMBER + "\\s*-\\s*" + NUMBER + "\\s*" + UNIT + "\\s*$", "i").exec(normalized);
  if (range) {
    const low = parseNumber(range[1]);
    const high = parseNumber(range[3] ?? range[2]);
    // Capture positions differ between the two regex alternatives; resolve
    // range forms explicitly below for predictable number/unit association.
    const simpleRange = new RegExp("^\\s*" + NUMBER + "\\s*-\\s*" + NUMBER + "\\s*" + UNIT + "\\s*$", "i").exec(normalized);
    const repeatedUnitRange = new RegExp("^\\s*" + NUMBER + "\\s*" + UNIT + "\\s*-\\s*" + NUMBER + "\\s*" + UNIT + "\\s*$", "i").exec(normalized);
    if (simpleRange) {
      const lower = parseNumber(simpleRange[1]);
      const upper = parseNumber(simpleRange[2]);
      const factor = factorFor(simpleRange[3]);
      if (lower === undefined || upper === undefined || lower > upper) return invalid("Enter a valid increasing budget range.");
      return { kind: "quantified", amount: lower * factor };
    }
    if (repeatedUnitRange) {
      const lower = parseNumber(repeatedUnitRange[1]);
      const upper = parseNumber(repeatedUnitRange[3]);
      const lowerFactor = factorFor(repeatedUnitRange[2]);
      const upperFactor = factorFor(repeatedUnitRange[4]);
      if (lower === undefined || upper === undefined || lower * lowerFactor > upper * upperFactor) return invalid("Enter a valid increasing budget range.");
      if (lowerFactor !== upperFactor) return invalid("Use the same unit on both ends of a budget range.");
      return { kind: "quantified", amount: lower * lowerFactor };
    }
    // The optional-first-unit alternative is deliberately rejected if the unit
    // placement cannot be associated unambiguously with both endpoints.
    if (low === undefined || high === undefined) return invalid();
  }

  const tokens = [...normalized.matchAll(new RegExp(NUMBER, "g"))];
  if (tokens.length > 1) return invalid("Multiple amounts are ambiguous. Enter one amount or a clear range, such as 1.2–1.5 Cr.");
  if (tokens.length === 0) {
    return UNIT_RE.test(normalized) ? invalid("Add an amount before the unit (for example, 50 lakhs).") : { kind: "described" };
  }

  const match = new RegExp("^\\s*(?:around|about|approx(?:imately)?|budget(?: is)?|up to|under|below|above|over)?\\s*" + NUMBER + "\\s*(" + UNIT + ")?\\s*$", "i").exec(normalized);
  if (!match) return invalid();
  const value = parseNumber(match[1]);
  if (value === undefined) return invalid("Enter a budget amount greater than zero using valid digits and commas.");
  const amount = value * factorFor(match[2]);
  if (!Number.isFinite(amount) || amount <= 0) return invalid("Enter a valid positive budget amount.");
  return { kind: "quantified", amount };
}
