"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, relativeTime } from "@/lib/utils";
import { useLiveData } from "@/lib/live-data";
import {
  Activity,
  LayoutDashboard,
  BrainCircuit,
  ShieldCheck,
  Bell,
  Stethoscope,
  Database,
  Sparkles,
  X,
  Menu,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/dashboard/",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Peak Ranking",
    href: "/dashboard/predictions/",
    icon: BrainCircuit,
    badge: "LIVE",
  },
  {
    label: "Diseases",
    href: "/dashboard/diseases/",
    icon: Activity,
  },
  {
    label: "Prevention",
    href: "/dashboard/prevention/",
    icon: ShieldCheck,
  },
  {
    label: "Official Alerts",
    href: "/dashboard/alerts/",
    icon: Bell,
  },
  {
    label: "Symptom Checker",
    href: "/dashboard/symptom-checker/",
    icon: Stethoscope,
  },
  {
    label: "Data Sources",
    href: "/dashboard/sources/",
    icon: Database,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data, diseases } = useLiveData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const peaking = diseases.filter((d) => d.displayPhase === "peaking").length;

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 grid place-items-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">
            ViraWatch <span className="text-cyan-500">AI</span>
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 transition-transform",
          mobileOpen ? "translate-x-0" : "-translate-x-full invisible lg:visible lg:translate-x-0"
        )}
      >
        <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 grid place-items-center shadow-md">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">
              ViraWatch <span className="text-cyan-500">AI</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Intelligence
          </div>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition group",
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 pulse-dot">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 pb-4">
          <div className="rounded-xl p-3.5 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-semibold text-blue-900">
                {data ? `${peaking} peaking now` : "Loading live data"}
              </p>
            </div>
            <p className="text-[11px] text-blue-700/80 leading-snug">
              {data
                ? `Tracking ${diseases.length} diseases. Updated ${relativeTime(data.generatedAt)}, refreshed every ${data.updateEveryHours === 1 ? "hour" : `${data.updateEveryHours} hours`}.`
                : "Reading the latest update."}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
