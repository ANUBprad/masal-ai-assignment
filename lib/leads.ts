import type { Lead, Priority } from "../types/lead.ts";
import { buildDemoLeads, DEMOS_DISMISSED_KEY, isDemoLead } from "./demos.ts";

// Single source of truth for the genuine leads persisted in the browser. Demo
// scenarios are NOT stored here — they are re-derived from code on every load
// (see lib/demos.ts), so the durable store holds only real customer records and
// a demo can never be mistaken for one.
export const LEADS_STORAGE_KEY = "masal-ai-leads-v1";
// Bumped when the stored shape or the demo/migration rules change.
export const LEADS_VERSION_KEY = "masal-ai-leads-version";
export const LEADS_VERSION = 4;

export { isDemoLead } from "./demos.ts";

// Reads the durable, genuine-lead store. A missing key, invalid JSON, a
// non-array value, or a non-object entry yields no lead — an empty list is a
// valid, intentional state. Any demo-identified record (a `demo: true`/legacy
// `sample: true` flag, or a reserved `demo-`/`sample-` id) that an older build
// may have written here is dropped: demos are re-derived from code, never
// persisted as customer data. A real lead whose id is a normal generated value
// is always kept, even if the customer shares a demo name.
export function parseStoredLeads(raw: string | null): Lead[] {
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is Lead => typeof item === "object" && item !== null && !isDemoLead(item));
}

// The workspace's initialization path. Genuine leads come from the durable store;
// the three labelled demo scenarios are installed on top unless the user has
// removed them (the `masal-ai-demos-dismissed` marker), which is what makes a
// removal stick across reloads. Because demos are always rebuilt from code — and
// never appended to the stored genuine list — repeated loads can never duplicate
// them.
export function loadStoredLeads(read: (key: string) => string | null): Lead[] {
  const genuine = parseStoredLeads(read(LEADS_STORAGE_KEY));
  const dismissed = read(DEMOS_DISMISSED_KEY) !== null;
  return dismissed ? genuine : [...buildDemoLeads(), ...genuine];
}

export interface PipelineStats {
  total: number;
  actNow: number;
  followUp: number;
  avgScore: number;
  byPriority: Record<Priority, number>;
}

// Derives the header metrics and per-priority counts. An empty list yields all
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
    followUp: byPriority["Follow Up"],
    avgScore: leads.length ? Math.round(scoreSum / leads.length) : 0,
    byPriority
  };
}

// Resolves the current selection strictly: the lead the user picked, or `null`.
// It never falls back to the first lead, so opening the dashboard with demo
// scenarios present still shows the welcome state until the user chooses one.
export function resolveSelectedLead(leads: Lead[], selectedId: string | null): Lead | null {
  if (!selectedId) return null;
  return leads.find((lead) => lead.id === selectedId) ?? null;
}
