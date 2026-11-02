"use client";

import { useState } from "react";
import { Bell, ExternalLink } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { DataNotice, PageSkeleton } from "@/components/live-status";
import { REGIONS, useLiveData } from "@/lib/live-data";

export default function AlertsPage() {
  const { data, error, loading } = useLiveData();
  const [region, setRegion] = useState("Worldwide");

  const alerts = (data?.alerts ?? []).filter((a) => region === "Worldwide" || a.regions.includes(region));

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bell className="w-7 h-7 text-purple-600" />
            Official Alerts
          </h1>
          <p className="text-slate-500 text-sm mt-1">The latest notices from WHO, ECDC, UKHSA and CDC</p>
        </div>
        <select
          aria-label="Region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>

      <DataNotice data={data} error={error} />
      {loading && <PageSkeleton />}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Notices</CardTitle>
            <CardDescription>{alerts.length} shown, newest first</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <EmptyState icon={Bell} title="No alerts for this region" description="None of the recent notices name a place in this region." />
            ) : (
              <ul className="space-y-2">
                {alerts.map((a) => (
                  <li key={a.url}>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-start gap-2 text-sm font-semibold text-slate-900">
                        <span className="flex-1">{a.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="info" className="text-[10px]">{a.source}</Badge>
                        <span className="text-xs text-slate-500">{a.date}</span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
