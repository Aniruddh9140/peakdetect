"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrainCircuit, ExternalLink, Info, Newspaper, Shield, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiLabel, DataNotice, PageSkeleton, PhaseBadge, ScoreBar, SourceLinks } from "@/components/live-status";
import { TrendChart } from "@/components/trend-chart";
import { REGIONS, inRegion, useLiveData, type Disease } from "@/lib/live-data";
import { cn } from "@/lib/utils";

function Detail({ disease }: { disease: Disease }) {
  const { signals } = disease;
  const change = disease.previousScore === null ? null : disease.score - disease.previousScore;
  const measures = [
    { label: "Peak score", value: `${disease.score}/100` },
    { label: "Since last update", value: change === null ? "New" : `${change > 0 ? "+" : ""}${change}` },
    { label: "News coverage", value: signals.news ? `${signals.news.perDay} a day` : "None" },
    { label: "Wikipedia readers", value: signals.wiki ? `${signals.wiki.percentile}th pct` : "None" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-3xl">{disease.info.emoji}</span>
            <CardTitle className="text-lg">{disease.name}</CardTitle>
            <PhaseBadge phase={disease.displayPhase} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {measures.map((m) => (
              <div key={m.label} className="p-3 rounded-xl bg-slate-50">
                <div className="text-xs text-slate-500 mb-0.5">{m.label}</div>
                <div className="text-lg font-bold text-slate-900">{m.value}</div>
              </div>
            ))}
          </div>

          {disease.ai && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-4 h-4" /> AI assessment
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed">{disease.ai.summary}</p>
              {disease.ai.where.length > 0 && (
                <p className="text-xs text-slate-600 mt-1.5">Where: {disease.ai.where.join(", ")}</p>
              )}
              <div className="mt-1.5">
                <SourceLinks urls={disease.ai.sources} />
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" /> What the data shows
            </h3>
            <ul className="space-y-1.5">
              {disease.factors.map((f) => (
                <li key={f} className="text-sm text-slate-700 p-2.5 rounded-lg bg-slate-50 leading-relaxed">{f}</li>
              ))}
            </ul>
          </div>

          <Link
            href={`/dashboard/prevention/?disease=${disease.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            <Shield className="w-4 h-4" /> Prevention steps
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Six-month trend</CardTitle>
          <CardDescription>Each line is a percentage of its own high, so compare the shapes and not the heights</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart trend={disease.trend} />
        </CardContent>
      </Card>

      {disease.articles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-slate-500" /> Recent reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {disease.articles.map((a) => (
                <li key={a.url} className="text-sm">
                  <a href={a.url} target="_blank" rel="noreferrer" className="font-medium text-slate-800 hover:text-blue-700 inline-flex items-start gap-1.5">
                    {a.title} <ExternalLink className="w-3 h-3 mt-1 shrink-0 text-slate-400" />
                  </a>
                  <div className="text-xs text-slate-500">{a.source}{a.date ? ` · ${a.date}` : ""}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Ranking() {
  const { data, diseases, error, loading } = useLiveData();
  const initial = useSearchParams().get("disease");
  const [selected, setSelected] = useState(initial);
  const [region, setRegion] = useState("Worldwide");

  const shown = diseases.filter((d) => inRegion(d, region));
  const active = shown.find((d) => d.slug === selected) ?? shown[0];

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Peak Ranking</h1>
          </div>
          <p className="text-slate-500 text-sm">Every tracked disease, compared with its own past year</p>
          {data && <div className="mt-1"><AiLabel data={data} /></div>}
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
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
          <Card className="overflow-hidden">
            <div className="max-h-[42rem] overflow-y-auto">
              {shown.map((d) => (
                <button
                  key={d.slug}
                  onClick={() => setSelected(d.slug)}
                  aria-pressed={active?.slug === d.slug}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition",
                    active?.slug === d.slug && "bg-blue-50 hover:bg-blue-50"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{d.info.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 truncate mb-1">{d.name}</div>
                      <ScoreBar disease={d} />
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-slate-800">{d.score}</div>
                      <PhaseBadge phase={d.displayPhase} />
                    </div>
                  </div>
                </button>
              ))}
              {!shown.length && <p className="p-5 text-sm text-slate-500">No recent reports name {region}.</p>}
            </div>
          </Card>
          {active && <Detail disease={active} />}
        </div>
      )}

      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="p-4 text-sm text-blue-900 leading-relaxed">
          <strong>How to read this:</strong> a high score means a disease is unusually active compared with its own past year. It does not tell you how many people are sick or how likely you are to catch it. News and Wikipedia can rise because of attention alone, so case data counts for the most where it exists.
        </CardContent>
      </Card>
    </div>
  );
}

export default function PeakRankingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Ranking />
    </Suspense>
  );
}
