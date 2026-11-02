"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import { Badge, Card, CardContent, LoadingSkeleton } from "@/components/ui/card";
import { isStale, type Disease, type LiveData } from "@/lib/live-data";
import { PHASE_STYLES, cn, relativeTime } from "@/lib/utils";

export function PhaseBadge({ phase }: { phase: string }) {
  const style = PHASE_STYLES[phase] ?? PHASE_STYLES.baseline;
  return (
    <Badge className={cn(style.bg, style.text, "ring-0")}>
      {style.icon} {style.label}
    </Badge>
  );
}

export function ScoreBar({ disease }: { disease: Disease }) {
  const style = PHASE_STYLES[disease.displayPhase] ?? PHASE_STYLES.baseline;
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full bg-gradient-to-r", style.gradient)} style={{ width: `${disease.score}%` }} />
    </div>
  );
}

export function DataNotice({ data, error }: { data: LiveData | null; error: boolean }) {
  if (error && !data) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-4 text-sm text-red-800">
          The latest data could not be loaded. Check your connection and try again.
        </CardContent>
      </Card>
    );
  }
  if (!data || !isStale(data)) return null;
  return (
    <Card className="bg-amber-50 border-amber-200">
      <CardContent className="p-4 flex gap-2.5 text-sm text-amber-900">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        This data was last updated {relativeTime(data.generatedAt)}, so it may be out of date.
      </CardContent>
    </Card>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <LoadingSkeleton className="h-28 w-full" />
      <LoadingSkeleton className="h-72 w-full" />
    </div>
  );
}

export function AiLabel({ data }: { data: LiveData }) {
  return data.ai ? (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Sparkles className="w-3 h-3 text-blue-600" />
      AI briefing {relativeTime(data.ai.generatedAt)}, {data.ai.searches ? `${data.ai.searches} web searches` : `written by ${data.ai.model}`}
    </span>
  ) : (
    <span className="text-xs text-slate-500">Measured data only. AI briefing is off.</span>
  );
}

export function SourceLinks({ urls }: { urls: string[] }) {
  return (
    <span className="inline-flex flex-wrap gap-x-2 gap-y-0.5">
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
          {new URL(url).hostname.replace(/^www\./, "")}
        </a>
      ))}
    </span>
  );
}
