"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity, Search, X } from "lucide-react";
import { Badge, Card, CardContent, EmptyState } from "@/components/ui/card";
import { DataNotice, PageSkeleton, PhaseBadge, ScoreBar } from "@/components/live-status";
import { useLiveData, type Disease } from "@/lib/live-data";
import { cn } from "@/lib/utils";

const CATEGORIES = ["all", "viral", "bacterial", "parasitic"];

export default function DiseasesPage() {
  const { data, diseases, error, loading } = useLiveData();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState<Disease | null>(null);

  const q = search.toLowerCase();
  const shown = diseases.filter(
    (d) =>
      (category === "all" || d.info.category === category) &&
      (d.name.toLowerCase().includes(q) || d.info.symptoms.some((s) => s.includes(q)))
  );

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Activity className="w-7 h-7 text-blue-600" />
          Disease Encyclopedia
        </h1>
        <p className="text-slate-500 text-sm mt-1">Search tracked diseases by name or symptom</p>
      </div>

      <DataNotice data={data} error={error} />

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search diseases"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search diseases or symptoms..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium capitalize transition",
                  category === c ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && <PageSkeleton />}

      {data && shown.length === 0 && (
        <Card>
          <EmptyState icon={Activity} title="No diseases found" description="Try adjusting your search or filter." />
        </Card>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map((d) => (
          <button key={d.slug} onClick={() => setOpen(d)} className="text-left">
            <Card className="p-5 glow-hover h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl shrink-0">{d.info.emoji}</div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 leading-tight truncate">{d.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="capitalize text-[10px]">{d.info.category}</Badge>
                    {d.info.vaccine && <Badge variant="success" className="text-[10px]">Vaccine</Badge>}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{d.info.description}</p>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <PhaseBadge phase={d.displayPhase} />
                <span className="font-semibold text-slate-700">{d.score}/100</span>
              </div>
              <ScoreBar disease={d} />
            </Card>
          </button>
        ))}
      </div>

      {open && <DetailModal disease={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function DetailModal({ disease, onClose }: { disease: Disease; onClose: () => void }) {
  const { info } = disease;
  const facts = [
    { label: "Incubation", value: info.incubation },
    { label: "Season", value: info.seasonality },
    { label: "Vaccine", value: info.vaccine ? "Available" : "None in general use" },
  ];
  // A native dialog gives focus trapping, Esc to close and focus restore for free.
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);
  return (
    <dialog
      ref={ref}
      aria-label={disease.name}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto p-0 bg-white rounded-2xl w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl scale-in backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
    >
      <div>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{info.emoji}</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{disease.name}</h2>
              <p className="text-xs text-slate-500 capitalize">{info.category} · severity: {info.severity}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-700 leading-relaxed">{info.description}</p>

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {facts.map((f) => (
              <div key={f.label} className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500 mb-1">{f.label}</div>
                <div className="font-medium">{f.value}</div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Symptoms</h3>
            <div className="flex flex-wrap gap-1.5">
              {info.symptoms.map((s) => (
                <Badge key={s} variant="outline" className="capitalize">{s}</Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">How it spreads</h3>
            <p className="text-sm text-slate-700 capitalize-first">{info.transmission.join(", ")}</p>
          </div>

          <div className="flex gap-4 text-sm font-medium">
            <Link href={`/dashboard/predictions/?disease=${disease.slug}`} className="text-blue-600 hover:text-blue-700">
              Current activity
            </Link>
            <Link href={`/dashboard/prevention/?disease=${disease.slug}`} className="text-blue-600 hover:text-blue-700">
              Prevention steps
            </Link>
            <a href={`https://en.wikipedia.org/wiki/${info.wiki}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700">
              Read more
            </a>
          </div>
        </div>
      </div>
    </dialog>
  );
}
