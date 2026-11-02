"use client";

import { Sparkles } from "lucide-react";
import { useLiveData } from "@/lib/live-data";
import { PHASE_STYLES, cn, relativeTime } from "@/lib/utils";

export function LiveHero() {
  const { data, diseases, error } = useLiveData();
  const top = diseases.slice(0, 5);

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-cyan-500/10 to-indigo-500/20 blur-3xl rounded-full" />
      <div className="relative rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400 pulse-dot" />
            <span className="text-xs font-medium text-red-300">
              LIVE{data ? ` • updated ${relativeTime(data.generatedAt)}` : ""}
            </span>
          </div>
          <span className="text-xs text-slate-400">Peak score, 0-100</span>
        </div>

        <div className="space-y-3 min-h-64">
          {error && !data && <p className="text-sm text-slate-300">Live data is unavailable right now.</p>}
          {top.map((d) => {
            const style = PHASE_STYLES[d.displayPhase] ?? PHASE_STYLES.baseline;
            return (
              <div key={d.slug} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-2xl">{d.info.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{d.name}</span>
                    <span className="text-xs font-bold text-slate-200">{d.score}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={cn("h-full rounded-full bg-gradient-to-r", style.gradient)} style={{ width: `${d.score}%` }} />
                  </div>
                </div>
                <div className="text-xs text-slate-300 text-right w-16 font-medium">{style.label}</div>
              </div>
            );
          })}
        </div>

        {data?.ai && (
          <div className="mt-5 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <p className="text-xs text-cyan-100 leading-snug">
              <strong>AI briefing:</strong> {data.ai.headline}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
