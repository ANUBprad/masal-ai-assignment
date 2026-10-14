import type { Lead, Priority } from "../types/lead.ts";

// Single source of truth for the leads persisted in the browser.
export const LEADS_STORAGE_KEY = "masal-ai-leads-v1";

// Seeded sample leads were the only records ever written with `demo: true`.
// Filtering on that flag is the targeted migration: leads created through the
// intake form never set it, so a record we cannot positively identify as seeded
// demo data is always kept.
export function isSeededLead(value: unknown): boolean {
  return typeof value === "object" && value !== null && (value as { demo?: unknown }).demo === true;
}

// Reads persisted leads. A missing key, invalid JSON, a non-array value, or a
// non-object entry yields no lead — an empty list is a valid, intentional state
// (not an uninitialized one), so we never substitute sample data for it.
export function parseStoredLeads(raw: string | null): Lead[] {
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item) => typeof item === "object" && item !== null && !isSeededLead(item)) as Lead[];
}

export interface PipelineStats {
  total: number;
  actNow: number;
  avgScore: number;
  byPriority: Record<Priority, number>;
}

// Derives the header stats and per-priority counts. An empty list yields all
// zeros, so the UI shows 0 rather than a stale or fabricated value.
export function pipelineStats(leads: Lead[]): PipelineStats {
  const byPriority: Record<Priority, number> = { "Act Now": 0, "Follow Up": 0, "Nurture": 0 };
  let scoreSum = 0;
  for (const lead of leads) {
    if (lead.priority in byPriority) byPriority[lead.priority] += 1;
    scoreSum += lead.score;
  }
  return {
    total: leads.length,
    actNow: byPriority["Act Now"],
    avgScore: leads.length ? Math.round(scoreSum / leads.length) : 0,
    byPriority
  };
}

// Resolves the current selection, falling back to the first lead. Returns
// `undefined` for an empty workspace so callers render the empty state instead
// of a detail panel for a lead that does not exist.
export function resolveSelectedLead(leads: Lead[], selectedId: string | null): Lead | undefined {
  const found = leads.find((lead) => lead.id === selectedId) ?? leads[0];
  return found;
}
