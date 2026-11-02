export type SymptomInput = {
  symptoms: string[];
  severity: "mild" | "moderate" | "severe";
  temperature?: number;
  durationDays: number;
};

export type Profile = { name: string; slug: string; symptoms: string[]; severity: string };

export type Match = { name: string; slug: string; match: number; severity: string; hits: number };

// Symptoms that need a clinician whatever the disease match says, in the words people actually type.
const RED_FLAG = /breath|chest|stiff|confus|seiz|unconscious|faint|pass(ed|ing) out|bleed|blood|jaundice|yellow (skin|eyes)|weak|paraly|blue lips|drows/i;
const HIGH_FEVER_C = 39.5;
const MIN_HITS_FOR_CRITICAL = 4; // "fever" alone must not raise an Ebola warning

const overlaps = (a: string, b: string) => a.includes(b) || b.includes(a);

export function checkSymptoms(input: SymptomInput, profiles: Profile[]) {
  const reported = input.symptoms.map((s) => s.trim().toLowerCase()).filter(Boolean);
  const hasFever = reported.includes("fever") || (input.temperature ?? 0) >= 38;

  const all: Match[] = profiles
    .map((p) => {
      const hits = reported.filter((s) => p.symptoms.some((known) => overlaps(s, known))).length;
      // Mostly "how much of what you report does it explain", and one symptom alone proves little.
      const fit = 0.7 * (hits / reported.length) + 0.3 * (hits / p.symptoms.length);
      const fever = hasFever && p.symptoms.includes("fever") ? 0.05 : 0;
      const value = hits ? Math.min(0.95, (fit + fever) * Math.min(1, reported.length / 3)) : 0;
      return { name: p.name, slug: p.slug, severity: p.severity, hits, match: Math.round(value * 100) };
    })
    .filter((m) => m.match > 0)
    .sort((a, b) => b.match - a.match);
  const matches = all.slice(0, 5);

  const flagged = reported.filter((s) => RED_FLAG.test(s));
  const seekCare =
    input.severity === "severe" ||
    flagged.length > 0 ||
    (input.temperature ?? 0) >= HIGH_FEVER_C ||
    all.some((m) => m.severity === "critical" && m.hits >= MIN_HITS_FOR_CRITICAL);

  const serious = matches.find((m) => ["severe", "critical"].includes(m.severity) && m.match >= 40);
  const caution = `${serious ? ` If you have been somewhere ${serious.name} spreads, see a doctor and say so.` : ""} Babies, older adults and pregnant people should see a doctor sooner.`;

  const advice = seekCare
    ? flagged.length
      ? `Please get medical care soon: ${flagged.join(", ")} can be a sign of something serious.`
      : "Please get medical care soon. Your answers suggest this should be checked by a clinician."
    : input.durationDays >= 7
      ? "Symptoms lasting a week or more are worth checking with a doctor."
      : "Rest, drink fluids and watch how you feel. See a doctor if you get worse or are not better after a few days.";

  return { matches, seekCare, advice: seekCare ? advice : advice + caution };
}
