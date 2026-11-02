import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export const PHASE_STYLES: Record<string, { bg: string; text: string; solid: string; gradient: string; label: string; icon: string }> = {
  peaking: {
    bg: "bg-red-50",
    text: "text-red-700",
    solid: "bg-red-500",
    gradient: "from-red-500 to-rose-700",
    label: "Peaking",
    icon: "▲",
  },
  rising: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    solid: "bg-orange-500",
    gradient: "from-orange-400 to-orange-600",
    label: "Rising",
    icon: "↗",
  },
  baseline: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    solid: "bg-slate-400",
    gradient: "from-slate-300 to-slate-500",
    label: "Normal",
    icon: "→",
  },
  falling: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    solid: "bg-emerald-500",
    gradient: "from-emerald-400 to-emerald-600",
    label: "Falling",
    icon: "↘",
  },
};
