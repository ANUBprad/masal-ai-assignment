"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, Bot, Check, ChevronDown, CircleHelp,
  Clock3, Flame, Home, LayoutDashboard, MessageCircle, Plus,
  Search, Send, Sparkles, Target, Users, X, Zap, PhoneCall, RefreshCw,
  Copy, Trash2, Filter, Building2, MapPin, Wallet, CalendarDays, Sun, Moon
} from "lucide-react";
import type { ChatMessage, Lead, LeadInput, LeadStatus, Priority } from "@/types/lead";
import { BUYING_TIMELINES } from "@/types/lead";
import { scoreLead } from "@/lib/scoring";

const STORAGE_KEY = "masal-ai-leads-v1";
const THEME_KEY = "masal-ai-theme";
const DEMO_LEADS: Lead[] = [
  {
    id: "demo-1", name: "Priya Sharma", location: "Whitefield, Bengaluru",
    propertyRequirement: "3 BHK apartment, gated community", budget: "₹1.2–1.5 Cr",
    timeline: "Within 30 days", message: "Hi, we're looking for a 3 BHK near Whitefield because our office is moving there next month. Budget is around 1.4 crore. We have loan pre-approval and would like to visit a few ready-to-move options this weekend.",
    createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString(), updatedAt: new Date().toISOString(),
    score: 92, priority: "Hot", scoreReasons: ["Near-term buying timeline", "Asked about a property visit", "Mentioned financing or loan approval"],
    status: "Visit scheduled", chat: [], analysis: {
      summary: "A motivated buyer seeking a ready-to-move 3 BHK near Whitefield ahead of an office relocation next month.",
      intent: "High intent: defined budget, financing pre-approval, and a specific visit request.",
      requirements: ["3 BHK in a gated community", "Near Whitefield", "Ready-to-move options", "Budget around ₹1.4 Cr"],
      concerns: ["Availability for the requested weekend is not confirmed", "Commute and exact preferred micro-location need clarification"],
      nextAction: "Shortlist 2–3 verified ready-to-move options and confirm a weekend visit slot.",
      suggestedReply: "Hi Priya, thanks for sharing those details. I’ll shortlist ready-to-move 3 BHK options around Whitefield within your budget. Could you share your preferred move-in date and any must-have amenities? I’ll then suggest suitable options and coordinate a visit.",
      intentStrength: "Strong", confidenceNote: "Based on the stated budget, financing pre-approval, near-term move, and explicit visit request."
    }
  },
  {
    id: "demo-2", name: "Rahul Mehta", location: "Sarjapur Road, Bengaluru",
    propertyRequirement: "2 BHK apartment with amenities", budget: "₹75–90 L",
    timeline: "1–3 months", message: "I'm comparing a few projects in Sarjapur. Can you send floor plans and maintenance details? Still deciding whether to buy now or later.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), updatedAt: new Date().toISOString(),
    score: 61, priority: "Warm", scoreReasons: ["Defined buying window", "Budget provided", "Property requirement specified"],
    status: "Contacted", chat: [], analysis: {
      summary: "A comparison-stage buyer researching 2 BHK options and recurring costs around Sarjapur Road.",
      intent: "Moderate intent: actively comparing projects but timing is not final.",
      requirements: ["2 BHK", "Sarjapur Road area", "Floor plans", "Maintenance cost clarity"],
      concerns: ["Purchase timing is undecided", "Total cost of ownership needs clarification"],
      nextAction: "Send verified floor plans and a transparent cost breakdown; schedule a short discovery call.",
      suggestedReply: "Hi Rahul, happy to help. I can share the available floor plans along with the maintenance and other recurring costs so you can compare options clearly. Is there a particular possession timeline or amenity that's most important to you?",
      intentStrength: "Moderate", confidenceNote: "The lead is engaged in comparison but has not committed to a purchase date."
    }
  },
  {
    id: "demo-3", name: "Ananya Rao", location: "North Bengaluru",
    propertyRequirement: "Villa or plot, flexible", budget: "Not decided",
    timeline: "Just exploring / no rush", message: "Just starting to look around. Curious about the difference between buying a plot and a villa. No urgency at the moment.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), updatedAt: new Date().toISOString(),
    score: 27, priority: "Cold", scoreReasons: ["Exploratory timeline"],
    status: "New", chat: [], analysis: {
      summary: "An early-stage prospect exploring villa versus plot ownership in North Bengaluru with no fixed timeline.",
      intent: "Low immediate intent; education and light nurturing are more appropriate than hard selling.",
      requirements: ["Understand villa versus plot trade-offs", "Explore North Bengaluru"],
      concerns: ["Budget and timeline are unknown", "Property type remains undecided"],
      nextAction: "Share a neutral comparison guide and ask permission to follow up in a few weeks.",
      suggestedReply: "Hi Ananya, happy to help you explore both options. A villa offers a more ready-to-use home, while a plot can offer more flexibility but needs additional planning. I can share a simple comparison of costs, upkeep, and timelines to help you decide at your own pace.",
      intentStrength: "Weak", confidenceNote: "The customer explicitly described the enquiry as exploratory and low urgency."
    }
  }
];

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
  const [notice, setNotice] = useState("");
  const [question, setQuestion] = useState("");
  const [form, setForm] = useState<LeadInput>({
    name: "", location: "", propertyRequirement: "", budget: "", timeline: "Within 30 days", message: ""
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Lead[];
        if (Array.isArray(saved) && saved.length) {
          setLeads(saved);
          setSelectedId(saved[0].id);
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
  const hotCount = leads.filter((lead) => lead.priority === "Hot").length;
  const avgScore = leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length) : 0;

  function updateLead(id: string, patch: Partial<Lead>) {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ...patch, updatedAt: new Date().toISOString() } : lead));
  }
  async function analyze(lead: Lead) {
    setBusy("analyze"); setNotice("");
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lead }), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      updateLead(lead.id, { analysis: data.analysis });
      setNotice("Lead analysis refreshed.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not analyze this lead."); }
    finally { setBusy(""); }
  }
  async function createLead(event: React.FormEvent) {
    event.preventDefault();
    const scoring = scoreLead(form);
    const lead: Lead = {
      ...form, id: makeId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      score: scoring.score, priority: scoring.priority, scoreReasons: scoring.reasons,
      status: "New", chat: [], analysis: {
        summary: "Analysis is ready to run. Review the customer message and generate an AI assessment.",
        intent: "Not yet analyzed", requirements: [], concerns: [], nextAction: "Run AI analysis to identify the next best action.",
        suggestedReply: "Generate an analysis to draft a tailored customer response.",
        intentStrength: "Weak", confidenceNote: "This is a rule-based initial score until AI analysis is run."
      }
    };
    setLeads((current) => [lead, ...current]);
    setSelectedId(lead.id);
    setShowForm(false);
    setForm({ name: "", location: "", propertyRequirement: "", budget: "", timeline: "Within 30 days", message: "" });
    void analyze(lead);
  }
  async function sendQuestion(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !question.trim() || busy) return;
    const prompt = question.trim();
    const userMessage: ChatMessage = { id: makeId(), role: "user", content: prompt, createdAt: new Date().toISOString() };
    const history = [...selected.chat, userMessage];
    updateLead(selected.id, { chat: history });
    setQuestion(""); setBusy("chat"); setNotice("");
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
      setNotice(error instanceof Error ? error.message : "Could not get an answer.");
      setLeads((current) => current.map((lead) => lead.id === selected.id ? { ...lead, chat: history.slice(0, -1) } : lead));
    } finally { setBusy(""); }
  }
  async function createBrief() {
    if (!selected) return;
    setBusy("brief"); setNotice("");
    try {
      const response = await fetch("/api/call-brief", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lead: selected }), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create call brief.");
      updateLead(selected.id, { callBrief: data.brief });
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not create call brief."); }
    finally { setBusy(""); }
  }
  function copy(text: string) {
    void navigator.clipboard?.writeText(text).then(() => setNotice("Copied to clipboard.")).catch(() => setNotice("Clipboard access was unavailable."));
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
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--ink-solid)] text-[var(--lime)]"><Sparkles size={20}/></div>
            <div><p className="font-bold tracking-tight">masal<span className="text-[var(--brand-text)]">.ai</span></p><p className="text-[10px] uppercase tracking-[.17em] text-[var(--text-faint)]">Lead intelligence</p></div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-muted)] md:flex"><span>AI powered</span></div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]">{theme === "dark" ? <Sun size={16}/> : <Moon size={16}/>}</button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--brand-text)]">AM</div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-72px)] border-r border-[var(--border)] bg-[var(--surface)] p-5 lg:flex lg:flex-col">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--text-faint)]">Workspace</p>
          <div className="flex items-center gap-3 rounded-xl bg-[var(--accent-soft)] px-3 py-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface)] text-[var(--brand-text)]"><Building2 size={18}/></div><div><p className="text-xs font-bold">Bengaluru Realty</p><p className="mt-0.5 text-[10px] text-[var(--text-faint)]">Sales workspace</p></div><ChevronDown size={14} className="ml-auto text-[var(--text-faint)]"/></div>
          <nav className="mt-8 space-y-1">
            <div className="flex items-center gap-3 rounded-xl bg-[var(--ink-solid)] px-3 py-3 text-sm font-semibold text-[var(--on-brand)]"><LayoutDashboard size={17}/> Lead overview <span className="ml-auto rounded-md bg-[var(--surface)]/10 px-2 py-0.5 text-[10px]">{leads.length}</span></div>
            <button onClick={() => setPriorityFilter(priorityFilter === "Hot" ? "All" : "Hot")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"><Flame size={17}/> Hot leads <span className="ml-auto text-xs">{hotCount}</span></button>
            <button onClick={() => setShowForm(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"><Plus size={17}/> Add a lead</button>
          </nav>
          <div className="mt-auto rounded-2xl bg-[var(--surface-muted)] p-4">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-[var(--lime)] text-[var(--on-lime)]"><Zap size={17}/></div>
            <p className="text-sm font-bold">A better next move</p><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">AI turns enquiry context into practical sales actions.</p>
          </div>
        </aside>

        <section className="min-w-0 p-5 sm:p-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-faint)]"><span>Workspace</span><span>/</span><span className="font-semibold text-[var(--text-soft)]">Lead overview</span></div><h1 className="text-3xl font-bold tracking-[-.045em] sm:text-[38px]">Good morning, Anubhab <span>✳</span></h1><p className="mt-2 text-sm text-[var(--text-muted)]">Here&apos;s what your pipeline is telling you today.</p></div>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-bold text-[var(--on-brand)] shadow-sm transition hover:bg-[var(--brand-strong)]"><Plus size={17}/> Add new lead</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total leads" value={String(leads.length).padStart(2, "0")} sub="Saved in your workspace" icon={<Users size={18}/>} />
            <StatCard title="High priority" value={String(hotCount).padStart(2, "0")} sub="Ready for timely follow-up" icon={<Flame size={18}/>} accent />
            <StatCard title="Pipeline score" value={`${avgScore}%`} sub="Average rule-based score" icon={<Activity size={18}/>} />
            <StatCard title="Visit scheduled" value={String(leads.filter((lead) => lead.status === "Visit scheduled").length).padStart(2, "0")} sub="Leads moving forward" icon={<CalendarDays size={18}/>} />
          </div>

          <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(330px,.88fr)_minmax(0,1.42fr)]">
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between border-b border-[var(--border-soft)] p-5">
                <div><h2 className="font-bold">Lead pipeline</h2><p className="mt-1 text-xs text-[var(--text-faint)]">Ranked by buying signals</p></div>
                <button onClick={() => { setSearch(""); setPriorityFilter("All"); }} className="rounded-lg p-2 text-[var(--text-faint)] hover:bg-[var(--hover)]" aria-label="Reset filters"><RefreshCw size={15}/></button>
              </div>
              <div className="space-y-3 border-b border-[var(--border-soft)] p-4">
                <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[var(--border-strong)]"/></div>
                <div className="flex items-center gap-2"><Filter size={14} className="text-[var(--text-faint)]"/>{(["All", "Hot", "Warm", "Cold"] as const).map((item) => <button key={item} onClick={() => setPriorityFilter(item)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${priorityFilter === item ? "bg-[var(--ink-solid)] text-[var(--on-brand)]" : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>{item}</button>)}</div>
              </div>
              <div className="max-h-[680px] space-y-1 overflow-y-auto p-2">
                {filteredLeads.map((lead) => <button key={lead.id} onClick={() => setSelectedId(lead.id)} className={`w-full rounded-xl border p-4 text-left transition ${selectedId === lead.id ? "border-[var(--border-strong)] bg-[var(--accent-soft)]" : "border-transparent hover:bg-[var(--surface-muted)]"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold ${lead.priority === "Hot" ? "bg-[var(--hot-bg)] text-[var(--hot-fg)]" : lead.priority === "Warm" ? "bg-[var(--warm-bg)] text-[var(--warm-fg)]" : "bg-[var(--cold-bg)] text-[var(--cold-fg)]"}`}>{lead.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold">{lead.name}</p><PriorityBadge priority={lead.priority}/></div><p className="mt-1 truncate text-xs text-[var(--text-faint)]">{lead.propertyRequirement}</p><div className="mt-3 flex items-center gap-3 text-[10px] text-[var(--text-faint)]"><span className="inline-flex items-center gap-1"><MapPin size={11}/>{lead.location.split(",")[0]}</span><span className="inline-flex items-center gap-1"><Clock3 size={11}/>{lead.timeline}</span></div></div>
                    <div className="text-right"><p className="text-lg font-extrabold tracking-tight">{lead.score}</p><p className="text-[9px] text-[var(--text-faint)]">SCORE</p></div>
                  </div>
                  <div className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--border-soft)]"><div className={`h-full rounded-full ${lead.priority === "Hot" ? "bg-[var(--hot-bar)]" : lead.priority === "Warm" ? "bg-[var(--warm-bar)]" : "bg-[var(--cold-bar)]"}`} style={{ width: `${lead.score}%` }}/></div>
                </button>)}
                {!filteredLeads.length && <div className="p-8 text-center text-sm text-[var(--text-faint)]">No leads match these filters.</div>}
              </div>
              <div className="border-t border-[var(--border-soft)] p-4 text-center text-[10px] text-[var(--text-faint)]">Scores are heuristics, not a guarantee of conversion.</div>
            </section>

            {selected ? <section className="min-w-0 space-y-5">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-sm font-extrabold text-[var(--brand-text)]">{selected.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold tracking-tight">{selected.name}</h2><PriorityBadge priority={selected.priority}/></div><p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-faint)]"><MapPin size={12}/>{selected.location}</p></div></div>
                  <div className="flex items-center gap-2"><select value={selected.status} onChange={(e) => updateLead(selected.id, { status: e.target.value as LeadStatus })} className="max-w-[145px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[11px] font-semibold outline-none">{STATUSES.map((status) => <option key={status}>{status}</option>)}</select><button onClick={() => removeLead(selected.id)} title="Remove lead" className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-faint)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)]"><Trash2 size={15}/></button></div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <InfoTile icon={<Home size={15}/>} label="Requirement" value={selected.propertyRequirement}/>
                  <InfoTile icon={<Wallet size={15}/>} label="Budget" value={selected.budget}/>
                  <InfoTile icon={<CalendarDays size={15}/>} label="Timeline" value={selected.timeline}/>
                </div>
                <div className="mt-5 rounded-xl bg-[var(--surface-muted)] p-4"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--text-faint)]">Customer message</p><button onClick={() => copy(selected.message)} className="text-[var(--text-faint)] hover:text-[var(--brand-text)]" title="Copy message"><Copy size={13}/></button></div><p className="text-sm leading-6 text-[var(--text-soft)]">“{selected.message}”</p></div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--brand-text)]"><Sparkles size={18}/></div><div><h3 className="font-bold">Lead intelligence</h3><p className="mt-0.5 text-[10px] text-[var(--text-faint)]">AI-generated assessment</p></div></div><button disabled={!!busy} onClick={() => void analyze(selected)} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-input)] px-3 py-2 text-xs font-bold text-[var(--brand-text)] hover:bg-[var(--hover)]"><RefreshCw size={13} className={busy === "analyze" ? "animate-spin" : ""}/>{busy === "analyze" ? "Analyzing…" : "Refresh analysis"}</button></div>
                <div className="mt-5 grid gap-5 sm:grid-cols-[1.15fr_.85fr]">
                  <div><p className="text-sm leading-6 text-[var(--text-soft)]">{selected.analysis.summary}</p><p className="mt-3 text-xs leading-5 text-[var(--text-faint)]">{selected.analysis.confidenceNote}</p>
                    <div className="mt-5 rounded-xl border border-[var(--border-soft)] p-4"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--text-faint)]">Customer intent</p><p className="mt-2 text-sm font-semibold leading-6">{selected.analysis.intent}</p><div className="mt-3 flex items-center justify-between text-[11px]"><span className="text-[var(--text-faint)]">Intent strength</span><span className="font-bold">{selected.analysis.intentStrength}</span></div></div>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-inset)] p-4"><div className="flex items-center gap-2 text-[var(--brand-text)]"><Target size={16}/><p className="text-xs font-bold">Recommended next action</p></div><p className="mt-3 text-sm font-semibold leading-6">{selected.analysis.nextAction}</p><div className="mt-4 flex flex-wrap gap-1.5">{selected.scoreReasons.slice(0,4).map((reason) => <span key={reason} className="rounded-md bg-[var(--surface)] px-2 py-1.5 text-[10px] text-[var(--text-muted)]">{reason}</span>)}</div></div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2"><BulletSection title="Key requirements" items={selected.analysis.requirements}/><BulletSection title="Objections & concerns" items={selected.analysis.concerns}/></div>
                <div className="mt-5 rounded-xl border border-[var(--border)] p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold">Suggested customer reply</p><button onClick={() => copy(selected.analysis.suggestedReply)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--brand-text)]"><Copy size={12}/> Copy</button></div><p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{selected.analysis.suggestedReply}</p></div>
                <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => void createBrief()} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink-solid)] px-4 py-3 text-xs font-bold text-[var(--on-brand)] hover:bg-[var(--brand-strong)]"><PhoneCall size={15}/>{busy === "brief" ? "Preparing…" : "Prepare call brief"}</button><button onClick={() => document.getElementById("copilot")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-input)] px-4 py-3 text-xs font-bold text-[var(--text-soft)] hover:bg-[var(--hover)]"><MessageCircle size={15}/> Ask AI copilot</button></div>
                {selected.callBrief && <div className="mt-5 rounded-xl border border-[var(--border-input)] bg-[var(--accent-soft)] p-4"><div className="flex items-center justify-between"><h4 className="font-bold">Call brief</h4><button onClick={() => copy([selected.callBrief!.objective, selected.callBrief!.openingLine, ...selected.callBrief!.talkingPoints].join("\n"))} className="text-[var(--brand-text)]"><Copy size={14}/></button></div><p className="mt-2 text-sm leading-6">{selected.callBrief.objective}</p><p className="mt-3 text-xs font-bold text-[var(--brand-text)]">Opening line</p><p className="mt-1 text-sm leading-6">{selected.callBrief.openingLine}</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><BulletSection title="Talking points" items={selected.callBrief.talkingPoints}/><BulletSection title="Questions to ask" items={selected.callBrief.questions}/><BulletSection title="Watch out for" items={selected.callBrief.watchOutFor}/></div></div>}
              </div>

              <div id="copilot" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center justify-between border-b border-[var(--border-soft)] p-5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--ink-solid)] text-[var(--lime)]"><Bot size={18}/></div><div><h3 className="font-bold">Sales copilot</h3><p className="mt-0.5 text-[10px] text-[var(--text-faint)]">Grounded in {selected.name}&apos;s lead context</p></div></div></div>
                <div className="max-h-[360px] space-y-4 overflow-y-auto p-5">
                  <div className="flex gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--brand-text)]"><Sparkles size={15}/></div><div className="max-w-[90%] rounded-xl rounded-tl-sm bg-[var(--surface-inset)] p-3.5 text-sm leading-6 text-[var(--text-soft)]">I’ve reviewed {selected.name}&apos;s enquiry. Ask me what to emphasize on the call, how to handle an objection, or how to refine the suggested reply.</div></div>
                  {selected.chat.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>{message.role === "assistant" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--brand-text)]"><Sparkles size={15}/></div>}<div className={`max-w-[85%] whitespace-pre-wrap rounded-xl p-3.5 text-sm leading-6 ${message.role === "user" ? "rounded-tr-sm bg-[var(--ink-solid)] text-[var(--on-brand)]" : "rounded-tl-sm bg-[var(--surface-inset)] text-[var(--text-soft)]"}`}>{message.content}</div></div>)}
                  {busy === "chat" && <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand)]"/> Thinking through the lead context…</div>}
                </div>
                <form onSubmit={sendQuestion} className="border-t border-[var(--border-soft)] p-4"><div className="flex items-end gap-2 rounded-xl border border-[var(--border-input)] bg-[var(--surface-inset)] p-2 focus-within:border-[var(--border-strong)]"><textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} rows={2} placeholder="Ask about this lead…" className="max-h-28 min-h-[42px] flex-1 resize-y bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[var(--text-faint)]"/><button disabled={!question.trim() || !!busy} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-strong)]"><Send size={16}/></button></div><p className="mt-2 px-1 text-[10px] text-[var(--text-faint)]">Enter to send · Shift+Enter for a new line</p></form>
              </div>
            </section> : <div className="rounded-2xl border border-dashed border-[var(--border-input)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--text-faint)]">Add a lead to start your pipeline.</div>}
          </div>
          {notice && <div role="status" className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-start gap-3 rounded-xl border border-[var(--border-input)] bg-[var(--surface)] px-4 py-3 text-sm shadow-xl"><span className="mt-0.5 text-[var(--brand-text)]"><CircleHelp size={16}/></span><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={15}/></button></div>}
        </section>
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay-bg)] p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><section role="dialog" aria-modal="true" aria-labelledby="new-lead-title" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-5 shadow-2xl sm:rounded-2xl sm:p-7"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--brand-text)]">New enquiry</p><h2 id="new-lead-title" className="text-xl font-bold tracking-tight">Add a lead for analysis</h2><p className="mt-1 text-xs leading-5 text-[var(--text-faint)]">Add the details you have. You can update the lead later.</p></div><button onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-[var(--hover)]"><X size={17}/></button></div><form onSubmit={createLead} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Customer name"><input required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Priya Sharma" className={inputClass}/></Field><Field label="Location"><input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Whitefield, Bengaluru" className={inputClass}/></Field><Field label="Property requirement"><input required value={form.propertyRequirement} onChange={(e) => setForm({ ...form, propertyRequirement: e.target.value })} placeholder="e.g. 3 BHK apartment" className={inputClass}/></Field><Field label="Budget"><input required value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="e.g. ₹1.2–1.5 Cr" className={inputClass}/></Field><Field label="Buying timeline"><select value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value as LeadInput["timeline"] })} className={inputClass}>{BUYING_TIMELINES.map((timeline) => <option key={timeline}>{timeline}</option>)}</select></Field></div><Field label="Customer message / enquiry"><textarea required minLength={5} rows={5} maxLength={10000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Paste the customer's enquiry or a short conversation…" className={inputClass}/></Field><div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-soft)] pt-4"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-[var(--border-input)] px-4 py-3 text-xs font-bold">Cancel</button><button className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-xs font-bold text-[var(--on-brand)]"><Sparkles size={15}/> Save and analyze</button></div></form></section></div>}

      <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-5 text-center text-[10px] text-[var(--text-faint)]">Masal AI · Lead intelligence for thoughtful real-estate sales · Demo data is illustrative</footer>
    </main>
  );
}

const inputClass = "mt-2 w-full rounded-xl border border-[var(--border-input)] bg-[var(--surface-inset)] px-3.5 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:ring-4 focus:ring-[var(--focus-ring)]";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-[var(--text-soft)]">{label}{children}</label>; }
function StatCard({ title, value, sub, icon, accent = false }: { title: string; value: string; sub: string; icon: React.ReactNode; accent?: boolean }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-[var(--text-muted)]">{title}</p><span className={`grid h-9 w-9 place-items-center rounded-xl ${accent ? "bg-[var(--hot-bg)] text-[var(--hot-fg)]" : "bg-[var(--surface-muted)] text-[var(--positive)]"}`}>{icon}</span></div><div className="mt-4 flex items-end justify-between"><p className="text-3xl font-extrabold tracking-[-.04em]">{value}</p><span className="mb-1 inline-flex items-center gap-1 text-[10px] text-[var(--text-faint)]"><ArrowDownRight size={12}/>{sub}</span></div></div>; }
function PriorityBadge({ priority }: { priority: Priority }) { const styles = { Hot: "bg-[var(--hot-bg)] text-[var(--hot-fg)]", Warm: "bg-[var(--warm-bg)] text-[var(--warm-fg)]", Cold: "bg-[var(--cold-bg)] text-[var(--cold-fg)]" }; return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.08em] ${styles[priority]}`}>{priority === "Hot" && <Flame size={10} />}{priority}</span>; }
function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="min-w-0 rounded-xl border border-[var(--border-soft)] p-3"><div className="flex items-center gap-1.5 text-[var(--text-faint)]">{icon}<span className="text-[10px] font-semibold">{label}</span></div><p className="mt-2 line-clamp-2 text-xs font-bold leading-5">{value}</p></div>; }
function BulletSection({ title, items }: { title: string; items: string[] }) { return <div><p className="mb-3 text-[10px] font-bold uppercase tracking-[.15em] text-[var(--text-faint)]">{title}</p>{items.length ? <ul className="space-y-2">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-xs leading-5 text-[var(--text-soft)]"><Check size={13} className="mt-1 shrink-0 text-[var(--positive-strong)]"/><span>{item}</span></li>)}</ul> : <p className="text-xs text-[var(--text-faint)]">No items identified yet.</p>}</div>; }
