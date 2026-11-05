"use client";

import Link from "next/link";
import { PhaseBadge, ScoreBar, SourceLinks } from "@/components/live-status";
import { caseCount, topAssessed, useLiveData, versusLastYear } from "@/lib/live-data";
import { relativeTime } from "@/lib/utils";

// The live board on the home page: today's top five, each with its most concrete number.
export function LiveHero() {
  const { data, diseases, error } = useLiveData();
  const lead = topAssessed(diseases);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span className="w-2 h-2 rounded-full bg-blue-500 pulse-dot" />
          Live board
        </div>
        <span className="text-xs text-slate-500">{data ? `Updated ${relativeTime(data.generatedAt)}` : "Loading"}</span>
      </div>

      {error && !data && <p className="text-sm text-slate-600">Live data is unavailable right now.</p>}

      <ol className="divide-y divide-slate-100">
        {diseases.slice(0, 5).map((d, i) => {
          const cases = caseCount(d);
          return (
            <li key={d.slug}>
              <Link href={`/dashboard/predictions/?disease=${d.slug}`} className="flex items-center gap-3 py-3 group">
                <span className="w-5 text-sm font-bold text-slate-400 tabular-nums">{i + 1}</span>
                <span className="text-2xl">{d.info.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 group-hover:underline">{d.name}</span>
                    <PhaseBadge phase={d.displayPhase} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {cases
                      ? `${cases.ytd?.toLocaleString("en-US")} US cases this year, ${versusLastYear(cases.ytd ?? 0, cases.ytdLastYear ?? 0)}`
                      : d.officialReports
                        ? `${d.officialReports} WHO outbreak ${d.officialReports === 1 ? "report" : "reports"} in 45 days`
                        : d.factors[0]}
                  </p>
                  <div className="mt-1.5">
                    <ScoreBar disease={d} />
                  </div>
                </div>
                <span className="text-lg font-bold text-slate-900 tabular-nums w-9 text-right">{d.score}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      {lead?.ai && (
        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 leading-snug">
          <span className="font-semibold text-slate-900">{lead.name}: </span>
          {lead.ai.summary} <SourceLinks urls={lead.ai.sources} />
          <span className="block text-xs text-slate-500 mt-1">Summary written by a small open-source AI from the linked source. It can make mistakes.</span>
        </div>
      )}
    </div>
  );
}

// Big year-to-date numbers from CDC case reports: the most concrete thing the site knows.
export function YearInNumbers() {
  const { diseases } = useLiveData();
  const rows = diseases
    .map((d) => ({ d, c: caseCount(d) }))
    .filter((x) => x.c?.ytd)
    .sort((a, b) => (b.c!.ytd! / (b.c!.ytdLastYear || 1)) - (a.c!.ytd! / (a.c!.ytdLastYear || 1)))
    .slice(0, 4);
  if (!rows.length) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {rows.map(({ d, c }) => (
        <Link key={d.slug} href={`/dashboard/predictions/?disease=${d.slug}`} className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-slate-300 transition">
          <div className="text-sm text-slate-500">{d.info.emoji} {d.name}</div>
          <div className="text-3xl font-black text-slate-900 mt-1 tabular-nums">{c!.ytd!.toLocaleString("en-US")}</div>
          <div className="text-sm text-slate-600 mt-1">US cases so far this year</div>
          <div className={`text-sm font-semibold mt-2 ${c!.ytd! > (c!.ytdLastYear ?? 0) ? "text-red-600" : "text-emerald-700"}`}>
            {versusLastYear(c!.ytd!, c!.ytdLastYear ?? 0)}
          </div>
        </Link>
      ))}
    </div>
  );
}
