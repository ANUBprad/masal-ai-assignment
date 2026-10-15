// Turns the free-text budget field into a normalized rupee amount. This is the
// single source of truth for reading a budget, shared by intake validation and
// the scoring engine so both agree on what counts as a stated figure.
//
// 1 lakh = 100,000 and 1 crore = 10,000,000. A bare number is rupees, never
// lakhs or crores. A range takes its lower bound so a stated figure is never
// inflated by the upper end.
export type BudgetKind = "unspecified" | "quantified" | "described" | "invalid";

export interface BudgetReading {
  kind: BudgetKind;
  amount?: number; // rupees; present only when kind === "quantified"
  error?: string;  // present only when kind === "invalid"
}

const UNSPECIFIED_RE = /^(?:not\s+decided|undecided|unknown|n\/?a|none|nil|tbd|[-–—])?$/i;
const UNIT_FACTORS: Array<{ re: RegExp; factor: number }> = [
  { re: /\b(?:crores?|cr)\b/i, factor: 10_000_000 },
  { re: /\b(?:lakhs?|lacs?|l)\b/i, factor: 100_000 },
  { re: /\b(?:thousands?|k)\b/i, factor: 1_000 }
];
const NUMBER_RE = /\d[\d,]*(?:\.\d+)?/g;

// Drop currency symbols and split a unit glued to its number ("50lakhs",
// "1.3cr") so the unit can be read with word boundaries. En dashes in a range
// are left as a plain hyphen.
function normalize(raw: string): string {
  return raw
    .replace(/\b(?:rs|inr|rupees?)\b\.?/gi, " ")
    .replace(/₹/g, " ")
    .replace(/(\d)\s*(crores?|cr|lakhs?|lacs?|l|thousands?|k)\b/gi, "$1 $2")
    .replace(/[–—]/g, "-");
}

export function readBudget(raw: string): BudgetReading {
  const text = (raw ?? "").trim();
  if (UNSPECIFIED_RE.test(text)) return { kind: "unspecified" };

  const normalized = normalize(text);
  if (/\d+\.\d+\./.test(normalized)) return { kind: "invalid", error: "Enter a valid budget amount." };
  if (/^\s*-\s*\d/.test(normalized)) return { kind: "invalid", error: "Enter a positive budget amount." };

  const unit = UNIT_FACTORS.find((entry) => entry.re.test(normalized));
  const tokens = normalized.match(NUMBER_RE) ?? [];
  if (!tokens.length) {
    return unit
      ? { kind: "invalid", error: "Add an amount before the unit (for example, 50 lakhs)." }
      : { kind: "described" };
  }

  const first = tokens[0];
  if (first === undefined) return { kind: "described" };
  const amount = Number(first.replace(/,/g, "")) * (unit ? unit.factor : 1);
  if (!Number.isFinite(amount) || amount <= 0) return { kind: "invalid", error: "Enter a budget amount greater than zero." };
  return { kind: "quantified", amount };
}
