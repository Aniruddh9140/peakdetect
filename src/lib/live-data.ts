"use client";

import { useEffect, useState } from "react";
import catalog from "@/data/diseases.json";

const REFRESH_MS = 5 * 60_000;

export type Phase = "peaking" | "rising" | "baseline" | "falling";

export type CatalogDisease = (typeof catalog)[number];

export type Link = { title: string; url: string; source: string; date: string | null };

export type Signal = { heat: number; growth: number; percentile: number };

export type Assessment = {
  slug: string;
  phase: Phase;
  summary: string;
  where: string[];
  sources: string[];
};

export type LiveDisease = {
  slug: string;
  name: string;
  score: number;
  previousScore: number | null;
  growth: number;
  phase: Phase;
  factors: string[];
  officialReports: number;
  regions: Record<string, number>;
  signals: {
    news: (Signal & { perDay: number; fetchedAt: string }) | null;
    wiki: Signal | null;
    surveillance: (Signal & { label: string; value: number; unit: string; date: string; change: number; url: string })[];
  };
  trend: { date: string; news?: number; wiki?: number; cases?: number }[];
  articles: Link[];
};

export type LiveData = {
  generatedAt: string;
  updateEveryHours: number;
  aiModel: string;
  diseases: LiveDisease[];
  alerts: (Link & { slug: string | null; regions: string[] })[];
  ai: {
    assessments: Assessment[];
    emerging: { name: string; summary: string; where: string[]; sources: string[] }[];
    generatedAt: string;
    model: string;
  } | null;
  sources: { name: string; url: string; kind: string; ok: boolean; items: number; error?: string; checkedAt: string }[];
};

// One disease with its AI reading merged in. The AI's phase wins over the measured one.
export type Disease = LiveDisease & { info: CatalogDisease; ai: Assessment | null; displayPhase: Phase };

export const CATALOG = catalog;

export const REGIONS = ["Worldwide", "Africa", "East Asia", "Europe", "Latin America", "Middle East", "North America", "Oceania", "South Asia", "Southeast Asia"];

// Refetch keeps an open tab current without a reload; the site is rebuilt on each scheduled run.
export function useLiveData() {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/latest.json`, { cache: "no-cache" });
        if (!res.ok) throw new Error(String(res.status));
        setData(await res.json());
        setError(false);
      } catch {
        setError(true);
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const diseases: Disease[] = (data?.diseases ?? []).flatMap((d) => {
    const info = catalog.find((c) => c.slug === d.slug);
    if (!info) return [];
    const ai = data?.ai?.assessments.find((a) => a.slug === d.slug) ?? null;
    return [{ ...d, info, ai, displayPhase: ai?.phase ?? d.phase }];
  });

  return { data, diseases, error, loading: !data && !error };
}

// A day, not a few missed runs: GitHub often delays or drops scheduled runs, and most sources change daily or weekly.
export const isStale = (data: LiveData) => Date.now() - Date.parse(data.generatedAt) > 24 * 3_600_000;

// The AI disease summary to lead with: a peaking one first, otherwise the highest-scoring one it assessed.
export const topAssessed = (diseases: Disease[]) => diseases.find((d) => d.ai?.phase === "peaking") ?? diseases.find((d) => d.ai);

export const inRegion = (d: Disease, region: string) => region === "Worldwide" || Boolean(d.regions[region]);
