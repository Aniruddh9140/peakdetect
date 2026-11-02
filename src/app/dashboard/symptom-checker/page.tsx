"use client";

import { useState } from "react";
import { AlertTriangle, Clock, Search, Stethoscope, Thermometer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { CATALOG } from "@/lib/live-data";
import { checkSymptoms, type SymptomInput } from "@/lib/symptoms";
import { cn } from "@/lib/utils";

const COMMON_SYMPTOMS = [
  "fever", "cough", "sore throat", "runny nose", "sneezing",
  "headache", "muscle aches", "fatigue", "chills", "shortness of breath",
  "chest pain", "nausea", "vomiting", "diarrhea", "stomach pain",
  "rash", "itchy eyes", "congestion", "loss of taste/smell", "joint pain",
  "wheezing", "swollen lymph nodes", "dizziness", "neck stiffness",
  "confusion", "bleeding", "fainting", "jaundice",
];

const SEVERITIES = [
  { value: "mild", label: "Mild", desc: "Manageable at home" },
  { value: "moderate", label: "Moderate", desc: "Disrupting daily activity" },
  { value: "severe", label: "Severe", desc: "Need medical attention" },
] as const;

export default function SymptomCheckerPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState("");
  const [severity, setSeverity] = useState<SymptomInput["severity"]>("mild");
  const [temperature, setTemperature] = useState("");
  const [duration, setDuration] = useState("1");
  const [result, setResult] = useState<ReturnType<typeof checkSymptoms> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(symptom: string) {
    const next = new Set(selected);
    if (next.has(symptom)) next.delete(symptom);
    else next.add(symptom);
    setSelected(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const symptoms = [...selected, ...custom.split(",").map((s) => s.trim()).filter(Boolean)];
    if (symptoms.length === 0) {
      setError("Please select at least one symptom.");
      return;
    }
    setError(null);
    setResult(
      checkSymptoms(
        { symptoms, severity, temperature: temperature ? Number(temperature) : undefined, durationDays: Number(duration) },
        CATALOG
      )
    );
  }

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Stethoscope className="w-7 h-7 text-purple-600" />
          Symptom Checker
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Compare your symptoms with the diseases we track. This runs in your browser and nothing you enter is sent anywhere. It cannot diagnose you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your symptoms</CardTitle>
            <CardDescription>Select all that apply</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SYMPTOMS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggle(s)}
                    aria-pressed={selected.has(s)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition border",
                      selected.has(s)
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="custom" className="block text-sm font-medium text-slate-700 mb-2">Other symptoms (comma-separated)</label>
                <input
                  id="custom"
                  type="text"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="e.g., night sweats, sensitivity to light"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="temperature" className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4" />
                    Temperature in °C (optional)
                  </label>
                  <input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="33"
                    max="45"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="e.g. 38.5"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
                <div>
                  <label htmlFor="duration" className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Days with symptoms
                  </label>
                  <input
                    id="duration"
                    type="number"
                    min="0"
                    max="60"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">How severe are your symptoms?</div>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSeverity(s.value)}
                      aria-pressed={severity === s.value}
                      className={cn(
                        "p-3 rounded-lg border text-left transition",
                        severity === s.value
                          ? s.value === "severe"
                            ? "bg-red-50 border-red-300 ring-2 ring-red-200"
                            : s.value === "moderate"
                            ? "bg-amber-50 border-amber-300 ring-2 ring-amber-200"
                            : "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="font-semibold text-sm text-slate-900">{s.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex gap-2 items-start">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700">
                <Search className="w-4 h-4" />
                Compare symptoms
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          {result ? (
            <>
              <CardHeader>
                <CardTitle className="text-base">Possible matches</CardTitle>
                <CardDescription>How much your symptoms overlap, not how likely each one is</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.seekCare && (
                  <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-red-800 text-sm">Seek medical attention</div>
                      <p className="text-xs text-red-700 mt-0.5">{result.advice}</p>
                    </div>
                  </div>
                )}
                {result.matches.length === 0 && <p className="text-sm text-slate-500">None of the tracked diseases match these symptoms.</p>}
                <div className="space-y-2">
                  {result.matches.map((m) => (
                    <div key={m.slug} className="p-2.5 rounded-lg bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900 truncate">{m.name}</span>
                        <span className="text-sm font-bold text-slate-900">{m.match}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                        <div className="h-full rounded-full bg-purple-500" style={{ width: `${m.match}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {!result.seekCare && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800 leading-relaxed">{result.advice}</div>
                )}
              </CardContent>
            </>
          ) : (
            <EmptyState icon={Stethoscope} title="Ready when you are" description="Select your symptoms and press Compare symptoms." />
          )}
        </Card>
      </div>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>Medical disclaimer:</strong> This tool only matches words against a list of diseases. It does not replace a doctor. If you think you have a medical emergency, call your local emergency number now.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
