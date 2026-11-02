"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowUpRight, Bell, Sparkles, TrendingUp } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { AiLabel, DataNotice, PageSkeleton, PhaseBadge, ScoreBar, SourceLinks } from "@/components/live-status";
import { TrendChart } from "@/components/trend-chart";
import { REGIONS, inRegion, useLiveData } from "@/lib/live-data";
import { relativeTime } from "@/lib/utils";

const DAY = 86_400_000;

export default function DashboardOverview() {
  const { data, diseases, error, loading } = useLiveData();
  const [region, setRegion] = useState("Worldwide");

  const shown = diseases.filter((d) => inRegion(d, region));
  const peaking = shown.filter((d) => d.displayPhase === "peaking");
  const rising = shown.filter((d) => d.displayPhase === "rising");
  const lead = peaking[0] ?? shown[0];
  const peakingCount = diseases.filter((d) => d.displayPhase === "peaking").length;
  const alerts = (data?.alerts ?? []).filter((a) => region === "Worldwide" || a.regions.includes(region));
  const recentAlerts = alerts.filter((a) => Date.parse(data?.generatedAt ?? "") - Date.parse(a.date ?? "") < 30 * DAY).length;

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            What&apos;s peaking right now
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {data ? `Updated ${relativeTime(data.generatedAt)}. ` : ""}Diseases named in reports from{" "}
            <select
              aria-label="Region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="border-0 border-b border-dashed border-slate-300 bg-transparent text-slate-700 font-medium text-sm focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </p>
        </div>
        {data && <AiLabel data={data} />}
      </div>

      <DataNotice data={data} error={error} />
      {loading && <PageSkeleton />}

      {data && (
        <>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 p-6 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(56,189,248,0.2),transparent_60%)]" />
            <div className="relative flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 grid place-items-center shrink-0">
                <Sparkles className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold">
                  {data.ai ? data.ai.headline : `${peakingCount} ${peakingCount === 1 ? "disease is" : "diseases are"} scoring as peaking`}
                </h2>
                <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  {data.ai && `${data.ai.overview} This summary is written by a small AI model and can make mistakes; check the linked reports. `}
                  Scores compare each disease with its own past year. They do not count how many people are sick or say how likely you are to catch anything.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Peaking now" value={peaking.length} icon={TrendingUp} accent="red" />
            <StatCard label="Rising" value={rising.length} icon={AlertTriangle} accent="amber" />
            <StatCard label="Official alerts, 30 days" value={recentAlerts} icon={Bell} accent="purple" />
            <StatCard label="Diseases listed" value={shown.length} icon={Activity} accent="blue" />
          </div>

          {shown.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">
                No recent reports name {region}. This does not mean there is no disease activity there, only that the sources we read did not mention it.
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ranked by peak score</CardTitle>
                    <CardDescription>Higher means more unusual for this disease than its past year, not more cases</CardDescription>
                  </div>
                  <Link href="/dashboard/predictions/" className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 whitespace-nowrap">
                    See all <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {shown.slice(0, 8).map((d) => (
                    <Link
                      key={d.slug}
                      href={`/dashboard/predictions/?disease=${d.slug}`}
                      className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition"
                    >
                      <div className="text-2xl shrink-0">{d.info.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-semibold text-slate-900 truncate">{d.name}</span>
                          <PhaseBadge phase={d.displayPhase} />
                        </div>
                        <ScoreBar disease={d} />
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{d.ai?.summary ?? d.factors[0]}</p>
                      </div>
                      <div className="text-lg font-bold text-slate-900 shrink-0">{d.score}</div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-600" />
                    Latest official alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {alerts.slice(0, 5).map((a) => (
                      <li key={a.url} className="text-sm">
                        <a href={a.url} target="_blank" rel="noreferrer" className="font-medium text-slate-800 hover:text-blue-700 leading-snug">
                          {a.title}
                        </a>
                        <div className="text-xs text-slate-500 mt-0.5">{a.source} · {a.date}</div>
                      </li>
                    ))}
                    {!alerts.length && <li className="text-sm text-slate-500">No recent alerts for this region.</li>}
                  </ul>
                  <Link href="/dashboard/alerts/" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                    All alerts <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </CardContent>
              </Card>

              {Boolean(data.ai?.emerging.length) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Also on the AI&apos;s radar</CardTitle>
                    <CardDescription>Named in official reports, outside the tracked list</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.ai?.emerging.map((e) => (
                      <div key={e.name} className="text-sm">
                        <div className="font-medium text-slate-900">{e.name}</div>
                        <p className="text-slate-600 leading-snug mt-0.5">{e.summary}</p>
                        <SourceLinks urls={e.sources} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {lead && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>{lead.name}: six-month trend</CardTitle>
                    <CardDescription>Each line is a percentage of its own high, so compare the shapes and not the heights</CardDescription>
                  </div>
                  <Badge variant="outline">Top of the list</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <TrendChart trend={lead.trend} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
