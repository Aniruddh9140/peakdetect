"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LiveDisease } from "@/lib/live-data";

const SERIES = [
  { key: "cases", name: "Case data", color: "#2a78d6" },
  { key: "news", name: "News coverage", color: "#eb6834" },
  { key: "wiki", name: "Wikipedia readers", color: "#1baf7a" },
] as const;

const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// Signals have very different units, so each is indexed to its own high instead of using two axes.
export function TrendChart({ trend }: { trend: LiveDisease["trend"] }) {
  const present = SERIES.filter((s) => trend.some((row) => row[s.key] !== undefined));
  if (!present.length) return <p className="text-sm text-slate-500">No trend data yet.</p>;
  return (
    <div className="h-64" role="img" aria-label="Weekly trend for the past six months, each signal shown as a percentage of its own high">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            labelFormatter={(d) => `Week of ${shortDate(String(d))}`}
            formatter={(value, name) => [`${value}% of high`, name]}
            contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
          />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "#475569" }} />
          {present.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
