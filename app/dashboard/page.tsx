"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot, Check, CircleAlert, CircleCheck, Copy, Flame, Home, Inbox, Loader2,
  MessageCircle, Moon, PhoneCall, Plus, RefreshCw, Search, Send, Sun, Trash2, X
} from "lucide-react";
import type { ChatMessage, Lead, LeadInput, LeadScoreDetail, LeadStatus, Priority } from "@/types/lead";
import { BUYING_TIMELINES } from "@/types/lead";
import { PRIORITIES, PRIORITY_BAR, PRIORITY_NOTE, PRIORITY_STYLES, scoreLead, type LeadScore } from "@/lib/scoring";
import { LEADS_STORAGE_KEY, LEADS_VERSION, LEADS_VERSION_KEY, loadStoredLeads, pipelineStats, resolveSelectedLead } from "@/lib/leads";

const THEME_KEY = "masal-ai-theme";

type Notice = { text: string; tone: "success" | "error" };
type LeadSeed = Omit<Lead, "score" | "priority" | "scoreReasons" | "scoreDetail">;
type TabId = "overview" | "brief" | "copilot";

function scoreDetail(score: LeadScore): LeadScoreDetail {
  return { dimensions: score.dimensions, missing: score.missing, summary: score.summary };
}
// Recompute the deterministic score from recorded fields and status, so labels
// stay consistent and legacy leads (stored with the old Hot/Warm/Cold labels)
// are migrated on load. The score is never taken from the AI analysis.
function withScore(lead: LeadSeed): Lead {
  const scoring = scoreLead(lead, { status: lead.status });
  return { ...lead, score: scoring.score, priority: scoring.priority, scoreReasons: scoring.positives, scoreDetail: scoreDetail(scoring) };
}

const COPILOT_PROMPTS = [
  "How should I open the call?",
  "What objection should I expect?"
];
const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "brief", label: "Call brief" },
  { id: "copilot", label: "Copilot" }
];

function validateForm(input: LeadInput): Partial<Record<keyof LeadInput, string>> {
  const errors: Partial<Record<keyof LeadInput, string>> = {};
  if (input.name.trim().length < 2) errors.name = "Enter a name between 2 and 120 characters.";
  if (!input.location.trim()) errors.location = "Enter the lead's location.";
  if (!input.propertyRequirement.trim()) errors.propertyRequirement = "Describe the property they want.";
  if (!input.budget.trim()) errors.budget = "Enter a budget or indicate it is undecided.";
  if (input.message.trim().length < 5) errors.message = "Add at least 5 characters of the enquiry.";
  return errors;
}
const STATUSES: LeadStatus[] = ["New", "Contacted", "Visit scheduled", "Qualified", "Closed"];

function makeId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }

export default function HomePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"All" | Priority>("All");
  const [tab, setTab] = useState<TabId>("overview");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<"" | "analyze" | "chat" | "brief">("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [question, setQuestion] = useState("");
  const [form, setForm] = useState<LeadInput>({
    name: "", location: "", propertyRequirement: "", budget: "", timeline: "Within 30 days", message: ""
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof LeadInput, string>>>({});

  // Load persisted leads once on mount. `loadStoredLeads` drops seeded demo
  // records — including older ones saved without the `demo` flag — and reports
  // whether a legacy store was migrated, so we stamp the current schema version
  // and the cleanup does not need to run again. A missing/empty store leaves the
  // workspace empty.
  useEffect(() => {
    try {
      const { leads: stored, migrated } = loadStoredLeads((key) => localStorage.getItem(key));
      const saved = stored.map(withScore);
      if (saved.length) {
        setLeads(saved);
        setSelectedId(saved[0].id);
      }
      if (migrated) localStorage.setItem(LEADS_VERSION_KEY, String(LEADS_VERSION));
    } catch { /* Ignore unreadable local browser data; the workspace stays empty. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  // Keep the detail panel on a known tab whenever the selection changes.
  useEffect(() => { setTab("overview"); }, [selectedId]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem(THEME_KEY, next); } catch { /* Ignore unavailable storage. */ }
  }

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
    localStorage.setItem(LEADS_VERSION_KEY, String(LEADS_VERSION));
  }, [leads, hydrated]);

  const selected = resolveSelectedLead(leads, selectedId);
  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const query = search.toLowerCase();
    return (!query || `${lead.name} ${lead.location} ${lead.propertyRequirement}`.toLowerCase().includes(query))
      && (priorityFilter === "All" || lead.priority === priorityFilter);
  }).sort((a, b) => b.score - a.score), [leads, search, priorityFilter]);
  const stats = pipelineStats(leads);

  function updateLead(id: string, patch: Partial<Lead>) {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ...patch, updatedAt: new Date().toISOString() } : lead));
  }
  // Changing status changes the engagement dimension; recompute so the score
  // and priority stay consistent with the recorded action.
  function setStatus(id: string, status: LeadStatus) {
    setLeads((current) => current.map((lead) => {
      if (lead.id !== id) return lead;
      const scoring = scoreLead(lead, { status });
      return { ...lead, status, score: scoring.score, priority: scoring.priority, scoreReasons: scoring.positives, scoreDetail: scoreDetail(scoring), updatedAt: new Date().toISOString() };
    }));
  }
  async function analyze(lead: Lead) {
    setBusy("analyze"); setNotice(null);
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lead }), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      updateLead(lead.id, { analysis: data.analysis });
      setNotice({ text: "Analysis ready.", tone: "success" });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not analyze this lead.", tone: "error" }); }
    finally { setBusy(""); }
  }
  function updateForm<K extends keyof LeadInput>(key: K, value: LeadInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }
  async function createLead(event: React.FormEvent) {
    event.preventDefault();
    const errors = validateForm(form);
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    const lead: Lead = withScore({
      ...form, id: makeId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      status: "New", chat: []
    });
    setLeads((current) => [lead, ...current]);
    setSelectedId(lead.id);
    setShowForm(false);
    setForm({ name: "", location: "", propertyRequirement: "", budget: "", timeline: "Within 30 days", message: "" });
    setFormErrors({});
    void analyze(lead);
  }
  async function sendQuestion(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !question.trim() || busy) return;
    const prompt = question.trim();
    const userMessage: ChatMessage = { id: makeId(), role: "user", content: prompt, createdAt: new Date().toISOString() };
    const history = [...selected.chat, userMessage];
    updateLead(selected.id, { chat: history });
    setQuestion(""); setBusy("chat"); setNotice(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ lead: selected, history: selected.chat, question: prompt }), cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat failed.");
      const assistant: ChatMessage = { id: makeId(), role: "assistant", content: data.answer, createdAt: new Date().toISOString() };
      setLeads((current) => current.map((lead) => lead.id === selected.id ? { ...lead, chat: [...history, assistant], updatedAt: new Date().toISOString() } : lead));
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Could not get an answer.", tone: "error" });
      setLeads((current) => current.map((lead) => lead.id === selected.id ? { ...lead, chat: history.slice(0, -1) } : lead));
    } finally { setBusy(""); }
  }
  async function createBrief() {
    if (!selected) return;
    setBusy("brief"); setNotice(null);
    try {
      const response = await fetch("/api/call-brief", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lead: selected }), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create call brief.");
      updateLead(selected.id, { callBrief: data.brief });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not create call brief.", tone: "error" }); }
    finally { setBusy(""); }
  }
  function copy(text: string) {
    void navigator.clipboard?.writeText(text).then(() => setNotice({ text: "Copied to clipboard.", tone: "success" })).catch(() => setNotice({ text: "Clipboard access was unavailable.", tone: "error" }));
  }
  function removeLead(id: string) {
    if (!window.confirm("Remove this lead from your saved list?")) return;
    const remaining = leads.filter((lead) => lead.id !== id);
    setLeads(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
  }

  return (
    <main id="main" className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--brand)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--on-brand)]">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Masal AI — home">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[var(--ink-solid)] text-[var(--lime)]" aria-hidden="true"><Home size={16}/></span>
            <span className="truncate text-sm font-bold tracking-tight">masal<span className="text-[var(--brand-text)]">.ai</span></span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)]"><Plus size={16}/> Add Lead</button>
            <button onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]">{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button>
          </div>
        </div>
      </header>

      <div id="main-content" className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
          <h1 className="text-lg font-bold tracking-tight">Sales Dashboard</h1>
          {leads.length > 0 && <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter leads by priority">
            {(["All", ...PRIORITIES] as const).map((item) => {
              const active = priorityFilter === item;
              const count = item === "All" ? stats.total : stats.byPriority[item];
              return <button key={item} onClick={() => setPriorityFilter(item)} aria-pressed={active} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${active ? "border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--text)]" : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"}`}>{item}<span className="tabular-nums text-[var(--text-faint)]">{count}</span></button>;
            })}
          </div>}
        </div>

        {!leads.length ? (
          <section className="panel mt-4 grid place-items-center border-dashed px-6 py-16 text-center">
            <div className="flex max-w-sm flex-col items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--brand-text)]"><Inbox size={22}/></span>
              <div>
                <h2 className="text-base font-bold tracking-tight">No leads yet</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Leads you add will appear here with their score, analysis, and call prep.</p>
              </div>
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)]"><Plus size={16}/> Add your first lead</button>
            </div>
          </section>
        ) : (
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(290px,350px)_minmax(0,1fr)]">
            <section className="panel flex flex-col overflow-hidden">
              <div className="border-b border-[var(--border-soft)] p-3">
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"/>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, area, or requirement" aria-label="Search leads" className="h-9 w-full rounded-lg border border-[var(--border-input)] bg-[var(--surface-inset)] pl-9 pr-3 text-sm outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--border-strong)] focus:ring-4 focus:ring-[var(--focus-ring)]"/>
                </div>
              </div>
              <div className="max-h-[calc(100vh-13rem)] divide-y divide-[var(--border-soft)] overflow-y-auto">
                {filteredLeads.map((lead) => {
                  const active = selectedId === lead.id;
                  return <button key={lead.id} onClick={() => setSelectedId(lead.id)} aria-pressed={active} className={`flex w-full flex-col gap-1 border-l-2 px-3.5 py-3 text-left transition ${active ? "border-l-[var(--brand)] bg-[var(--accent-soft)]" : "border-l-transparent hover:bg-[var(--surface-muted)]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{lead.name}</span>
                      <span className={`inline-flex h-6 min-w-[2rem] shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-bold tabular-nums ${PRIORITY_STYLES[lead.priority]}`}>{lead.score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <PriorityBadge priority={lead.priority}/>
                      <span className="truncate">{lead.location.split(",")[0]}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--text-faint)]">
                      <span className="truncate text-[var(--text-muted)]">{lead.propertyRequirement}</span>
                      <span aria-hidden="true">·</span><span className="truncate">{lead.budget}</span>
                      <span aria-hidden="true">·</span><span className="truncate">{lead.timeline}</span>
                    </div>
                  </button>;
                })}
                {!filteredLeads.length && <p className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">No leads match your filters.</p>}
              </div>
            </section>

            {selected ? <div className="min-w-0 space-y-4">
              <section className="panel p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold tracking-tight">{selected.name}</h2>
                      <PriorityBadge priority={selected.priority}/>
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">{selected.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="lead-status" className="sr-only">Lead status</label>
                    <select id="lead-status" value={selected.status} onChange={(e) => setStatus(selected.id, e.target.value as LeadStatus)} className="h-9 rounded-lg border border-[var(--border-input)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--text-soft)] outline-none transition focus:border-[var(--border-strong)] focus:ring-4 focus:ring-[var(--focus-ring)]">{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                    <button onClick={() => removeLead(selected.id)} aria-label={`Delete ${selected.name}`} title="Delete lead" className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-faint)] transition hover:border-[var(--danger-fg)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)]"><Trash2 size={15}/></button>
                  </div>
                </div>

                <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
                  <div className="flex items-center gap-3.5">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-center leading-none">
                      <div><span className="text-lg font-bold tabular-nums">{selected.score}</span><span className="text-xs font-medium text-[var(--text-faint)]">/100</span></div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold">Sales priority</h3>
                      <p className="mt-0.5 max-w-xl text-sm leading-6 text-[var(--text-muted)]">{selected.scoreDetail?.summary}</p>
                    </div>
                  </div>

                  {selected.scoreDetail && <div className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                    {selected.scoreDetail.dimensions.map((dim) => <div key={dim.key}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-[var(--text-soft)]">{dim.label}</span>
                        <span className="shrink-0 tabular-nums text-[var(--text-muted)]"><span className="font-semibold text-[var(--text)]">{dim.earned}</span>/{dim.max}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--border-soft)]" role="img" aria-label={`${dim.label}: ${dim.earned} of ${dim.max}`}>
                        <div className="h-full rounded-full" style={{ width: `${dim.max ? (dim.earned / dim.max) * 100 : 0}%`, background: PRIORITY_BAR[selected.priority] }}/>
                      </div>
                    </div>)}
                  </div>}

                  <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <BulletSection title="Positive signals" items={selected.scoreReasons}/>
                    <div>
                      <h4 className="eyebrow">Missing information</h4>
                      {selected.scoreDetail?.missing.length ? <ul className="mt-2 space-y-1.5">{selected.scoreDetail.missing.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-[var(--text-muted)]"><CircleAlert size={14} className="mt-1 shrink-0 text-[var(--warm-fg)]"/><span>{item}</span></li>)}</ul> : <p className="mt-2 text-sm text-[var(--text-faint)]">No critical qualification gaps recorded.</p>}
                    </div>
                  </div>
                </div>

                <dl className="mt-4 grid overflow-hidden rounded-lg border border-[var(--border-soft)] sm:grid-cols-3">
                  <div className="bg-[var(--surface-muted)] px-3.5 py-3"><dt className="eyebrow">Requirement</dt><dd className="mt-1 text-sm font-medium leading-5 text-[var(--text-soft)]">{selected.propertyRequirement}</dd></div>
                  <div className="border-t border-[var(--border-soft)] bg-[var(--surface-muted)] px-3.5 py-3 sm:border-l sm:border-t-0"><dt className="eyebrow">Budget</dt><dd className="mt-1 text-sm font-medium leading-5 text-[var(--text-soft)]">{selected.budget}</dd></div>
                  <div className="border-t border-[var(--border-soft)] bg-[var(--surface-muted)] px-3.5 py-3 sm:border-l sm:border-t-0"><dt className="eyebrow">Timeline</dt><dd className="mt-1 text-sm font-medium leading-5 text-[var(--text-soft)]">{selected.timeline}</dd></div>
                </dl>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3"><h3 className="eyebrow">Customer message</h3><button onClick={() => copy(selected.message)} aria-label="Copy customer message" title="Copy message" className="text-[var(--text-muted)] transition hover:text-[var(--brand-text)]"><Copy size={13}/></button></div>
                  <p className="mt-1.5 border-l-2 border-[var(--border-input)] pl-3 text-sm leading-6 text-[var(--text-soft)]">{selected.message}</p>
                </div>

                <p className="mt-4 border-t border-[var(--border-soft)] pt-3 text-xs leading-5 text-[var(--text-faint)]">{PRIORITY_NOTE}</p>
              </section>

              <section className="panel overflow-hidden">
                <div className="flex items-center gap-1 border-b border-[var(--border-soft)] px-2" role="tablist" aria-label="Lead details">
                  {TABS.map((item) => {
                    const active = tab === item.id;
                    return <button key={item.id} role="tab" aria-selected={active} onClick={() => setTab(item.id)} className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition ${active ? "border-[var(--brand)] text-[var(--text)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"}`}>{item.label}</button>;
                  })}
                </div>

                <div className="p-4 sm:p-5">
                  {tab === "overview" && <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-bold">AI analysis</h3>
                      <div className="flex items-center gap-2">
                        {selected.analysis ? <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--positive-strong)]"><Check size={13}/>Ready</span>
                          : busy === "analyze" ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]"><Loader2 size={12} className="animate-spin"/>Analyzing…</span>
                          : <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Not run yet</span>}
                        <button disabled={!!busy} onClick={() => void analyze(selected)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-input)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-text)] transition hover:bg-[var(--hover)] disabled:opacity-60"><RefreshCw size={13} className={busy === "analyze" ? "animate-spin" : ""}/>{selected.analysis ? "Refresh" : "Run analysis"}</button>
                      </div>
                    </div>

                    {busy === "analyze" && !selected.analysis ? <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-[var(--border-input)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]"><Loader2 size={16} className="animate-spin"/>Analyzing this lead…</div>
                      : selected.analysis ? <div className="space-y-4">
                        <RichText className="text-sm leading-6 text-[var(--text-soft)]" text={selected.analysis.summary}/>

                        <div className="rounded-lg border-l-2 border-[var(--brand)] bg-[var(--accent-soft)] p-4 pl-3.5">
                          <h3 className="eyebrow text-[var(--brand-text)]">Recommended next action</h3>
                          <RichText className="mt-1.5 text-sm font-semibold leading-6" text={selected.analysis.nextAction}/>
                        </div>

                        <div><h3 className="eyebrow">Buying intent</h3><RichText className="mt-1.5 text-sm leading-6 text-[var(--text-soft)]" text={selected.analysis.intent}/><p className="mt-1.5 text-xs text-[var(--text-muted)]">Intent strength · <span className="font-semibold text-[var(--text-soft)]">{selected.analysis.intentStrength}</span></p></div>

                        <div className="border-t border-[var(--border-soft)] pt-4">
                          <div className="flex items-center justify-between gap-3"><h3 className="eyebrow">Suggested reply</h3><button onClick={() => copy(selected.analysis!.suggestedReply)} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-semibold text-[var(--brand-text)] transition hover:bg-[var(--hover)]"><Copy size={12}/> Copy</button></div>
                          <div className="mt-2 rounded-lg border-l-2 border-[var(--brand)] bg-[var(--surface-muted)] p-3.5"><RichText className="text-sm leading-6 text-[var(--text-soft)]" text={selected.analysis.suggestedReply}/></div>
                          <p className="mt-1.5 text-xs leading-5 text-[var(--text-faint)]">{selected.analysis.confidenceNote}</p>
                        </div>

                        <div className="grid gap-5 border-t border-[var(--border-soft)] pt-4 sm:grid-cols-2">
                          <BulletSection title="Known facts" items={selected.analysis.knownFacts?.length ? selected.analysis.knownFacts : selected.analysis.requirements}/>
                          <BulletSection title="Inferences" items={selected.analysis.inferences ?? []}/>
                          <BulletSection title="Unknowns to clarify" items={selected.analysis.unknowns ?? []}/>
                          <BulletSection title="Deal risks" items={selected.analysis.dealRisks?.length ? selected.analysis.dealRisks : selected.analysis.concerns}/>
                        </div>

                        <div className="border-t border-[var(--border-soft)] pt-4">
                          <button onClick={() => setTab("copilot")} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-input)] px-3.5 py-2 text-xs font-semibold text-[var(--text-soft)] transition hover:bg-[var(--hover)]"><MessageCircle size={14}/> Ask about this lead</button>
                        </div>
                      </div> : <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-[var(--border-input)] bg-[var(--surface-muted)] p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Bot size={15} className="text-[var(--brand-text)]"/>No analysis yet</div><p className="text-sm leading-6 text-[var(--text-muted)]">Run the analysis to get a summary, a recommended next action, and a suggested reply for this lead.</p><button disabled={!!busy} onClick={() => void analyze(selected)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-3.5 py-2 text-xs font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)] disabled:opacity-60"><Bot size={14}/>Run analysis</button></div>}
                  </div>}

                  {tab === "brief" && <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5"><PhoneCall size={16} className="text-[var(--brand-text)]"/><div><h3 className="text-sm font-bold">Call brief</h3><p className="text-xs text-[var(--text-muted)]">A quick prep sheet grounded in this lead.</p></div></div>
                      {selected.callBrief && <button onClick={() => copy([selected.callBrief!.objective, selected.callBrief!.openingLine, ...selected.callBrief!.talkingPoints].join("\n"))} aria-label="Copy call brief" title="Copy call brief" className="text-[var(--text-muted)] transition hover:text-[var(--brand-text)]"><Copy size={14}/></button>}
                    </div>
                    {!selected.callBrief ? <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-[var(--border-input)] bg-[var(--surface-muted)] p-5"><p className="text-sm leading-6 text-[var(--text-muted)]">Generate an objective, opening line, talking points, and questions to run a sharper sales call.</p><button disabled={!!busy} onClick={() => void createBrief()} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-input)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-soft)] transition hover:bg-[var(--hover)] disabled:opacity-60">{busy === "brief" ? <Loader2 size={14} className="animate-spin"/> : <PhoneCall size={14}/>}{busy === "brief" ? "Preparing…" : "Generate call brief"}</button></div>
                      : <div>
                        <RichText className="text-sm leading-6 text-[var(--text-soft)]" text={selected.callBrief.objective}/>
                        <h4 className="eyebrow mt-4">Opening line</h4>
                        <RichText className="mt-1.5 border-l-2 border-[var(--brand)] pl-3 text-sm leading-6 text-[var(--text-soft)]" text={selected.callBrief.openingLine}/>
                        <div className="mt-4 grid gap-5 border-t border-[var(--border-soft)] pt-4 sm:grid-cols-3"><BulletSection title="Talking points" items={selected.callBrief.talkingPoints}/><BulletSection title="Questions" items={selected.callBrief.questions}/><BulletSection title="Watch out for" items={selected.callBrief.watchOutFor}/></div>
                      </div>}
                  </div>}

                  {tab === "copilot" && <div className="space-y-3">
                    <div className="flex items-center gap-2.5"><Bot size={16} className="text-[var(--brand-text)]"/><div><h3 className="text-sm font-bold">Sales copilot</h3><p className="text-xs text-[var(--text-muted)]">Grounded in {selected.name}&apos;s enquiry{selected.analysis ? " and analysis" : ""}</p></div></div>
                    <div className="max-h-[340px] space-y-3.5 overflow-y-auto">
                      {!selected.chat.length && <div className="space-y-3"><p className="text-sm leading-6 text-[var(--text-muted)]">Ask a follow-up about {selected.name} — how to open the call, how to handle an objection, or how to tighten the suggested reply.</p><div className="flex flex-wrap gap-2">{COPILOT_PROMPTS.map((prompt) => <button key={prompt} onClick={() => setQuestion(prompt)} className="rounded-full border border-[var(--border-input)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]">{prompt}</button>)}</div></div>}
                      {selected.chat.map((message) => <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "rounded-br-sm bg-[var(--ink-solid)] text-[var(--on-ink)]" : "rounded-bl-sm bg-[var(--surface-muted)] text-[var(--text-soft)]"}`}>{message.role === "user" ? <span className="whitespace-pre-wrap">{message.content}</span> : <RichText text={message.content}/>}</div></div>)}
                      {busy === "chat" && <div className="flex justify-start"><div className="inline-flex items-center gap-2 rounded-xl rounded-bl-sm bg-[var(--surface-muted)] px-3.5 py-2.5 text-sm text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin"/>Thinking…</div></div>}
                    </div>
                    <form onSubmit={sendQuestion} className="border-t border-[var(--border-soft)] pt-3">
                      <label htmlFor="copilot-question" className="sr-only">Ask about this lead</label>
                      <div className="flex items-end gap-2 rounded-xl border border-[var(--border-input)] bg-[var(--surface-inset)] p-1.5 transition focus-within:border-[var(--border-strong)] focus-within:ring-4 focus-within:ring-[var(--focus-ring)]">
                        <textarea id="copilot-question" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} rows={2} placeholder="Ask about this lead…" className="max-h-28 min-h-[40px] flex-1 resize-y bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-[var(--text-faint)]"/>
                        <button disabled={!question.trim() || !!busy} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--brand)] text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)] disabled:opacity-50"><Send size={15}/></button>
                      </div>
                      <p className="mt-2 px-1 text-[11px] text-[var(--text-faint)]">Enter to send · Shift+Enter for a new line</p>
                    </form>
                  </div>}
                </div>
              </section>
            </div> : <section className="panel grid place-items-center border-dashed p-10 text-center"><p className="text-sm text-[var(--text-muted)]">Select a lead to see its details.</p></section>}
          </div>
        )}
      </div>

      {notice && <div role={notice.tone === "error" ? "alert" : "status"} className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-3.5 pr-3 text-sm shadow-[var(--shadow-pop)]"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${notice.tone === "error" ? "bg-[var(--danger-bg)] text-[var(--danger-fg)]" : "bg-[var(--accent-soft)] text-[var(--positive-strong)]"}`}>{notice.tone === "error" ? <CircleAlert size={15}/> : <CircleCheck size={15}/>}</span><span className="text-[var(--text-soft)]">{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Dismiss message" className="ml-1 text-[var(--text-faint)] transition hover:text-[var(--text)]"><X size={15}/></button></div>}

      {showForm && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay-bg)] backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><section role="dialog" aria-modal="true" aria-labelledby="new-lead-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow-pop)] sm:rounded-2xl sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="new-lead-title" className="text-lg font-bold tracking-tight">Add a lead</h2><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Enter what you know — you can update the rest later.</p></div><button onClick={() => setShowForm(false)} aria-label="Close" className="rounded-lg p-2 text-[var(--text-faint)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]"><X size={17}/></button></div>
        <form onSubmit={createLead} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" htmlFor="lead-name" error={formErrors.name}><input id="lead-name" maxLength={120} value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="e.g. Priya Sharma" className={inputClass}/></Field>
            <Field label="Location" htmlFor="lead-location" error={formErrors.location}><input id="lead-location" maxLength={160} value={form.location} onChange={(e) => updateForm("location", e.target.value)} placeholder="e.g. Whitefield, Bengaluru" className={inputClass}/></Field>
            <Field label="Property requirement" htmlFor="lead-requirement" error={formErrors.propertyRequirement}><input id="lead-requirement" maxLength={300} value={form.propertyRequirement} onChange={(e) => updateForm("propertyRequirement", e.target.value)} placeholder="e.g. 3 BHK apartment" className={inputClass}/></Field>
            <Field label="Budget" htmlFor="lead-budget" error={formErrors.budget}><input id="lead-budget" maxLength={120} value={form.budget} onChange={(e) => updateForm("budget", e.target.value)} placeholder="e.g. ₹1.2–1.5 Cr" className={inputClass}/></Field>
            <Field label="Buying timeline" htmlFor="lead-timeline"><select id="lead-timeline" value={form.timeline} onChange={(e) => updateForm("timeline", e.target.value as LeadInput["timeline"])} className={inputClass}>{BUYING_TIMELINES.map((timeline) => <option key={timeline}>{timeline}</option>)}</select></Field>
          </div>
          <Field label="Customer message" htmlFor="lead-message" error={formErrors.message}><textarea id="lead-message" rows={5} maxLength={10000} value={form.message} onChange={(e) => updateForm("message", e.target.value)} placeholder="Paste the customer's enquiry…" className={inputClass}/></Field>
          <div className="flex justify-end gap-2 border-t border-[var(--border-soft)] pt-4"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--border-input)] px-4 py-2.5 text-sm font-semibold text-[var(--text-soft)] transition hover:bg-[var(--hover)]">Cancel</button><button className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)]">Save and analyze</button></div>
        </form>
      </section></div>}

      <footer className="border-t border-[var(--border)] px-4 py-5">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 text-xs text-[var(--text-faint)] sm:flex-row">
          <p>Scores are heuristic, not a guarantee of conversion.</p>
          <nav className="flex items-center gap-4" aria-label="Legal">
            <Link href="/privacy" className="transition hover:text-[var(--text-muted)]">Privacy</Link>
            <Link href="/terms" className="transition hover:text-[var(--text-muted)]">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

const inputClass = "mt-2 w-full rounded-lg border border-[var(--border-input)] bg-[var(--surface-inset)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--border-strong)] focus:ring-4 focus:ring-[var(--focus-ring)]";
function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) { return <div><label htmlFor={htmlFor} className="field-label">{label}</label>{children}{error && <p className="mt-1.5 text-xs text-[var(--danger-fg)]">{error}</p>}</div>; }
function PriorityBadge({ priority }: { priority: Priority }) { return <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[priority]}`}>{priority === "Act Now" && <Flame size={11}/>}{priority}</span>; }
function BulletSection({ title, items }: { title: string; items: string[] }) { return <div><h4 className="eyebrow">{title}</h4>{items.length ? <ul className="mt-2 space-y-1.5">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-[var(--text-soft)]"><Check size={14} className="mt-1 shrink-0 text-[var(--positive-strong)]"/><span>{item}</span></li>)}</ul> : <p className="mt-2 text-sm text-[var(--text-faint)]">None identified.</p>}</div>; }

// Minimal, dependency-free renderer for the light Markdown the model may return
// (inline bold / code and "-" bullet lines). It emits React nodes — never raw
// HTML — so model output can't inject markup, while the UI stops showing raw
// ** markers verbatim.
function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter((part) => part !== "").map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-semibold text-[var(--text)]">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-[var(--surface-inset)] px-1 py-0.5 text-[0.85em]">{part.slice(1, -1)}</code>;
    return part;
  });
}
function RichText({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    nodes.push(<ul key={`ul-${nodes.length}`} className="list-disc space-y-1 pl-4">{bullets.map((item, index) => <li key={index}>{renderInline(item)}</li>)}</ul>);
    bullets = [];
  };
  for (const line of lines) {
    const bullet = /^[-*]\s+/.exec(line);
    if (bullet) bullets.push(line.slice(bullet[0].length));
    else { flush(); nodes.push(<p key={`p-${nodes.length}`}>{renderInline(line)}</p>); }
  }
  flush();
  if (!nodes.length) return null;
  return <div className={`space-y-1.5 ${className}`.trim()}>{nodes}</div>;
}
