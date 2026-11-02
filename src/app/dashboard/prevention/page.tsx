"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataNotice, PageSkeleton, PhaseBadge } from "@/components/live-status";
import { useLiveData } from "@/lib/live-data";
import { PHASE_STYLES, cn } from "@/lib/utils";

const STORAGE_KEY = "completedTips";

// Tips render only after data loads, so this cannot mismatch the prerendered HTML.
function readCompleted() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set<string>();
  }
}

function PreventionContent() {
  const selectedSlug = useSearchParams().get("disease");
  const { data, diseases, error, loading } = useLiveData();
  const [activeSlug, setActiveSlug] = useState(selectedSlug);
  const [completed, setCompleted] = useState<Set<string>>(readCompleted);

  function toggle(tip: string) {
    const next = new Set(completed);
    if (next.has(tip)) next.delete(tip);
    else next.add(tip);
    setCompleted(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {}
  }

  const active = diseases.find((d) => d.slug === activeSlug) ?? diseases[0];
  const tips = active?.info.prevention ?? [];
  const done = tips.filter((t) => completed.has(`${active.slug}:${t}`)).length;

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-emerald-600" />
          Prevention Guidance
        </h1>
        <p className="text-slate-500 text-sm mt-1">Practical steps for each disease. Your checklist is saved in this browser only.</p>
      </div>

      <DataNotice data={data} error={error} />
      {loading && <PageSkeleton />}

      {active && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select a disease</CardTitle>
              <CardDescription>Sorted by peak score</CardDescription>
            </CardHeader>
            <CardContent className="p-2 max-h-[34rem] overflow-y-auto">
              {diseases.map((d) => (
                <button
                  key={d.slug}
                  onClick={() => setActiveSlug(d.slug)}
                  aria-pressed={d.slug === active.slug}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2.5 transition mb-1",
                    d.slug === active.slug ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                  )}
                >
                  <span className="text-xl shrink-0">{d.info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{d.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full", PHASE_STYLES[d.displayPhase]?.solid)} />
                      <span className="text-[11px] text-slate-500">{PHASE_STYLES[d.displayPhase]?.label}</span>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{active.info.emoji}</span>
                  <div>
                    <CardTitle>{active.name}</CardTitle>
                    <CardDescription>Spreads by: {active.info.transmission.join(", ")}</CardDescription>
                  </div>
                </div>
                <PhaseBadge phase={active.displayPhase} />
              </div>
            </CardHeader>
            <CardContent>
              {tips.length > 0 && done === tips.length && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  All steps done.
                </div>
              )}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${tips.length ? (done / tips.length) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{done}/{tips.length} done</span>
              </div>
              <div className="space-y-3">
                {tips.map((tip) => {
                  const key = `${active.slug}:${tip}`;
                  const isDone = completed.has(key);
                  return (
                    <label
                      key={key}
                      className={cn(
                        "flex gap-3 p-4 rounded-xl border cursor-pointer transition",
                        isDone ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <input type="checkbox" checked={isDone} onChange={() => toggle(key)} className="mt-0.5 w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className={cn("text-sm leading-relaxed", isDone ? "line-through text-slate-500" : "text-slate-700")}>{tip}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-4 flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                General information only, not medical advice. Follow your local health authority and ask a healthcare provider about your own situation.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function PreventionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PreventionContent />
    </Suspense>
  );
}
