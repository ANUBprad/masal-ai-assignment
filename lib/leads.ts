import type { Lead, Priority } from "../types/lead.ts";

// Single source of truth for the leads persisted in the browser.
export const LEADS_STORAGE_KEY = "masal-ai-leads-v1";
// Bumped when the stored shape or seed-cleanup rules need a one-time migration.
export const LEADS_VERSION_KEY = "masal-ai-leads-version";
export const LEADS_VERSION = 2;

// The deterministic ids the seeded demo records were created with. The app's
// own `makeId` (crypto.randomUUID / timestamp) never produces an id starting
// with "demo-", so these identify the fixtures unambiguously — including older
// records written before the `demo: true` flag existed. This is the reliable
// marker; a customer whose name happens to be "Rahul" is never matched by name.
const SEEDED_LEAD_IDS = new Set(["demo-1", "demo-2", "demo-3"]);

// A record is seeded demo data only when we can positively identify it: either
// it carries the legacy `demo: true` flag, or its id is one of the known seed
// ids. Anything else — including a real lead named "Rahul" or one that merely
// resembles an example — is kept.
export function isSeededLead(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.demo === true) return true;
  return typeof record.id === "string" && SEEDED_LEAD_IDS.has(record.id);
}

// Removes only the reliably identified seeded records. Idempotent: applying it
// twice yields the same list.
export function migrateSeededLeads(leads: Lead[]): Lead[] {
  return leads.filter((lead) => !isSeededLead(lead));
}

// Reads persisted leads. A missing key, invalid JSON, a non-array value, or a
// non-object entry yields no lead — an empty list is a valid, intentional state
// (not an uninitialized one), so we never substitute sample data for it.
export function parseStoredLeads(raw: string | null): Lead[] {
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  const records = parsed.filter((item) => typeof item === "object" && item !== null) as Lead[];
  return migrateSeededLeads(records);
}

export interface StoredLeadsResult {
  leads: Lead[];
  // True when a legacy schema version was found, so the caller knows to persist
  // the cleaned list and stamp the current version.
  migrated: boolean;
}

// Versioned load used by the workspace. The seed cleanup runs whenever a legacy
// (pre-`LEADS_VERSION`) store is detected; the `migrated` flag lets the caller
// stamp the new version so the destructive scan does not repeat. The filter is
// also always applied to the parsed list, so a stray seed can never resurface
// on a later load even without a version bump.
export function loadStoredLeads(read: (key: string) => string | null): StoredLeadsResult {
  const raw = read(LEADS_STORAGE_KEY);
  const storedVersion = Number(read(LEADS_VERSION_KEY));
  const version = Number.isFinite(storedVersion) ? storedVersion : 0;
  return { leads: parseStoredLeads(raw), migrated: version < LEADS_VERSION };
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

// Resolves the current selection, falling back to the first lead. Returns
// `undefined` for an empty workspace so callers render the empty state instead
// of a detail panel for a lead that does not exist.
export function resolveSelectedLead(leads: Lead[], selectedId: string | null): Lead | undefined {
  const found = leads.find((lead) => lead.id === selectedId) ?? leads[0];
  return found;
}
