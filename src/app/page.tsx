import Link from "next/link";
import {
  Activity,
  Shield,
  Brain,
  Globe2,
  Bell,
  TrendingUp,
  Database,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { LiveHero } from "@/components/live-hero";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-10 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 grid place-items-center shadow-lg shadow-blue-500/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">
            ViraWatch <span className="text-cyan-400">AI</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#how" className="hover:text-white transition">How it works</a>
        </div>
        <Link
          href="/dashboard/"
          className="text-sm px-4 py-2 rounded-lg bg-white text-slate-900 font-medium hover:bg-slate-100 transition shadow-lg"
        >
          Open dashboard
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-12 pb-24 md:pt-20 md:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-400 pulse-dot" />
              Updates every hour from public health data
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
              What&apos;s going around
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                right now?
              </span>
            </h1>
            <p className="text-lg text-slate-300 max-w-xl mb-8 leading-relaxed">
              ViraWatch AI tracks which diseases are at their peak today. It reads WHO and CDC data, English-language news and Wikipedia readership, then an AI reads the latest official reports and explains what is happening, with sources you can check.
            </p>
            <Link
              href="/dashboard/"
              className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition"
            >
              See what&apos;s peaking
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          <LiveHero />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 md:px-10 py-20 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Real data, checkable sources
          </h2>
          <p className="text-slate-400">
            Every score comes from public data, and every AI assessment links to the sources it used.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: TrendingUp, title: "Peak detection", desc: "Each disease is compared with its own past year, so you can see what is unusually high right now.", color: "from-red-500 to-pink-500" },
            { icon: Brain, title: "AI briefing", desc: "On every update a free, open AI model reads the latest WHO and health-agency reports, checks them against the signals and writes a short briefing.", color: "from-purple-500 to-pink-500" },
            { icon: Globe2, title: "Global coverage", desc: "28 diseases, from flu and dengue to Ebola and Nipah. Region filters show diseases named in reports from that region; scores themselves are worldwide.", color: "from-blue-500 to-cyan-500" },
            { icon: Bell, title: "Official alerts", desc: "The latest outbreak notices from WHO, ECDC, UKHSA and CDC, gathered in one place.", color: "from-amber-500 to-orange-500" },
            { icon: Shield, title: "Prevention guidance", desc: "Practical steps for each disease, including what actually helps against mosquitoes, water and airborne spread.", color: "from-emerald-500 to-teal-500" },
            { icon: Database, title: "Symptom checker", desc: "Match your symptoms against tracked diseases in your browser. Nothing you enter leaves your device.", color: "from-indigo-500 to-purple-500" },
          ].map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.07] transition"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} grid place-items-center mb-4 shadow-lg`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 md:px-10 py-20 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            How it works
          </h2>
          <p className="text-slate-400">
            The whole process runs automatically, with no one updating it by hand.
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Collect", desc: "Pull hospital and lab data, outbreak notices, news volume and Wikipedia readership." },
            { step: "02", title: "Score", desc: "Compare each disease with its own recent history to get a 0-100 peak score." },
            { step: "03", title: "Research", desc: "AI reads official reports, checks the strongest signals and cites what it used." },
            { step: "04", title: "Publish", desc: "The site rebuilds with the new data, and open pages refresh themselves." },
          ].map((s, i) => (
            <div key={s.step} className="relative">
              <div className="text-6xl font-bold text-white/10 mb-2">{s.step}</div>
              <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              {i < 3 && <ArrowRight className="hidden md:block absolute -right-3 top-6 w-5 h-5 text-white/20" />}
            </div>
          ))}
        </div>
      </section>

      {/* Warning banner */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 flex gap-4 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-100/90">
            <strong className="text-amber-300">Medical disclaimer:</strong> ViraWatch AI gives general information about disease activity. It is not a substitute for professional medical advice, diagnosis, or treatment. A high score does not mean you are at risk personally. Always consult a qualified healthcare provider for medical concerns.
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 mt-10 py-10 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-slate-300">ViraWatch AI</span>
          </div>
          <p>Built on public data from WHO, CDC, ECDC, UKHSA, GDELT and Wikipedia.</p>
        </div>
      </footer>
    </div>
  );
}
