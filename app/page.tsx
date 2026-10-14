"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, Copy, Filter, Flame, Home, LoaderCircle, MapPin, MessageCircle, Plus, Search, Send, Sparkles, Target, TrendingUp, Users, WandSparkles, X } from "lucide-react";
import { scoreLead } from "@/lib/scoring";
import type { ChatMessage, Lead, LeadAnalysis, LeadInput, LeadPriority, LeadStatus } from "@/types/lead";

const STORAGE_KEY = "masal-leads-v1";
const blankForm: LeadInput = { name: "", location: "", propertyRequirement: "", budget: "", timeline: "Within 1–3 months", message: "" };

function buildLead(input: LeadInput, analysis: LeadAnalysis | null = null): Lead {
  const scored = scoreLead(input, analysis);
  return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "New", analysis, priorityScore: scored.score, priority: scored.priority, scoreReasons: scored.reasons };
}

const demoLeads: Lead[] = [
  buildLead({ name: "Priya Sharma", location: "Whitefield, Bengaluru", propertyRequirement: "3 BHK apartment, gated community, near metro and international school", budget: "INR 1.4–1.7 Cr", timeline: "Within 2–4 weeks", message: "Hi, we're relocating to Bengaluru in six weeks. We've shortlisted Whitefield and need a 3 BHK with good school access. Could we schedule a site visit this Saturday? Please share floor plans and possession details." }, { summary: "A relocating family has shortlisted Whitefield and wants a 3 BHK with school access. They are ready to move quickly and have asked to schedule a site visit.", intent: "High purchase intent; the customer is comparing specific locations and asking for a visit.", keyRequirements: ["3 BHK in a gated community", "Near metro and international school", "Floor plans and possession details"], objections: ["Needs confirmation of school access", "Possession timing must fit relocation"], nextAction: "Call today and offer two Saturday site-visit slots. Send floor plans and verified possession details.", suggestedReply: "Hi Priya, thanks for sharing your requirements. I can arrange a Saturday visit for a few 3 BHK options in Whitefield and send floor plans with confirmed possession timelines. Would 11 AM or 3 PM work better?", intentStrength: "Strong", confidenceNote: "Timeline and visit request are explicit; confirm the exact move-in date and preferred projects." }),
  buildLead({ name: "Rahul Mehta", location: "Sarjapur Road, Bengaluru", propertyRequirement: "2 BHK apartment with clubhouse and parking", budget: "INR 85 lakh–1 Cr", timeline: "Within 1–3 months", message: "I'm comparing a few 2 BHK projects around Sarjapur. Can you share the full cost including registration, maintenance and parking? I also want to understand the home loan process." }, { summary: "The customer is comparing 2 BHK projects and needs transparent total cost and financing information.", intent: "Consideration-stage buyer seeking financial clarity before shortlisting.", keyRequirements: ["2 BHK near Sarjapur", "Clubhouse and parking", "All-inclusive cost breakdown", "Home loan guidance"], objections: ["Potential concern about hidden costs", "Needs clarity on financing"], nextAction: "Share a line-item cost sheet and offer a short call to walk through loan eligibility.", suggestedReply: "Hi Rahul, happy to help. I'll put together an itemized cost estimate covering registration, parking and maintenance, along with the available loan options. Is there a convenient time today for a quick walkthrough?", intentStrength: "Moderate", confidenceNote: "Budget is defined, though no visit or purchase deadline has been requested." }),
  buildLead({ name: "Sneha Rao", location: "Electronic City, Bengaluru", propertyRequirement: "Apartment, 2 or 3 BHK; open to options", budget: "Not decided", timeline: "Just exploring", message: "Hello, just checking what kind of flats are available in Electronic City. Not sure about budget yet, would like to understand prices." }, { summary: "An early-stage customer is exploring apartment availability and price ranges without a settled budget.", intent: "Initial research; the next useful step is understanding needs and budget comfort.", keyRequirements: ["Apartment in Electronic City", "Compare 2 and 3 BHK options", "Understand entry-level pricing"], objections: ["Budget is not yet defined", "Requirements are broad"], nextAction: "Send a concise price-range guide and ask two qualifying questions before recommending projects.", suggestedReply: "Hi Sneha, I can share a quick overview of current 2 and 3 BHK options in Electronic City. To make it relevant, are you looking mainly for self-use or investment, and is there a comfortable monthly budget range you'd like me to work within?", intentStrength: "Weak", confidenceNote: "The customer describes the inquiry as exploratory; budget and purpose remain unknown." })
];

const priorityStyle: Record<LeadPriority, string> = {
  Hot: "bg-[#fff0e8] text-[#bd5934] border-[#f7d9c8]",
  Warm: "bg-[#fff7dc] text-[#98741c] border-[#f0e4b1]",
  Cold: "bg-[#edf1ed] text-[#67746a] border-[#e0e6e0]"
};
const statusStyle: Record<LeadStatus, string> = {
  New: "bg-[#edf4ed] text-[#3e684a]",
  Contacted: "bg-[#edf2fa] text-[#4568a0]",
  Qualified: "bg-[#f2edfa] text-[#7653a5]",
  Closed: "bg-[#eeeeee] text-[#666666]"
};

export default function HomePage() {
  const [leads, setLeads] = useState<Lead[]>(demoLeads);
  const [selectedId, setSelectedId] = useState(demoLeads[0].id);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"All" | LeadPriority>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | LeadStatus>("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<LeadInput>(blankForm);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatByLead, setChatByLead] = useState<Record<string, ChatMessage[]>>({});
  const [chatLoading, setChatLoading] = useState(false);
  const [callBrief, setCallBrief] = useState<{ opening: string; questions: string[]; objection: string; closingQuestion: string } | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"Overview" | "Call prep" | "Copilot">("Overview");
  const [notice, setNotice] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Lead[];
        if (Array.isArray(parsed) && parsed.length) {
          setLeads(parsed);
          setSelectedId(parsed[0].id);
        }
      }
    } catch {
      setNotice("Saved browser data could not be read. Sample leads are still available.");
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch {
      setNotice("Browser storage is full. Remove older data before saving more leads.");
    }
  }, [leads, storageReady]);

  const selected = leads.find((lead) => lead.id === selectedId) ?? leads[0];
  const orderedLeads = useMemo(() => [...leads].sort((a, b) => b.priorityScore - a.priorityScore), [leads]);
  const visibleLeads = orderedLeads.filter((lead) => {
    const term = search.toLowerCase();
    return (!term || [lead.name, lead.location, lead.propertyRequirement].some((value) => value.toLowerCase().includes(term)))
      && (priorityFilter === "All" || lead.priority === priorityFilter)
      && (statusFilter === "All" || lead.status === statusFilter);
  });
  const hotCount = leads.filter((lead) => lead.priority === "Hot").length;
  const contactedCount = leads.filter((lead) => lead.status === "Contacted" || lead.status === "Qualified").length;

  function updateSelected(update: Partial<Lead>) {
    if (!selected) return;
    setLeads((current) => current.map((lead) => lead.id === selected.id ? { ...lead, ...update } : lead));
  }

  async function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnalyzing(true);
    setNotice("");
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The lead could not be analyzed.");
      const lead = buildLead(form, body.analysis as LeadAnalysis);
      setLeads((current) => [lead, ...current]);
      setSelectedId(lead.id);
      setForm(blankForm);
      setShowForm(false);
      setActiveTab("Overview");
      setNotice("Lead analyzed and saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function runAnalysisAgain() {
    if (!selected) return;
    setAnalyzing(true);
    setNotice("");
    try {
      const { name, location, propertyRequirement, budget, timeline, message } = selected;
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, location, propertyRequirement, budget, timeline, message }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not refresh the analysis.");
      const scored = scoreLead(selected, body.analysis as LeadAnalysis);
      updateSelected({ analysis: body.analysis, priorityScore: scored.score, priority: scored.priority, scoreReasons: scored.reasons });
      setNotice("Analysis refreshed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not refresh the analysis.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function sendChat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    const history = chatByLead[selected.id] ?? [];
    setChatByLead((current) => ({ ...current, [selected.id]: [...history, { role: "user", content: question }] }));
    setChatInput("");
    setChatLoading(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead: selected, history, question }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The copilot could not answer.");
      setChatByLead((current) => ({ ...current, [selected.id]: [...(current[selected.id] ?? []), { role: "assistant", content: body.answer }] }));
    } catch (error) {
      setChatByLead((current) => ({ ...current, [selected.id]: [...(current[selected.id] ?? []), { role: "assistant", content: error instanceof Error ? error.message : "Please try again." }] }));
    } finally {
      setChatLoading(false);
    }
  }

  async function generateCallBrief() {
    if (!selected) return;
    setBriefLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/call-brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead: selected }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not prepare the brief.");
      setCallBrief(body.brief);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not prepare the brief.");
    } finally {
      setBriefLoading(false);
    }
  }

  async function copyText(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice("Copied to clipboard."); }
    catch { setNotice("Clipboard access is unavailable in this browser."); }
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#e4e9e5] bg-[#fbfcf9]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-5 px-4 py-3 sm:px-7">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#183e32] text-[#d8f36a]"><Home size={21}/></div><div><div className="text-base font-bold tracking-[-.04em]">masal<span className="text-[#8c9b91]">.</span></div><div className="eyebrow mt-0.5">Lead intelligence</div></div></div>
          <div className="hidden items-center gap-2 rounded-full border border-[#e6ebe5] bg-white px-3 py-2 text-xs text-[#637067] sm:flex"><span className="dot"/><span>Sales workspace</span><span className="text-[#c2cbc3]">/</span><span>Today</span></div>
          <button onClick={() => { setShowForm(true); setNotice(""); }} className="btn-primary"><Plus size={16}/> Add new lead</button>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-7 sm:px-7 sm:pt-9">
        <section className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><div className="eyebrow mb-3 flex items-center gap-2"><Sparkles size={13}/> AI-assisted sales workspace</div><h1 className="max-w-3xl text-3xl font-semibold tracking-[-.055em] sm:text-4xl">Know who to call <span className="text-[#85948a]">next.</span></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#748077]">Turn incoming property inquiries into clear priorities and thoughtful next steps.</p></div>
          <div className="flex items-center gap-2 text-xs text-[#748077]"><span className="rounded-full bg-[#e9efe7] px-3 py-1.5 font-semibold text-[#426047]">{leads.length} leads in pipeline</span><span className="hidden sm:inline">Updated just now</span></div>
        </section>

        <section className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric icon={<Users size={17}/>} label="Total leads" value={leads.length} note="Across all statuses"/>
          <Metric icon={<Flame size={17}/>} label="Hot leads" value={hotCount} note="Prioritize these first" accent/>
          <Metric icon={<Target size={17}/>} label="Contacted / qualified" value={contactedCount} note="Progress in pipeline"/>
          <Metric icon={<TrendingUp size={17}/>} label="Need a next step" value={leads.filter((lead) => lead.status === "New").length} note="Waiting for first contact"/>
        </section>

        {notice && <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#dce6d7] bg-[#f1f6ed] px-4 py-3 text-sm text-[#3f6044]" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={15}/></button></div>}

        <section className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="surface overflow-hidden">
            <div className="border-b border-[#e9ede9] p-4">
              <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-bold">Lead pipeline</h2><p className="mt-1 text-xs text-[#849087]">Ranked by suggested priority</p></div><span className="rounded-lg bg-[#f3f5f1] px-2 py-1 text-xs text-[#69766c]">{visibleLeads.length} shown</span></div>
              <label className="relative block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e9a91]"/><input className="field pl-9 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search leads or locations..."/></label>
              <div className="mt-3 grid grid-cols-2 gap-2"><label className="relative"><Filter size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#879389]"/><select className="field appearance-none py-2 pl-8 pr-6 text-xs" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as "All" | LeadPriority)}><option value="All">All priorities</option><option>Hot</option><option>Warm</option><option>Cold</option></select></label><select className="field py-2 text-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | LeadStatus)}><option value="All">All statuses</option><option>New</option><option>Contacted</option><option>Qualified</option><option>Closed</option></select></div>
            </div>
            <div className="max-h-[680px] divide-y divide-[#edf0ed] overflow-y-auto">
              {visibleLeads.map((lead, index) => <button key={lead.id} onClick={() => { setSelectedId(lead.id); setCallBrief(null); setActiveTab("Overview"); }} className={`block w-full px-4 py-4 text-left transition-colors hover:bg-[#fafbf8] ${selected?.id === lead.id ? "bg-[#f4f7f0] shadow-[inset_3px_0_0_#55795b]" : ""}`}>
                <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="text-[10px] font-semibold text-[#9aa59c]">#{String(index + 1).padStart(2, "0")}</span><span className="truncate text-sm font-bold">{lead.name}</span></div><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityStyle[lead.priority]}`}>{lead.priority}</span></div>
                <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-[#768379]"><MapPin size={12}/>{lead.location}</p>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#849087]">{lead.analysis?.summary ?? lead.message}</p>
                <div className="mt-3 flex items-center justify-between gap-3"><span className={`rounded-md px-2 py-1 text-[10px] font-medium ${statusStyle[lead.status]}`}>{lead.status}</span><div className="flex items-center gap-2"><div className="h-1 w-12 overflow-hidden rounded-full bg-[#e9ede7]"><div className={`h-full rounded-full ${lead.priority === "Hot" ? "bg-[#d76d49]" : lead.priority === "Warm" ? "bg-[#d1ae36]" : "bg-[#97a49a]"}`} style={{ width: `${lead.priorityScore}%` }}/></div><span className="text-xs font-bold tabular-nums">{lead.priorityScore}</span></div></div>
              </button>)}
              {visibleLeads.length === 0 && <div className="p-8 text-center text-sm text-[#859087]">No leads match these filters.</div>}
            </div>
            <button onClick={() => setShowForm(true)} className="flex w-full items-center justify-center gap-2 border-t border-[#e9ede9] py-3.5 text-xs font-bold text-[#526b56] hover:bg-[#f6f8f3]"><Plus size={14}/> Add a lead</button>
          </aside>

          {selected ? <section className="min-w-0 space-y-5">
            <div className="surface p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><div className="mb-3 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${priorityStyle[selected.priority]}`}>{selected.priority} priority</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[selected.status]}`}>{selected.status}</span><span className="text-[11px] text-[#8c988e]">Added {new Date(selected.createdAt).toLocaleDateString()}</span></div><h2 className="text-2xl font-semibold tracking-[-.045em]">{selected.name}</h2><p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#79867c]"><span className="inline-flex items-center gap-1"><MapPin size={13}/>{selected.location}</span><span>·</span><span className="inline-flex items-center gap-1"><Home size={13}/>{selected.propertyRequirement}</span></p></div><div className="flex flex-wrap gap-2"><select aria-label="Lead status" value={selected.status} onChange={(event) => updateSelected({ status: event.target.value as LeadStatus })} className="field py-2.5 text-xs font-semibold">{["New","Contacted","Qualified","Closed"].map((status) => <option key={status}>{status}</option>)}</select><button className="btn-secondary" onClick={runAnalysisAgain} disabled={analyzing}><WandSparkles size={14}/>{analyzing ? "Analyzing..." : "Re-analyze"}</button></div></div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3"><InfoTile label="Budget" value={selected.budget}/><InfoTile label="Buying timeline" value={selected.timeline}/><InfoTile label="Priority score" value={`${selected.priorityScore} / 100`} detail="Rule-based estimate"/></div>
              <div className="mt-5 flex flex-wrap gap-1.5">{selected.scoreReasons.map((reason) => <span key={reason} className="rounded-md bg-[#f4f6f2] px-2 py-1.5 text-[10px] text-[#69766c]">{reason}</span>)}</div>
            </div>

            <div className="surface overflow-hidden">
              <div className="flex gap-1 border-b border-[#e9ede9] px-4 pt-3 sm:px-5">{(["Overview","Call prep","Copilot"] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`border-b-2 px-3 py-3 text-xs font-bold transition-colors ${activeTab === tab ? "border-[#234735] text-[#234735]" : "border-transparent text-[#8b968e] hover:text-[#516055]"}`}>{tab === "Call prep" ? <span className="inline-flex items-center gap-1.5"><Clock3 size={13}/>{tab}</span> : tab === "Copilot" ? <span className="inline-flex items-center gap-1.5"><MessageCircle size={13}/>{tab}</span> : tab}</button>)}</div>

              {activeTab === "Overview" && <div className="space-y-6 p-5 sm:p-6">
                {selected.analysis ? <>
                  <div><SectionHeading icon={<Sparkles size={15}/>} title="Lead intelligence" hint="AI-generated assessment"/><p className="mt-3 text-sm leading-6 text-[#526057]">{selected.analysis.summary}</p><p className="mt-2 text-xs leading-5 text-[#7c897f]">{selected.analysis.confidenceNote}</p></div>
                  <div className="grid gap-5 md:grid-cols-2"><div><div className="eyebrow mb-2">Customer intent</div><p className="text-sm leading-6 text-[#526057]">{selected.analysis.intent}</p><span className="mt-3 inline-flex rounded-md bg-[#f2f5ef] px-2.5 py-1 text-xs font-semibold text-[#596d58]">Intent: {selected.analysis.intentStrength}</span></div><div><div className="eyebrow mb-2">Recommended next action</div><p className="text-sm leading-6 text-[#526057]">{selected.analysis.nextAction}</p></div></div>
                  <div className="grid gap-5 md:grid-cols-2"><BulletSection title="Key requirements" items={selected.analysis.keyRequirements}/><BulletSection title="Objections & concerns" items={selected.analysis.objections}/></div>
                  <div className="rounded-xl border border-[#e0e8da] bg-[#f8faf5] p-4"><div className="flex items-center justify-between gap-3"><div className="eyebrow">Suggested customer reply</div><button className="btn-secondary !px-2.5 !py-1.5" onClick={() => copyText(selected.analysis!.suggestedReply)}><Copy size={12}/>Copy</button></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#45554a]">{selected.analysis.suggestedReply}</p></div>
                </> : <div className="py-8 text-center"><Sparkles className="mx-auto text-[#8da28e]" size={28}/><h3 className="mt-3 text-sm font-bold">No AI analysis yet</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#839087]">Analyze this lead to produce a summary, intent, concerns, next action and suggested reply.</p><button className="btn-primary mt-4" onClick={runAnalysisAgain} disabled={analyzing}>{analyzing ? <LoaderCircle size={14} className="animate-spin"/> : <WandSparkles size={14}/>}Analyze lead</button></div>}
                <div className="rounded-xl bg-[#f7f8f5] p-4"><div className="eyebrow">Original customer message</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#58645b]">{selected.message}</p></div>
              </div>}

              {activeTab === "Call prep" && <div className="p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><SectionHeading icon={<Clock3 size={15}/>} title="Call Prep Brief" hint="Your next conversation, planned"/><p className="mt-2 text-xs leading-5 text-[#7c897f]">A compact, lead-specific guide to keep beside you during the call.</p></div><button onClick={generateCallBrief} disabled={briefLoading} className="btn-primary shrink-0">{briefLoading ? <LoaderCircle size={14} className="animate-spin"/> : <Sparkles size={14}/>}Generate brief</button></div>
                {callBrief ? <div className="mt-6 space-y-5"><BriefBlock label="Suggested opening" content={callBrief.opening}/><div><div className="eyebrow">Discovery questions</div><div className="mt-3 space-y-2">{callBrief.questions.map((question, index) => <div key={question} className="flex gap-3 rounded-xl border border-[#e8ede7] p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#eff4e9] text-xs font-bold text-[#536b52]">{index + 1}</span><p className="text-sm leading-5 text-[#556258]">{question}</p></div>)}</div></div><BriefBlock label="Likely objection to address" content={callBrief.objection}/><BriefBlock label="Closing question" content={callBrief.closingQuestion}/><button className="btn-secondary" onClick={() => copyText([`Call prep — ${selected.name}`,callBrief.opening,...callBrief.questions,callBrief.objection,callBrief.closingQuestion].join("\n\n"))}><Copy size={13}/>Copy call brief</button></div> : <div className="mt-6 rounded-xl border border-dashed border-[#dce5d8] bg-[#fafbf8] px-5 py-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf3e8] text-[#577051]"><MessageCircle size={22}/></div><h3 className="mt-3 text-sm font-bold">Go into the call with a plan</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#849087]">Get a personalized opening, three discovery questions, an objection to address, and a strong closing question.</p></div>}</div>}

              {activeTab === "Copilot" && <div className="p-5 sm:p-6"><SectionHeading icon={<MessageCircle size={15}/>} title="Sales copilot" hint={`Grounded in ${selected.name}'s lead details`}/><div className="mt-4 rounded-xl bg-[#f6f8f4] p-3 text-xs leading-5 text-[#758176]">Ask about customer needs, rewrite a reply, or plan follow-up. The copilot receives the selected lead and this chat history.</div><div className="mt-4 space-y-3">{(chatByLead[selected.id] ?? []).length === 0 && <div className="grid gap-2 sm:grid-cols-2">{[`What should I emphasize when I call ${selected.name.split(" ")[0]}?`,"Rewrite the reply in a warmer, more confident tone.","What question would help qualify this lead?","How should I respond to their main concern?"].map((prompt) => <button key={prompt} className="rounded-xl border border-[#e3e9e1] p-3 text-left text-xs leading-5 text-[#68756b] hover:bg-[#fafbf8]" onClick={() => setChatInput(prompt)}>{prompt}<ArrowRight size={13} className="mt-2 text-[#96a194]"/></button>)}</div>}{(chatByLead[selected.id] ?? []).map((message, index) => <div key={index} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-[#214432] text-white" : "border border-[#e4eae2] bg-white text-[#4f5d52]"}`}>{message.content}</div>)}{chatLoading && <div className="flex items-center gap-2 text-xs text-[#849087]"><LoaderCircle size={14} className="animate-spin"/>Thinking about this lead...</div>}</div><form onSubmit={sendChat} className="mt-5 flex items-end gap-2"><textarea className="field min-h-[46px] resize-y text-sm" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about this lead..." rows={2} maxLength={1000}/><button className="btn-primary h-[46px] w-[48px] shrink-0 px-0" disabled={!chatInput.trim() || chatLoading} aria-label="Send question"><Send size={16}/></button></form><p className="mt-2 text-[10px] text-[#9aa49b]">AI can make mistakes. Verify customer-facing details before sending.</p></div>}
            </div>
          </section> : <div className="surface p-12 text-center text-sm text-[#829087]">Add a lead to get started.</div>}
        </section>
        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#e3e9e2] pt-5 text-[11px] text-[#929d93] sm:flex-row"><span>Masal Lead Intelligence · Built for thoughtful sales follow-up</span><span>AI-assisted prioritization, with people in control.</span></footer>
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#102119]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><section role="dialog" aria-modal="true" aria-labelledby="new-lead-title" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7"><div className="mb-5 flex items-start justify-between gap-4"><div><div className="eyebrow mb-2">New enquiry</div><h2 id="new-lead-title" className="text-xl font-semibold tracking-tight">Add a lead for analysis</h2><p className="mt-1 text-xs leading-5 text-[#839087]">Add the details you have. Clear context leads to more useful suggestions.</p></div><button className="rounded-lg border border-[#e5eae4] p-2 text-[#7e8b80]" onClick={() => setShowForm(false)} aria-label="Close form"><X size={17}/></button></div><form onSubmit={submitLead} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Customer name" required><input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Aditi Sharma" required maxLength={120}/></Field><Field label="Location" required><input className="field" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="e.g. Whitefield, Bengaluru" required maxLength={160}/></Field><Field label="Property requirement" required><input className="field" value={form.propertyRequirement} onChange={(event) => setForm({ ...form, propertyRequirement: event.target.value })} placeholder="e.g. 3 BHK, gated community" required maxLength={500}/></Field><Field label="Budget" required><input className="field" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} placeholder="e.g. INR 1.2–1.5 Cr" required maxLength={120}/></Field><Field label="Buying timeline" required><select className="field" value={form.timeline} onChange={(event) => setForm({ ...form, timeline: event.target.value })} required><option>Immediately / within 2 weeks</option><option>Within 2–4 weeks</option><option>Within 1–3 months</option><option>Within 3–6 months</option><option>Just exploring / no rush</option><option>Not sure yet</option></select></Field></div><Field label="Customer message or conversation transcript" required><textarea className="field min-h-[130px] resize-y" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Paste the customer's inquiry or the relevant part of your conversation..." required minLength={8} maxLength={6000}/><span className="mt-1 block text-right text-[10px] text-[#99a39a]">{form.message.length}/6000 characters</span></Field><div className="flex flex-col-reverse justify-between gap-3 border-t border-[#edf0ec] pt-4 sm:flex-row sm:items-center"><p className="max-w-sm text-[10px] leading-4 text-[#8d988e]">The message is sent to the configured AI provider for analysis. Avoid submitting unnecessary sensitive personal data.</p><div className="flex gap-2"><button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={analyzing}>{analyzing ? <LoaderCircle size={15} className="animate-spin"/> : <Sparkles size={15}/>} {analyzing ? "Analyzing lead..." : "Analyze & save"}</button></div></div></form></section></div>}
    </main>
  );
}

function Metric({ icon, label, value, note, accent = false }: { icon: React.ReactNode; label: string; value: number; note: string; accent?: boolean }) {
  return <div className="surface p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-[#7b877e]">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? "bg-[#fff0e8] text-[#be684b]" : "bg-[#f0f4ed] text-[#637a62]"}`}>{icon}</span></div><div className="mt-3 text-3xl font-semibold tracking-[-.06em] tabular-nums">{value}</div><p className="mt-1 text-[11px] text-[#909a91]">{note}</p></div>;
}
function InfoTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-xl bg-[#f7f8f5] p-3.5"><div className="eyebrow">{label}</div><div className="mt-2 text-sm font-bold text-[#36443a]">{value}</div>{detail && <div className="mt-1 text-[10px] text-[#95a096]">{detail}</div>}</div>;
}
function SectionHeading({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return <div className="flex items-start gap-2.5"><div className="mt-0.5 text-[#6b876c]">{icon}</div><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-[11px] text-[#89958b]">{hint}</p></div></div>;
}
function BulletSection({ title, items }: { title: string; items: string[] }) {
  return <div><div className="eyebrow mb-3">{title}</div>{items.length ? <ul className="space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-sm leading-5 text-[#647168]"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#93a28f]"/>{item}</li>)}</ul> : <p className="text-xs text-[#8a968c]">No specific points identified yet.</p>}</div>;
}
function BriefBlock({ label, content }: { label: string; content: string }) {
  return <div><div className="eyebrow mb-2">{label}</div><p className="rounded-xl bg-[#f7f8f5] p-4 text-sm leading-6 text-[#566359]">{content}</p></div>;
}
function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[#566259]">{label}{required && <span className="ml-1 text-[#be684b]">*</span>}<div className="mt-2">{children}</div></label>;
}
