"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot, Check, CircleAlert, CircleCheck, Copy, Flame, Inbox, Loader2,
  MessageCircle, Moon, PhoneCall, Plus, RefreshCw, Search, Send, Sparkles, Sun, Trash2, X
} from "lucide-react";
import type { ChatMessage, Lead, LeadInput, LeadScoreDetail, LeadStatus, Priority } from "@/types/lead";
import { BUYING_TIMELINES } from "@/types/lead";
import { PRIORITIES, PRIORITY_BAR, PRIORITY_NOTE, PRIORITY_STYLES, scoreLead, type LeadScore } from "@/lib/scoring";

const STORAGE_KEY = "masal-ai-leads-v1";
const THEME_KEY = "masal-ai-theme";

type Notice = { text: string; tone: "success" | "error" };
type LeadSeed = Omit<Lead, "score" | "priority" | "scoreReasons" | "scoreDetail">;

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

function validateForm(input: LeadInput): Partial<Record<keyof LeadInput, string>> {
  const errors: Partial<Record<keyof LeadInput, string>> = {};
  if (input.name.trim().length < 2) errors.name = "Enter a name between 2 and 120 characters.";
  if (!input.location.trim()) errors.location = "Enter the lead's location.";
  if (!input.propertyRequirement.trim()) errors.propertyRequirement = "Describe the property they want.";
  if (!input.budget.trim()) errors.budget = "Enter a budget or indicate it is undecided.";
  if (input.message.trim().length < 5) errors.message = "Add at least 5 characters of the enquiry.";
  return errors;
}
const DEMO_SEED: LeadSeed[] = [
  {
    id: "demo-1", name: "Priya Sharma", location: "Whitefield, Bengaluru",
    propertyRequirement: "3 BHK apartment, gated community", budget: "₹1.2–1.5 Cr",
    timeline: "Within 30 days", message: "Hi, we're looking for a 3 BHK near Whitefield because our office is moving there next month. Budget is around 1.4 crore. We have loan pre-approval and would like to visit a few ready-to-move options this weekend.",
    createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString(), updatedAt: new Date().toISOString(),
    status: "Visit scheduled", demo: true, chat: [], analysis: {
      summary: "A motivated buyer seeking a ready-to-move 3 BHK near Whitefield ahead of an office relocation next month.",
      intent: "High intent: defined budget, financing pre-approval, and a specific visit request.",
      requirements: ["3 BHK in a gated community", "Near Whitefield", "Ready-to-move options", "Budget around ₹1.4 Cr"],
      concerns: ["Availability for the requested weekend is not confirmed", "Commute and exact preferred micro-location need clarification"],
      nextAction: "Shortlist 2–3 verified ready-to-move options and confirm a weekend visit slot.",
      suggestedReply: "Hi Priya, thanks for sharing those details. I’ll shortlist ready-to-move 3 BHK options around Whitefield within your budget. Could you share your preferred move-in date and any must-have amenities? I’ll then suggest suitable options and coordinate a visit.",
      intentStrength: "Strong", confidenceNote: "Based on the stated budget, financing pre-approval, near-term move, and explicit visit request.",
      knownFacts: ["Near-term move (office relocating next month)", "Budget around ₹1.4 Cr", "Loan pre-approval stated", "Wants ready-to-move 3 BHK near Whitefield", "Requested a weekend visit"],
      inferences: ["Likely a decision-ready buyer given the near-term move and financing signal", "Gated-community preference is implied by the requirement"],
      unknowns: ["Exact possession date", "Must-have amenities", "Preferred micro-location within Whitefield"],
      dealRisks: ["Weekend visit slot and ready-to-move inventory are not confirmed", "No verified availability for the requested configuration"]
    }
  },
  {
    id: "demo-2", name: "Rahul Mehta", location: "Sarjapur Road, Bengaluru",
    propertyRequirement: "2 BHK apartment with amenities", budget: "₹75–90 L",
    timeline: "61–90 days", message: "I'm comparing a few projects in Sarjapur. Can you send floor plans and maintenance details? Still deciding whether to buy now or later.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), updatedAt: new Date().toISOString(),
    status: "Contacted", demo: true, chat: [], analysis: {
      summary: "A comparison-stage buyer researching 2 BHK options and recurring costs around Sarjapur Road.",
      intent: "Moderate intent: actively comparing projects but timing is not final.",
      requirements: ["2 BHK", "Sarjapur Road area", "Floor plans", "Maintenance cost clarity"],
      concerns: ["Purchase timing is undecided", "Total cost of ownership needs clarification"],
      nextAction: "Send verified floor plans and a transparent cost breakdown; schedule a short discovery call.",
      suggestedReply: "Hi Rahul, happy to help. I can share the available floor plans along with the maintenance and other recurring costs so you can compare options clearly. Is there a particular possession timeline or amenity that's most important to you?",
      intentStrength: "Moderate", confidenceNote: "The lead is engaged in comparison but has not committed to a purchase date.",
      knownFacts: ["Comparing a few projects around Sarjapur Road", "Budget ₹75–90 L", "Wants 2 BHK with amenities", "Asked about floor plans and maintenance"],
      inferences: ["Likely price-sensitive and comparing total cost of ownership", "May be waiting to see options before deciding timing"],
      unknowns: ["Whether they will buy now or later", "Possession timeline", "Which amenities matter most"],
      dealRisks: ["Purchase timing is undecided", "Total cost of ownership has not been framed"]
    }
  },
  {
    id: "demo-3", name: "Ananya Rao", location: "North Bengaluru",
    propertyRequirement: "Villa or plot, flexible", budget: "Not decided",
    timeline: "Just exploring / no rush", message: "Just starting to look around. Curious about the difference between buying a plot and a villa. No urgency at the moment.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), updatedAt: new Date().toISOString(),
    status: "New", demo: true, chat: [], analysis: {
      summary: "An early-stage prospect exploring villa versus plot ownership in North Bengaluru with no fixed timeline.",
      intent: "Low immediate intent; education and light nurturing are more appropriate than hard selling.",
      requirements: ["Understand villa versus plot trade-offs", "Explore North Bengaluru"],
      concerns: ["Budget and timeline are unknown", "Property type remains undecided"],
      nextAction: "Share a neutral comparison guide and ask permission to follow up in a few weeks.",
      suggestedReply: "Hi Ananya, happy to help you explore both options. A villa offers a more ready-to-use home, while a plot can offer more flexibility but needs additional planning. I can share a simple comparison of costs, upkeep, and timelines to help you decide at your own pace.",
      intentStrength: "Weak", confidenceNote: "The customer explicitly described the enquiry as exploratory and low urgency.",
      knownFacts: ["Early-stage research", "Interested in villa versus plot", "Location preference: North Bengaluru"],
      inferences: ["Education-first nurturing is more appropriate than a sales push"],
      unknowns: ["Budget", "Timeline", "Whether they will buy at all"],
      dealRisks: ["No budget or timeline to qualify", "Property type remains undecided"]
    }
  }
];
const DEMO_LEADS: Lead[] = DEMO_SEED.map(withScore);

const STATUSES: LeadStatus[] = ["New", "Contacted", "Visit scheduled", "Qualified", "Closed"];

function makeId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }

export default function HomePage() {
  const [leads, setLeads] = useState<Lead[]>(DEMO_LEADS);
  const [selectedId, setSelectedId] = useState("demo-1");
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"All" | Priority>("All");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<"" | "analyze" | "chat" | "brief">("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [question, setQuestion] = useState("");
  const [form, setForm] = useState<LeadInput>({
    name: "", location: "", propertyRequirement: "", budget: "", timeline: "Within 30 days", message: ""
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof LeadInput, string>>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Lead[];
        if (Array.isArray(saved) && saved.length) {
          const normalized = saved.map(withScore);
          setLeads(normalized);
          setSelectedId(normalized[0].id);
        }
      }
    } catch { /* Ignore invalid local browser data and use demo leads. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem(THEME_KEY, next); } catch { /* Ignore unavailable storage. */ }
  }

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads, hydrated]);

  const selected = leads.find((lead) => lead.id === selectedId) ?? leads[0];
  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const query = search.toLowerCase();
    return (!query || `${lead.name} ${lead.location} ${lead.propertyRequirement}`.toLowerCase().includes(query))
      && (priorityFilter === "All" || lead.priority === priorityFilter);
  }).sort((a, b) => b.score - a.score), [leads, search, priorityFilter]);
  const actNowCount = leads.filter((lead) => lead.priority === "Act Now").length;
  const avgScore = leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length) : 0;

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
    if (selectedId === id && remaining[0]) setSelectedId(remaining[0].id);
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--ink-solid)] text-[var(--lime)]"><Sparkles size={17}/></div>
            <div className="min-w-0 leading-none">
              <p className="text-[15px] font-bold tracking-tight">masal<span className="text-[var(--brand-text)]">.ai</span></p>
              <p className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-faint)] sm:block">Lead intelligence</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-3.5 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)]"><Plus size={16}/> Add lead</button>
            <button onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]">{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">Pipeline</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Prioritized real-estate leads with AI analysis and follow-up.</p>
          </div>
          <dl className="flex items-center gap-5">
            <Stat label="Leads" value={leads.length}/>
            <div className="h-9 w-px bg-[var(--border-soft)]" aria-hidden="true"/>
            <Stat label="Act now" value={actNowCount}/>
            <div className="h-9 w-px bg-[var(--border-soft)]" aria-hidden="true"/>
            <Stat label="Avg score" value={avgScore}/>
          </dl>
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          <section className="panel flex flex-col overflow-hidden">
            <div className="border-b border-[var(--border-soft)] p-4">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"/>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, area, or requirement" aria-label="Search leads" className="h-10 w-full rounded-lg border border-[var(--border-input)] bg-[var(--surface-inset)] pl-9 pr-3 text-sm outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--border-strong)] focus:ring-4 focus:ring-[var(--focus-ring)]"/>
              </div>
              <div className="mt-3 inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] p-0.5" role="group" aria-label="Filter by priority">
                {(["All", ...PRIORITIES] as const).map((item) => {
                  const active = priorityFilter === item;
                  return <button key={item} onClick={() => setPriorityFilter(item)} aria-pressed={active} className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold transition ${active ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm" : "border border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"}`}>{item}{item !== "All" && <span className={`tabular-nums ${active ? "text-[var(--text-faint)]" : "text-[var(--text-faint)]"}`}>{leads.filter((lead) => lead.priority === item).length}</span>}</button>;
                })}
              </div>
            </div>
            <div className="max-h-[calc(100vh-16rem)] divide-y divide-[var(--border-soft)] overflow-y-auto">
              {filteredLeads.map((lead) => {
                const active = selectedId === lead.id;
                return <button key={lead.id} onClick={() => setSelectedId(lead.id)} aria-pressed={active} className={`flex w-full flex-col gap-1.5 border-l-2 px-4 py-3.5 text-left transition ${active ? "border-l-[var(--brand)] bg-[var(--accent-soft)]" : "border-l-transparent hover:bg-[var(--surface-muted)]"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold">{lead.name}</span>
                    <span className={`inline-flex h-6 min-w-[2rem] shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-bold tabular-nums ${PRIORITY_STYLES[lead.priority]}`}>{lead.score}</span>
                  </div>
                  <p className="truncate text-sm text-[var(--text-muted)]">{lead.propertyRequirement}{lead.budget && lead.budget !== "Not decided" ? ` · ${lead.budget}` : ""}</p>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <PriorityBadge priority={lead.priority}/>
                    <span className="truncate">{lead.location.split(",")[0]}</span>
                    <span aria-hidden="true" className="text-[var(--text-faint)]">·</span>
                    <span className="truncate">{lead.timeline}</span>
                    {lead.demo && <span className="ml-auto shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Sample</span>}
                  </div>
                </button>;
              })}
              {!leads.length && <div className="flex flex-col items-center gap-3 px-6 py-12 text-center"><Inbox size={22} className="text-[var(--text-faint)]"/><div><p className="text-sm font-semibold">No leads yet</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">Add your first lead to start the pipeline.</p></div><button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-input)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] transition hover:bg-[var(--hover)]"><Plus size={14}/> Add lead</button></div>}
              {leads.length > 0 && !filteredLeads.length && <p className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">No leads match your search.</p>}
            </div>
          </section>

          {selected ? <div className="min-w-0 space-y-5">
            <section className="panel overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-bold tracking-tight">{selected.name}</h2>
                    <PriorityBadge priority={selected.priority}/>
                    {selected.demo && <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Sample</span>}
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{selected.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="lead-status" className="sr-only">Lead status</label>
                  <select id="lead-status" value={selected.status} onChange={(e) => setStatus(selected.id, e.target.value as LeadStatus)} className="h-9 rounded-lg border border-[var(--border-input)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--text-soft)] outline-none transition focus:border-[var(--border-strong)] focus:ring-4 focus:ring-[var(--focus-ring)]">{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                  <button onClick={() => removeLead(selected.id)} aria-label={`Delete ${selected.name}`} title="Delete lead" className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-faint)] transition hover:border-[var(--danger-fg)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)]"><Trash2 size={15}/></button>
                </div>
              </div>
              <dl className="grid border-t border-[var(--border-soft)] sm:grid-cols-3">
                <div className="px-5 py-4"><dt className="eyebrow">Requirement</dt><dd className="mt-1.5 text-sm font-medium leading-5 text-[var(--text-soft)]">{selected.propertyRequirement}</dd></div>
                <div className="border-t border-[var(--border-soft)] px-5 py-4 sm:border-l sm:border-t-0"><dt className="eyebrow">Budget</dt><dd className="mt-1.5 text-sm font-medium leading-5 text-[var(--text-soft)]">{selected.budget}</dd></div>
                <div className="border-t border-[var(--border-soft)] px-5 py-4 sm:border-l sm:border-t-0"><dt className="eyebrow">Timeline</dt><dd className="mt-1.5 text-sm font-medium leading-5 text-[var(--text-soft)]">{selected.timeline}</dd></div>
              </dl>
              <div className="border-t border-[var(--border-soft)] bg-[var(--surface-muted)] px-5 py-4">
                <div className="flex items-center justify-between gap-3"><h3 className="eyebrow">Customer message</h3><button onClick={() => copy(selected.message)} aria-label="Copy customer message" title="Copy message" className="text-[var(--text-muted)] transition hover:text-[var(--brand-text)]"><Copy size={14}/></button></div>
                <p className="mt-2 border-l-2 border-[var(--border-input)] pl-3 text-sm leading-6 text-[var(--text-soft)]">{selected.message}</p>
              </div>
            </section>

            {selected.scoreDetail && <section className="panel p-5" aria-label="Sales priority">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-center leading-none">
                    <div><span className="text-lg font-bold tabular-nums">{selected.score}</span><span className="text-xs font-medium text-[var(--text-faint)]">/100</span></div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold">Sales priority</h2><PriorityBadge priority={selected.priority}/></div>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--text-muted)]">{selected.scoreDetail.summary}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3.5 border-t border-[var(--border-soft)] pt-4">
                {selected.scoreDetail.dimensions.map((dim) => <div key={dim.key}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[var(--text-soft)]">{dim.label}</span>
                    <span className="shrink-0 tabular-nums text-[var(--text-muted)]"><span className="font-semibold text-[var(--text)]">{dim.earned}</span>/{dim.max}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--border-soft)]" role="img" aria-label={`${dim.label}: ${dim.earned} of ${dim.max}`}>
                    <div className="h-full rounded-full" style={{ width: `${dim.max ? (dim.earned / dim.max) * 100 : 0}%`, background: PRIORITY_BAR[selected.priority] }}/>
                  </div>
                  {dim.evidence.length > 0 && <p className="mt-1 text-xs leading-5 text-[var(--text-faint)]">{dim.evidence.join(" · ")}</p>}
                </div>)}
              </div>

              <div className="mt-4 grid gap-5 border-t border-[var(--border-soft)] pt-4 sm:grid-cols-2">
                <BulletSection title="Positive signals" items={selected.scoreReasons}/>
                <div>
                  <h4 className="eyebrow">Missing information</h4>
                  {selected.scoreDetail.missing.length ? <ul className="mt-2 space-y-1.5">{selected.scoreDetail.missing.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-[var(--text-muted)]"><CircleAlert size={14} className="mt-1 shrink-0 text-[var(--warm-fg)]"/><span>{item}</span></li>)}</ul> : <p className="mt-2 text-sm text-[var(--text-faint)]">No critical qualification gaps recorded.</p>}
                </div>
              </div>
              <p className="mt-4 border-t border-[var(--border-soft)] pt-3 text-xs leading-5 text-[var(--text-faint)]">{PRIORITY_NOTE}</p>
            </section>}

            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold">Analysis</h2>
                  {busy === "analyze" ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]"><Loader2 size={12} className="animate-spin"/>Analyzing…</span> : !selected.analysis ? <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Not run yet</span> : <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--positive-strong)]"><Check size={13}/>Ready</span>}
                </div>
                <button disabled={!!busy} onClick={() => void analyze(selected)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-input)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-text)] transition hover:bg-[var(--hover)] disabled:opacity-60"><RefreshCw size={13} className={busy === "analyze" ? "animate-spin" : ""}/>{selected.analysis ? "Refresh" : "Run analysis"}</button>
              </div>

              {busy === "analyze" && !selected.analysis ? <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-dashed border-[var(--border-input)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]"><Loader2 size={16} className="animate-spin"/>Analyzing this lead…</div>
                : selected.analysis ? <div className="mt-4 space-y-5">
                  <p className="text-[15px] leading-6 text-[var(--text-soft)]">{selected.analysis.summary}</p>

                  <div className="rounded-lg border-l-2 border-[var(--brand)] bg-[var(--accent-soft)] p-4 pl-3.5">
                    <h3 className="eyebrow text-[var(--brand-text)]">Recommended next action</h3>
                    <p className="mt-1.5 text-sm font-semibold leading-6">{selected.analysis.nextAction}</p>
                  </div>

                  <div><h3 className="eyebrow">Buying intent</h3><p className="mt-1.5 text-sm leading-6 text-[var(--text-soft)]">{selected.analysis.intent}</p><p className="mt-1.5 text-xs text-[var(--text-muted)]">Intent strength · <span className="font-semibold text-[var(--text-soft)]">{selected.analysis.intentStrength}</span></p></div>

                  <div className="border-t border-[var(--border-soft)] pt-4">
                    <div className="flex items-center justify-between gap-3"><h3 className="eyebrow">Suggested reply</h3><button onClick={() => copy(selected.analysis!.suggestedReply)} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-semibold text-[var(--brand-text)] transition hover:bg-[var(--hover)]"><Copy size={12}/> Copy</button></div>
                    <p className="mt-2 border-l-2 border-[var(--brand)] bg-[var(--surface-muted)] p-3 pl-4 text-sm leading-6 text-[var(--text-soft)]">{selected.analysis.suggestedReply}</p>
                    <p className="mt-1.5 text-xs leading-5 text-[var(--text-faint)]">{selected.analysis.confidenceNote}</p>
                  </div>

                  <div className="grid gap-5 border-t border-[var(--border-soft)] pt-4 sm:grid-cols-2">
                    <BulletSection title="Known facts" items={selected.analysis.knownFacts?.length ? selected.analysis.knownFacts : selected.analysis.requirements}/>
                    <BulletSection title="Inferences" items={selected.analysis.inferences ?? []}/>
                    <BulletSection title="Unknowns to clarify" items={selected.analysis.unknowns ?? []}/>
                    <BulletSection title="Deal risks" items={selected.analysis.dealRisks?.length ? selected.analysis.dealRisks : selected.analysis.concerns}/>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-soft)] pt-4">
                    <button onClick={() => document.getElementById("copilot")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-input)] px-3.5 py-2 text-xs font-semibold text-[var(--text-soft)] transition hover:bg-[var(--hover)]"><MessageCircle size={14}/> Ask about this lead</button>
                  </div>
                </div> : <div className="mt-4 flex flex-col items-start gap-3 rounded-lg border border-dashed border-[var(--border-input)] bg-[var(--surface-muted)] p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-[var(--brand-text)]"/>No analysis yet</div><p className="text-sm leading-6 text-[var(--text-muted)]">Run the analysis to get a summary, a recommended next action, and a suggested reply for this lead.</p><button disabled={!!busy} onClick={() => void analyze(selected)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-3.5 py-2 text-xs font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)] disabled:opacity-60"><Sparkles size={14}/>Run analysis</button></div>}
            </section>

            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-3.5">
                <div className="flex items-center gap-2.5"><PhoneCall size={16} className="text-[var(--brand-text)]"/><div><h2 className="text-sm font-bold">Call brief</h2><p className="text-xs text-[var(--text-muted)]">A quick prep sheet grounded in this lead.</p></div></div>
                {selected.callBrief && <button onClick={() => copy([selected.callBrief!.objective, selected.callBrief!.openingLine, ...selected.callBrief!.talkingPoints].join("\n"))} aria-label="Copy call brief" title="Copy call brief" className="text-[var(--text-muted)] transition hover:text-[var(--brand-text)]"><Copy size={14}/></button>}
              </div>
              {!selected.callBrief ? <div className="flex flex-col items-start gap-3 px-5 py-5"><p className="text-sm leading-6 text-[var(--text-muted)]">Generate an objective, opening line, talking points, and questions to run a sharper sales call.</p><button disabled={!!busy} onClick={() => void createBrief()} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-input)] px-3.5 py-2 text-xs font-semibold text-[var(--text-soft)] transition hover:bg-[var(--hover)] disabled:opacity-60">{busy === "brief" ? <Loader2 size={14} className="animate-spin"/> : <PhoneCall size={14}/>}{busy === "brief" ? "Preparing…" : "Generate call brief"}</button></div>
                : <div className="px-5 py-4">
                  <p className="text-sm leading-6 text-[var(--text-soft)]">{selected.callBrief.objective}</p>
                  <h3 className="eyebrow mt-4">Opening line</h3>
                  <p className="mt-1.5 border-l-2 border-[var(--brand)] pl-3 text-sm leading-6 text-[var(--text-soft)]">{selected.callBrief.openingLine}</p>
                  <div className="mt-4 grid gap-5 border-t border-[var(--border-soft)] pt-4 sm:grid-cols-3"><BulletSection title="Talking points" items={selected.callBrief.talkingPoints}/><BulletSection title="Questions" items={selected.callBrief.questions}/><BulletSection title="Watch out for" items={selected.callBrief.watchOutFor}/></div>
                </div>}
            </section>

            <section id="copilot" className="panel scroll-mt-20 overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-[var(--border-soft)] px-5 py-3.5"><Bot size={16} className="text-[var(--brand-text)]"/><div><h2 className="text-sm font-bold">Sales copilot</h2><p className="text-xs text-[var(--text-muted)]">Grounded in {selected.name}&apos;s enquiry{selected.analysis ? " and analysis" : ""}</p></div></div>
              <div className="max-h-[360px] space-y-3.5 overflow-y-auto p-5">
                {!selected.chat.length && <div className="space-y-3"><p className="text-sm leading-6 text-[var(--text-muted)]">Ask a follow-up about {selected.name} — how to open the call, how to handle an objection, or how to tighten the suggested reply.</p><div className="flex flex-wrap gap-2">{COPILOT_PROMPTS.map((prompt) => <button key={prompt} onClick={() => setQuestion(prompt)} className="rounded-full border border-[var(--border-input)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]">{prompt}</button>)}</div></div>}
                {selected.chat.map((message) => <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "rounded-br-sm bg-[var(--ink-solid)] text-[var(--on-ink)]" : "rounded-bl-sm bg-[var(--surface-muted)] text-[var(--text-soft)]"}`}>{message.content}</div></div>)}
                {busy === "chat" && <div className="flex justify-start"><div className="inline-flex items-center gap-2 rounded-xl rounded-bl-sm bg-[var(--surface-muted)] px-3.5 py-2.5 text-sm text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin"/>Thinking…</div></div>}
              </div>
              <form onSubmit={sendQuestion} className="border-t border-[var(--border-soft)] p-4">
                <label htmlFor="copilot-question" className="sr-only">Ask about this lead</label>
                <div className="flex items-end gap-2 rounded-xl border border-[var(--border-input)] bg-[var(--surface-inset)] p-1.5 transition focus-within:border-[var(--border-strong)] focus-within:ring-4 focus-within:ring-[var(--focus-ring)]">
                  <textarea id="copilot-question" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} rows={2} placeholder="Ask about this lead…" className="max-h-28 min-h-[40px] flex-1 resize-y bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-[var(--text-faint)]"/>
                  <button disabled={!question.trim() || !!busy} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--brand)] text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)] disabled:opacity-50"><Send size={15}/></button>
                </div>
                <p className="mt-2 px-1 text-[11px] text-[var(--text-faint)]">Enter to send · Shift+Enter for a new line</p>
              </form>
            </section>
          </div> : <div className="panel grid place-items-center border-dashed p-12 text-center"><div className="flex flex-col items-center gap-3"><Inbox size={24} className="text-[var(--text-faint)]"/><div><p className="text-sm font-semibold">No lead selected</p><p className="mt-0.5 text-sm text-[var(--text-muted)]">Add a lead to start your pipeline.</p></div></div></div>}
        </div>
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

      <footer className="border-t border-[var(--border)] px-5 py-5 text-center text-xs text-[var(--text-faint)]">Demo data is illustrative. Scores are heuristic, not a guarantee of conversion.</footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div><dt className="eyebrow">{label}</dt><dd className="mt-0.5 text-lg font-bold tabular-nums tracking-tight">{value}</dd></div>;
}
const inputClass = "mt-2 w-full rounded-lg border border-[var(--border-input)] bg-[var(--surface-inset)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--border-strong)] focus:ring-4 focus:ring-[var(--focus-ring)]";
function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) { return <div><label htmlFor={htmlFor} className="field-label">{label}</label>{children}{error && <p className="mt-1.5 text-xs text-[var(--danger-fg)]">{error}</p>}</div>; }
function PriorityBadge({ priority }: { priority: Priority }) { return <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[priority]}`}>{priority === "Act Now" && <Flame size={11}/>}{priority}</span>; }
function BulletSection({ title, items }: { title: string; items: string[] }) { return <div><h4 className="eyebrow">{title}</h4>{items.length ? <ul className="mt-2 space-y-1.5">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-[var(--text-soft)]"><Check size={14} className="mt-1 shrink-0 text-[var(--positive-strong)]"/><span>{item}</span></li>)}</ul> : <p className="mt-2 text-sm text-[var(--text-faint)]">None identified.</p>}</div>; }
