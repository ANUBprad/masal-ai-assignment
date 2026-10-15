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
    // A trailing annotation such as "(flexible)" qualifies one clear figure; it
    // is not a second amount. A parenthetical that contains digits is left for
    // the ambiguity checks below.
    .replace(/\s*\([^()\d]*\)\s*$/, " ")
    .trim();

  const number = "\\d[\\d,]*(?:\\.\\d+)?";
  const unit = "(?:crores?|cr|lakhs?|lacs?|thousands?|k)";
  const repeatedUnitRange = new RegExp("^\\s*(" + number + ")\\s*(" + unit + ")\\s*-\\s*(" + number + ")\\s*(" + unit + ")\\s*$", "i").exec(normalized);
  if (repeatedUnitRange) {
    const low = parseNumber(repeatedUnitRange[1]);
    const high = parseNumber(repeatedUnitRange[3]);
    const lowFactor = factorFor(repeatedUnitRange[2]);
    const highFactor = factorFor(repeatedUnitRange[4]);
    if (low === undefined || high === undefined || lowFactor !== highFactor || low > high) return invalid("Enter a valid increasing budget range using the same unit on both ends.");
    return { kind: "quantified", amount: low * lowFactor };
  }

  const simpleRange = new RegExp("^\\s*(" + number + ")\\s*-\\s*(" + number + ")\\s*(" + unit + ")\\s*$", "i").exec(normalized);
  if (simpleRange) {
    const low = parseNumber(simpleRange[1]);
    const high = parseNumber(simpleRange[2]);
    if (low === undefined || high === undefined || low > high) return invalid("Enter a valid increasing budget range.");
    return { kind: "quantified", amount: low * factorFor(simpleRange[3]) };
  }

  const tokens = [...normalized.matchAll(new RegExp(number, "g"))];
  if (tokens.length > 1) return invalid("Multiple amounts are ambiguous. Enter one amount or a clear range, such as 1.2–1.5 Cr.");
  if (tokens.length === 0) {
    return UNIT_RE.test(normalized) ? invalid("Add an amount before the unit (for example, 50 lakhs).") : { kind: "described" };
  }

  const match = new RegExp("^\\s*(?:around|about|approx(?:imately)?|budget(?: is)?|up to|under|below|above|over)?\\s*(" + number + ")\\s*(" + unit + ")?\\s*$", "i").exec(normalized);
  if (!match) return invalid();
  const value = parseNumber(match[1]);
  if (value === undefined) return invalid("Enter a budget amount greater than zero using valid digits and commas.");
  const amount = value * factorFor(match[2]);
  if (!Number.isFinite(amount) || amount <= 0) return invalid("Enter a valid positive budget amount.");
  return { kind: "quantified", amount };
}
