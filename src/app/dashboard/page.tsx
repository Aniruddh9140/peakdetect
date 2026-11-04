"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { AiLabel, DataNotice, PageSkeleton, PhaseBadge, ScoreBar, SourceLinks } from "@/components/live-status";
import { YearInNumbers } from "@/components/live-hero";
import { TrendChart } from "@/components/trend-chart";
import { REGIONS, caseCount, inRegion, topAssessed, useLiveData } from "@/lib/live-data";
import { PHASE_STYLES, cn, relativeTime } from "@/lib/utils";

const DAY = 86_400_000;

export default function DashboardOverview() {
  const { data, diseases, error, loading } = useLiveData();
  const [region, setRegion] = useState("Worldwide");

  const shown = diseases.filter((d) => inRegion(d, region));
  const peaking = shown.filter((d) => d.displayPhase === "peaking");
  const rising = shown.filter((d) => d.displayPhase === "rising");
  const lead = peaking[0] ?? shown[0];
  const top = topAssessed(diseases) ?? diseases[0];
  const withCases = diseases.filter((d) => d.signals.surveillance.length).length;
  const movers = diseases
    .filter((d) => d.previousScore !== null && d.score !== d.previousScore)
    .sort((a, b) => Math.abs(b.score - b.previousScore!) - Math.abs(a.score - a.previousScore!))
    .slice(0, 5);
  const alerts = (data?.alerts ?? []).filter((a) => region === "Worldwide" || a.regions.includes(region));
  const recentAlerts = alerts.filter((a) => Date.parse(data?.generatedAt ?? "") - Date.parse(a.date ?? "") < 30 * DAY).length;

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-stone-900">This week in disease activity</h1>
          <p className="text-stone-500 mt-1 text-sm">
            {data ? `Updated ${relativeTime(data.generatedAt)}. ` : ""}Diseases named in reports from{" "}
            <select
              aria-label="Region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="border-0 border-b border-dashed border-stone-400 bg-transparent text-stone-800 font-medium text-sm focus:border-red-500 focus:outline-none cursor-pointer"
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

      {data && top && (
        <>
          <Card className={cn("border-l-4 p-6", PHASE_STYLES[top.displayPhase]?.solid.replace("bg-", "border-l-"))}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Top story <PhaseBadge phase={top.displayPhase} />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-stone-900">
              {top.info.emoji} {top.name}
            </h2>
            <p className="text-stone-700 mt-2 max-w-3xl leading-relaxed">{top.ai?.summary ?? top.factors[0]}</p>
            {top.ai && (
              <p className="text-xs text-stone-500 mt-2">
                Source: <SourceLinks urls={top.ai.sources} />. Summary written by a small open-source AI from this source; it can make mistakes.
              </p>
            )}
            <p className="text-xs text-stone-500 mt-3">
              Scores compare each disease with its own past. They do not count how many people are sick or say how likely you are to catch anything.
            </p>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Peaking now" value={peaking.length} icon={TrendingUp} accent="red" />
            <StatCard label="Rising" value={rising.length} icon={AlertTriangle} accent="amber" />
            <StatCard label="Official alerts, 30 days" value={recentAlerts} icon={Bell} accent="purple" />
            <StatCard label="Diseases with case data" value={`${withCases} of ${diseases.length}`} icon={Activity} accent="blue" />
          </div>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-1">This year in numbers</h2>
            <p className="text-sm text-stone-500 mb-3">Reported US cases so far this year against the same point last year (CDC).</p>
            <YearInNumbers />
          </section>

          {shown.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-stone-500">
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
                    <CardDescription>Higher means more unusual for this disease than its own past, not more cases</CardDescription>
                  </div>
                  <Link href="/dashboard/predictions/" className="text-sm font-medium text-red-600 hover:text-red-700 inline-flex items-center gap-1 whitespace-nowrap">
                    See all <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {shown.slice(0, 10).map((d, i) => {
                    const cases = caseCount(d);
                    return (
                      <Link
                        key={d.slug}
                        href={`/dashboard/predictions/?disease=${d.slug}`}
                        className="flex items-center gap-4 p-3 rounded-xl border border-stone-100 hover:bg-stone-50 hover:border-stone-200 transition"
                      >
                        <span className="w-5 text-sm font-bold text-stone-400 tabular-nums">{i + 1}</span>
                        <div className="text-2xl shrink-0">{d.info.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-semibold text-stone-900 truncate">{d.name}</span>
                            <PhaseBadge phase={d.displayPhase} />
                            {cases && <span className="text-xs text-stone-500">{cases.value.toLocaleString("en-US")} US cases a week</span>}
                          </div>
                          <ScoreBar disease={d} />
                          <p className="text-xs text-stone-500 mt-1.5 line-clamp-2">{d.ai?.summary ?? d.factors[0]}</p>
                        </div>
                        <div className="text-lg font-bold text-stone-900 shrink-0 tabular-nums">{d.score}</div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Biggest movers</CardTitle>
                  <CardDescription>Score change since the last update</CardDescription>
                </CardHeader>
                <CardContent>
                  {movers.length ? (
                    <ul className="space-y-2.5">
                      {movers.map((d) => {
                        const change = d.score - d.previousScore!;
                        return (
                          <li key={d.slug} className="flex items-center gap-2 text-sm">
                            <span>{d.info.emoji}</span>
                            <Link href={`/dashboard/predictions/?disease=${d.slug}`} className="flex-1 font-medium text-stone-800 hover:underline truncate">
                              {d.name}
                            </Link>
                            <span className={cn("inline-flex items-center gap-0.5 font-semibold tabular-nums", change > 0 ? "text-red-600" : "text-emerald-700")}>
                              {change > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                              {change > 0 ? "+" : ""}
                              {change}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-stone-500">No score changed since the last update.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-red-600" />
                    Latest official alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {alerts.slice(0, 5).map((a) => (
                      <li key={a.url} className="text-sm">
                        <a href={a.url} target="_blank" rel="noreferrer" className="font-medium text-stone-800 hover:text-red-700 leading-snug">
                          {a.title}
                        </a>
                        <div className="text-xs text-stone-500 mt-0.5">{a.source} · {a.date}</div>
                      </li>
                    ))}
                    {!alerts.length && <li className="text-sm text-stone-500">No recent alerts for this region.</li>}
                  </ul>
                  <Link href="/dashboard/alerts/" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700">
                    All alerts <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </CardContent>
              </Card>

              {Boolean(data.ai?.emerging.length) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Also in the news</CardTitle>
                    <CardDescription>Named in official reports, outside the tracked list</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.ai?.emerging.map((e) => (
                      <div key={e.name} className="text-sm">
                        <div className="font-medium text-stone-900">{e.name}</div>
                        <p className="text-stone-600 leading-snug mt-0.5">{e.summary}</p>
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
                <CardTitle>{lead.name}: trend</CardTitle>
                <CardDescription>Each line is a percentage of its own high, so compare the shapes and not the heights</CardDescription>
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
