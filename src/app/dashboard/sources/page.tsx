"use client";

import { Activity, CheckCircle2, Database, Globe2, Link as LinkIcon, XCircle } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataNotice, PageSkeleton } from "@/components/live-status";
import { useLiveData } from "@/lib/live-data";
import { relativeTime } from "@/lib/utils";

export default function SourcesPage() {
  const { data, error, loading } = useLiveData();
  const sources = data?.sources ?? [];

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Database className="w-7 h-7 text-cyan-600" />
          Data Sources
        </h1>
        <p className="text-slate-500 text-sm mt-1">What fed the latest update, and whether each source worked</p>
      </div>

      <DataNotice data={data} error={error} />
      {loading && <PageSkeleton />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="text-sm text-slate-500 font-medium">Working now</div>
              <div className="text-2xl font-bold mt-1 text-emerald-600">
                {sources.filter((s) => s.ok).length} of {sources.length}
              </div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-slate-500 font-medium">Last update</div>
              <div className="text-2xl font-bold mt-1 text-slate-900">{relativeTime(data.generatedAt)}</div>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sources</CardTitle>
              <CardDescription>Checked on every update</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sources.map((s) => (
                  <div key={s.name} className="p-4 rounded-xl border border-slate-200 flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600 shrink-0">
                      <Globe2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 text-sm">{s.name}</h3>
                        <Badge variant={s.ok ? "success" : "danger"} className="text-[10px]">
                          {s.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {s.ok ? "Working" : "Not available"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{s.kind}</Badge>
                      </div>
                      {s.error && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.error}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        <span>{s.items} items</span>
                        <span>Checked {relativeTime(s.checkedAt)}</span>
                        <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-700 hover:underline">
                          <LinkIcon className="w-3 h-3" /> Source
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-600" />
                How the peak score works
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Every {data.updateEveryHours} hours, each signal is compared with that disease&apos;s own history. Case data counts for 50%, news coverage 30% and Wikipedia readership 20%. If a signal is missing, the others share its weight. Official WHO outbreak reports add up to 10 points. Rare diseases need at least 5 articles a day for news to count fully, so a few stories cannot create a false peak. Case data currently covers flu, RSV and COVID-19 only, so scores for other diseases show attention more than confirmed cases.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
