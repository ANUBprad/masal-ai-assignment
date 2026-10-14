"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, Sparkles, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { DEFAULT_MODEL, SUPPORTED_MODELS } from "@/lib/ai";

type Props = {
  onConnected: (key: string, model: string) => void;
};

export default function SetupScreen({ onConnected }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);

  async function connect() {
    setMessage("");
    if (!apiKey.trim()) {
      setMessage("Paste your Gemini API key to continue.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/connection-test", {
        method: "POST",
        headers: { "content-type": "application/json", "x-gemini-api-key": apiKey.trim(), "x-gemini-model": model },
        body: "{}",
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Connection failed.");
      setConnected(true);
      onConnected(apiKey.trim(), model);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connection failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-5 py-8 sm:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[28px] border border-[#e5eae5] bg-white shadow-[0_25px_90px_-50px_rgba(20,37,29,.35)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#14251d] p-8 text-white sm:p-12">
          <div className="absolute -right-28 top-24 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -right-12 top-40 h-48 w-48 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d7f36a] text-[#14251d]"><Sparkles size={20}/></div>
            <div><p className="font-bold tracking-tight">masal<span className="text-[#d7f36a]">.ai</span></p><p className="text-[10px] uppercase tracking-[.2em] text-white/45">Lead intelligence</p></div>
          </div>
          <div className="relative my-14 max-w-lg">
            <p className="mb-5 text-xs font-bold uppercase tracking-[.23em] text-[#d7f36a]">A sharper way to sell</p>
            <h1 className="text-4xl font-semibold leading-[1.13] tracking-[-.04em] sm:text-5xl">Turn every enquiry into a <span className="text-[#d7f36a]">clear next move.</span></h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/65">Understand intent, prioritize your pipeline, and walk into every customer conversation prepared.</p>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {[["01","Understand"],["02","Prioritize"],["03","Act"]].map(([n,label]) => <div key={n} className="rounded-xl border border-white/10 bg-white/[.04] p-3"><p className="text-[10px] text-[#d7f36a]">{n}</p><p className="mt-2 text-xs font-semibold">{label}</p></div>)}
            </div>
          </div>
          <div className="relative flex items-center gap-2 text-xs text-white/45"><ShieldCheck size={15}/> Your key stays in this browser session only.</div>
        </section>
        <section className="flex items-center p-6 sm:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-[#f1f6e8] px-3 py-1.5 text-xs font-semibold text-[#3d6847]"><KeyRound size={13}/> One-time setup</div>
            <h2 className="text-3xl font-bold tracking-[-.04em]">Connect your AI</h2>
            <p className="mt-3 text-sm leading-6 text-[#718078]">Use your own free-tier Gemini API key to power lead analysis and sales recommendations.</p>
            <label className="mt-8 block text-sm font-semibold">Gemini API key</label>
            <div className="relative mt-2">
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type={showKey ? "text" : "password"} autoComplete="off" spellCheck={false} placeholder="Paste your API key" className="w-full rounded-xl border border-[#dce4dc] bg-[#fbfcfa] px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-[#1d5d43] focus:ring-4 focus:ring-[#1d5d43]/10"/>
              <button type="button" onClick={() => setShowKey(!showKey)} aria-label={showKey ? "Hide API key" : "Show API key"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#718078] hover:bg-[#edf1eb]">{showKey ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
            </div>
            <label className="mt-6 block text-sm font-semibold">Model</label>
            <div className="mt-2 space-y-2">
              {SUPPORTED_MODELS.map((item) => <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${model === item.id ? "border-[#1d5d43] bg-[#f5f8f1] ring-1 ring-[#1d5d43]" : "border-[#e5eae5] hover:border-[#b8c8b8]"}`}>
                <input type="radio" name="model" value={item.id} checked={model === item.id} onChange={() => setModel(item.id)} className="mt-1 accent-[#1d5d43]"/>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-1 block text-xs text-[#718078]">{item.description}</span></span>
                {model === item.id && <CheckCircle2 size={17} className="mt-0.5 text-[#1d5d43]"/>}
              </label>)}
            </div>
            {message && <div role="alert" className="mt-4 flex gap-2 rounded-xl bg-[#fff3ee] p-3 text-xs leading-5 text-[#a0442d]"><AlertCircle size={16} className="mt-0.5 shrink-0"/>{message}</div>}
            {connected && <p className="mt-3 text-xs text-[#1d5d43]">Connected successfully.</p>}
            <button onClick={connect} disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1d5d43] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#164a35]">{busy ? "Testing connection…" : "Connect and continue"} <Sparkles size={16}/></button>
            <p className="mt-4 text-center text-[11px] leading-5 text-[#89958c]">The key is kept in memory and sent only to this app&apos;s API routes. It is not saved to local storage or cookies. Obtain a key from Google AI Studio.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
