// Pure scoring logic: turns raw signal series into a 0-100 peak score and a phase.
// A score compares a disease with its own recent history, not with other diseases.

// Reported cases are the most reliable signal, so they carry the most weight.
const WEIGHTS = { surveillance: 0.5, wiki: 0.3, news: 0.2 };
const MIN_ARTICLES_PER_DAY = 5;
const PEAK_SCORE = 70;

const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round = (n, dp = 1) => Number(n.toFixed(dp));

// Where the latest `win` points sit against the rest of the series.
export function heat(series, win) {
  const v = series.filter(Number.isFinite);
  if (v.length < win * 5) return null;
  const rolling = v.slice(win - 1).map((_, i) => mean(v.slice(i, i + win)));
  const now = rolling.at(-1);
  const baseline = mean(v.slice(-win * 5, -win));
  const growth = baseline > 0 ? now / baseline - 1 : 0;
  const percentile = (rolling.filter((x) => x <= now).length / rolling.length) * 100;
  return {
    heat: round(0.7 * percentile + 0.3 * clamp(50 + 50 * growth)),
    growth: round(growth, 3),
    percentile: Math.round(percentile),
  };
}

// Small daily article counts swing wildly, so a rare disease needs real volume to read as hot.
export function dampNews(news, articlesPerDay) {
  return news && { ...news, heat: round(news.heat * Math.min(1, articlesPerDay / MIN_ARTICLES_PER_DAY)) };
}

// GDELT days with a tiny total are outages: dividing by them creates huge false spikes.
export function completeDays(days) {
  const totals = days.map((d) => d.norm).sort((a, b) => a - b);
  const typical = totals[totals.length >> 1];
  return days.filter((d) => d.norm >= typical / 2);
}

// CDC sometimes logs a backlog of old cases in one week (6,883 pertussis cases in week 29 of 2026,
// against about 250 normally), so a week counts as at most 3x the average of the 8 weeks before it.
// The average, not the median, because some diseases are reported in bursts with empty weeks between.
export function capSpikes(counts) {
  return counts.map((c, i) => {
    const prior = counts.slice(Math.max(0, i - 8), i);
    const average = prior.reduce((s, x) => s + x, 0) / prior.length;
    return prior.length >= 4 && average > 0 ? Math.min(c, 3 * average) : c;
  });
}

// CDC counts cases by MMWR week: Sunday to Saturday, week 1 being the first with 4+ days in January.
export function mmwrWeekEnd(year, week) {
  const dow = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const firstSunday = dow <= 3 ? -dow : 7 - dow;
  return new Date(Date.UTC(year, 0, 1 + firstSunday + (week - 1) * 7 + 6)).toISOString().slice(0, 10);
}

export function phaseOf(score, growth) {
  if (score >= PEAK_SCORE && growth > -0.15) return "peaking";
  if (score >= 45 && growth >= 0.25) return "rising";
  if (growth <= -0.2) return "falling";
  return "baseline";
}

export function score({ surveillance, news, wiki }, officialReports = 0) {
  // News and Wikipedia both measure attention, so "peaking" needs case data or a WHO report.
  const confirmed = Boolean(surveillance) || officialReports > 0;
  const parts = Object.entries({ surveillance, news, wiki }).filter(([, s]) => s);
  if (!parts.length) return null;
  const total = parts.reduce((a, [k]) => a + WEIGHTS[k], 0);
  const blend = (field) => parts.reduce((a, [k, s]) => a + WEIGHTS[k] * s[field], 0) / total;
  const value = clamp(blend("heat") + Math.min(officialReports * 5, 10));
  const growth = blend("growth");
  // The cap keeps an attention spike ranked below a confirmed outbreak.
  const capped = confirmed ? value : Math.min(value, PEAK_SCORE - 1);
  return { score: Math.round(capped), growth: round(growth, 3), phase: phaseOf(capped, growth) };
}

const multiple = (growth) => `${(1 + growth).toFixed(1)}x`;

export function factors({ news, wiki, surveillance }, officialReports, articlesPerDay) {
  const out = (surveillance ?? []).flatMap((s) => [
    `${s.label}: ${s.value.toLocaleString("en-US")}${s.unit} for the week of ${s.date}, ${s.change >= 0 ? "up" : "down"} ${Math.abs(s.change)}% on ${s.comparedWith ?? "the month before"}`,
    ...(s.ytd !== undefined ? [`${s.ytd.toLocaleString("en-US")} US cases so far this year, against ${s.ytdLastYear.toLocaleString("en-US")} by this time last year`] : []),
  ]);
  if (news) out.push(`News coverage is ${multiple(news.growth)} its previous 4 weeks (about ${Math.round(articlesPerDay)} English articles a day, up to ${news.through})`);
  if (wiki) out.push(`Wikipedia readership is at the ${wiki.percentile}th percentile of the past year`);
  if (officialReports) out.push(`WHO published ${officialReports} Disease Outbreak News ${officialReports === 1 ? "report" : "reports"} in the last 45 days`);
  return out;
}

const COUNTRIES = {
  "North America": "United States|U\\.S\\.|US|USA|America|Canada|Mexico|California|Texas|New York|Florida",
  "Latin America": "Brazil|Argentina|Colombia|Peru|Chile|Bolivia|Ecuador|Venezuela|Paraguay|Cuba|Haiti|Dominican Republic|Guatemala|Honduras|Caribbean|Latin America",
  Europe: "Europe|EU|EEA|UK|United Kingdom|England|Scotland|Wales|Ireland|France|Germany|Italy|Spain|Portugal|Netherlands|Belgium|Poland|Romania|Greece|Sweden|Ukraine",
  Africa: "Africa|Nigeria|Kenya|Uganda|Ethiopia|Sudan|South Sudan|Ghana|Tanzania|Rwanda|Burundi|Angola|Zambia|Malawi|Mozambique|Zimbabwe|Chad|Mali|Niger|Cameroon|Somalia|Democratic Republic of the Congo|DRC|Congo|Guinea|Sierra Leone|Liberia|South Africa",
  "Middle East": "Middle East|Saudi Arabia|Iran|Iraq|Yemen|Syria|Lebanon|Jordan|Israel|Gaza|Egypt|Turkey|UAE",
  "South Asia": "South Asia|India|Kerala|Pakistan|Bangladesh|Nepal|Sri Lanka|Afghanistan|Bhutan|Maldives",
  "Southeast Asia": "Southeast Asia|Indonesia|Philippines|Vietnam|Thailand|Malaysia|Singapore|Myanmar|Cambodia|Laos",
  "East Asia": "China|Hong Kong|Japan|South Korea|Korea|Taiwan|Mongolia",
  Oceania: "Australia|New Zealand|Fiji|Papua New Guinea|Pacific Islands|Samoa",
};
const REGION_PATTERNS = Object.entries(COUNTRIES).map(([region, names]) => [region, new RegExp(`\\b(${names})\\b`)]);

// Case-sensitive so that "us" in a sentence is not read as the United States.
export const regionsIn = (title) => REGION_PATTERNS.filter(([, re]) => re.test(title)).map(([region]) => region);

// Weekly buckets keyed by Monday, each signal scaled so its own maximum is 100.
export function weekly(daily) {
  const weeks = new Map();
  for (const [date, value] of daily) {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = d.toISOString().slice(0, 10);
    weeks.set(key, [...(weeks.get(key) ?? []), value]);
  }
  return [...weeks].sort(([a], [b]) => a.localeCompare(b)).map(([date, vs]) => [date, mean(vs)]);
}

export function trendTable(seriesByName, weeks = 26) {
  const rows = new Map();
  for (const [name, series] of Object.entries(seriesByName)) {
    if (!series?.length) continue;
    const top = Math.max(...series.map(([, v]) => v)) || 1;
    for (const [date, v] of series) rows.set(date, { ...rows.get(date), date, [name]: Math.round((v / top) * 100) });
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-weeks);
}
