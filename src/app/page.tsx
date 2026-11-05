import Link from "next/link";
import { Activity, ArrowRight, AlertTriangle, BarChart3, Bell, BookOpen, Globe2, ShieldCheck, Stethoscope } from "lucide-react";
import { LiveHero, YearInNumbers } from "@/components/live-hero";

const FEATURES = [
  { icon: BarChart3, title: "Peak score for 28 diseases", desc: "Each disease is compared with its own past two years, so you see what is unusual right now, not just what is common." },
  { icon: Activity, title: "Real case numbers", desc: "Weekly CDC case counts, US hospital admissions and WHO lab data count for the most. Attention alone can never mark a disease as peaking." },
  { icon: Bell, title: "Official alerts", desc: "The latest outbreak notices from WHO, ECDC, UKHSA and CDC in one list, filtered by region." },
  { icon: BookOpen, title: "Plain-English summaries", desc: "A free, open-source AI explains the numbers for the top 15 diseases. Every summary links the source it used." },
  { icon: ShieldCheck, title: "Prevention guides", desc: "What actually helps for each disease, from mosquito control to safe water and vaccines." },
  { icon: Stethoscope, title: "Symptom checker", desc: "Compare your symptoms with tracked diseases. It runs in your browser and nothing you type is sent anywhere." },
];

const STEPS = [
  { title: "Collect", desc: "Pull weekly case counts, hospital and lab data, outbreak reports and Wikipedia readership." },
  { title: "Score", desc: "Compare each disease with its own history, cap reporting backlogs, and weight real cases highest." },
  { title: "Explain", desc: "An open-source AI writes a short, cited summary. Any claim without a matching source is dropped." },
  { title: "Publish", desc: "The site rebuilds itself on GitHub every few hours. No servers, no keys, no cost." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-md shadow-blue-500/30 grid place-items-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">ViraWatch</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-slate-600">
            <a href="#numbers" className="hover:text-slate-900">This year</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
          </div>
          <Link href="/dashboard/" className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800">
            Open dashboard
          </Link>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
          <div>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4">Disease activity, updated every few hours</p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.02] mb-6">
              What&apos;s going around <span className="underline decoration-blue-500 decoration-8 underline-offset-8">right now</span>?
            </h1>
            <p className="text-lg text-slate-600 max-w-xl mb-8 leading-relaxed">
              ViraWatch reads real case reports, hospital data and official outbreak notices for 28 diseases, and shows which ones are at their peak today, with the numbers and sources behind every call.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard/" className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
                See what&apos;s peaking <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </Link>
              <Link href="/dashboard/alerts/" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-300 font-medium hover:bg-slate-100 transition">
                Official alerts
              </Link>
            </div>
            <dl className="grid grid-cols-3 gap-4 mt-10 max-w-md">
              {[
                ["28", "diseases tracked"],
                ["7", "public data sources"],
                ["$0", "open data, open AI"],
              ].map(([n, label]) => (
                <div key={label}>
                  <dt className="text-2xl font-black tabular-nums">{n}</dt>
                  <dd className="text-xs text-slate-500 mt-0.5">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <LiveHero />
        </div>
      </section>

      <section id="numbers" className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14">
          <h2 className="text-3xl font-black tracking-tight mb-2">This year in numbers</h2>
          <p className="text-slate-600 mb-8">Reported US cases so far in the year, against the same point last year. Source: CDC weekly notifiable disease reports.</p>
          <YearInNumbers />
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-5 md:px-8 py-16">
        <h2 className="text-3xl font-black tracking-tight mb-8">What you can do here</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white border border-slate-200 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 grid place-items-center mb-4">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold mb-1.5">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="bg-slate-900 text-slate-100">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16">
          <h2 className="text-3xl font-black tracking-tight mb-10">How it works</h2>
          <ol className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <div className="text-sm font-bold text-blue-400 mb-2">Step {i + 1}</div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 py-10">
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex gap-4 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            <strong>Medical disclaimer:</strong> ViraWatch gives general information about disease activity. A high score means a disease is unusually active compared with its own past, not that you personally are at risk. It is not medical advice; see a healthcare provider about your own health.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-2 text-slate-700">
          <Globe2 className="w-4 h-4" /> ViraWatch
        </div>
        Built on public data from CDC, WHO, ECDC, UKHSA, GDELT and Wikipedia. Updated automatically on GitHub.
      </footer>
    </div>
  );
}
