// Runs on a schedule in GitHub Actions: collects live signals, scores each disease,
// asks a free open AI model for a cited briefing and writes public/data/latest.json for the site.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { capSpikes, completeDays, dampNews, factors, heat, mmwrWeekEnd, regionsIn, score, trendTable, weekly } from "./analyze.mjs";
import { MODEL, writeBriefing } from "./briefing.mjs";

const OUTPUT = "public/data/latest.json";
const USER_AGENT = "ViraWatch/1.0 (open-source disease dashboard)";
const DAY = 86_400_000;

const AI_EVERY_MS = 0; // the free model runs on every update; raise this to run it less often
const AI_TOP = 15; // diseases the AI summarises, highest score first
const GDELT_BUDGET_MS = Number(process.env.GDELT_BUDGET_MS ?? 15 * 60_000);
const GDELT_GAP_MS = 6_000;
const NEWS_MAX_AGE = 3 * DAY;
const WHO_REPORT_WINDOW = 45 * DAY;
const MIN_SCORED = 24; // losing more than a few means a source broke, so keep the last good file
const NEWS_MAX_LAG = 4 * DAY; // GDELT is normally a day behind; more means its index has stalled
const WIKIPEDIA_GAP_MS = 700;
const ALERT_WINDOW = 90 * DAY;
const ALERT_WORDS = /outbreak|cases|alert|surge|rise|rising|increase|epidemic/i;
const WIKIPEDIA_BUDGET_MS = 5 * 60_000;
const AI_MAX_AGE = 3 * DAY; // an older briefing would contradict fresh data, so it is dropped

const catalog = JSON.parse(await readFile("src/data/diseases.json", "utf8"));
const diseases = catalog.map((d) => ({ ...d, re: new RegExp(d.keywords, "i") }));
const previous = await readFile(OUTPUT, "utf8").then(JSON.parse).catch(() => null);
const previousBySlug = new Map((previous?.diseases ?? []).map((d) => [d.slug, d]));

const sources = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isoDay = (t) => new Date(t).toISOString().slice(0, 10);

async function get(url, parse = "json", tries = 4) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(60_000) });
  const retryAfter = res.headers.get("retry-after");
  if (res.status === 429 && retryAfter && tries > 1) {
    await sleep(Math.min(Number(retryAfter) || 5, 60) * 1000 + 500);
    return get(url, parse, tries - 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parse === "json" ? res.json() : res.text();
}

// One failed source must never stop the run; its status is shown on the Data Sources page.
async function track(name, url, kind, fn) {
  const entry = { name, url, kind, ok: false, items: 0, checkedAt: new Date().toISOString() };
  sources.push(entry);
  try {
    const result = await fn();
    entry.ok = true;
    entry.items = result.length ?? result.size ?? 1;
    return result;
  } catch (e) {
    entry.error = String([e.message ?? e, e.cause?.code ?? e.cause?.message].filter(Boolean).join(": ")).slice(0, 200);
    console.warn(`::warning::${name}: ${entry.error}`);
    return null;
  }
}

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

// shortcut: regex RSS/Atom parsing, handles these three feeds only; use a real XML parser if more are added
function parseFeed(xml, source) {
  return [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/g)].map(([block]) => {
    const tag = (name) => block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1];
    const url = decode(tag("link") ?? block.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? "");
    const date = new Date(decode(tag("pubDate") ?? tag("updated") ?? tag("published") ?? ""));
    return { title: decode(tag("title") ?? ""), url, source, date: isNaN(date) ? null : isoDay(date) };
  });
}

async function who() {
  const url = "https://www.who.int/api/news/diseaseoutbreaknews?$top=30&$orderby=PublicationDateAndTime%20desc&$select=Title,OverrideTitle,UseOverrideTitle,PublicationDateAndTime,ItemDefaultUrl,Summary";
  const { value } = await get(url);
  return value.map((r) => ({
    title: r.UseOverrideTitle ? r.OverrideTitle : r.Title,
    url: `https://www.who.int/emergencies/disease-outbreak-news/item${r.ItemDefaultUrl}`,
    source: "WHO",
    date: isoDay(r.PublicationDateAndTime),
    summary: decode(r.Summary ?? "").slice(0, 600),
  }));
}

const feed = (name, url) =>
  track(name, url, "headlines", async () => {
    const cutoff = isoDay(Date.now() - ALERT_WINDOW);
    const items = parseFeed(await get(url, "text"), name)
      .filter((i) => i.date >= cutoff)
      // UKHSA lists upcoming releases too; an announcement of a future report is not evidence.
      .filter((i) => !i.url.includes("/statistics/announcements/"))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 40);
    if (!items.length) throw new Error(`no items in the last ${ALERT_WINDOW / DAY} days`);
    return items;
  });

async function cdcAdmissions() {
  const url = "https://data.cdc.gov/resource/ua7e-t2fy.json?jurisdiction=USA&$select=weekendingdate,totalconfflunewadm,totalconfc19newadm,totalconfrsvnewadm&$order=weekendingdate%20DESC&$limit=56";
  return (await get(url)).reverse();
}

// Lab results reported to WHO by country, summed into one global positivity rate per week.
async function fluNet() {
  const since = isoDay(Date.now() - 400 * DAY);
  const url = `https://xmart-api-public.who.int/FLUMART/VIW_FNT?$filter=ISO_WEEKSTARTDATE%20ge%20${since}&$select=ISO_WEEKSTARTDATE,INF_ALL,SPEC_PROCESSED_NB,RSV,RSV_PROCESSED&$format=json`;
  const weeks = new Map();
  for (const r of (await get(url)).value) {
    const w = weeks.get(r.ISO_WEEKSTARTDATE) ?? { date: r.ISO_WEEKSTARTDATE, flu: 0, fluTests: 0, rsv: 0, rsvTests: 0 };
    w.flu += r.INF_ALL ?? 0;
    w.fluTests += r.SPEC_PROCESSED_NB ?? 0;
    w.rsv += r.RSV ?? 0;
    w.rsvTests += r.RSV_PROCESSED ?? 0;
    weeks.set(r.ISO_WEEKSTARTDATE, w);
  }
  const rows = [...weeks.values()].sort((a, b) => a.date.localeCompare(b.date));
  // The last two weeks are still filling in; a partly reported week would distort the rate.
  const typical = (key) => rows.slice(-10, -2).reduce((a, r) => a + r[key], 0) / 8;
  const [flu, rsv] = [typical("fluTests"), typical("rsvTests")];
  const complete = (r) => r.fluTests >= 0.75 * flu && r.rsvTests >= 0.75 * rsv;
  return [...rows.slice(0, -2), ...rows.slice(-2).filter(complete)];
}

// CDC's weekly notifiable-disease table: reported US cases by MMWR week for many diseases.
async function nndss() {
  const year = new Date().getUTCFullYear();
  const labels = diseases.filter((d) => d.nndss).map((d) => `'${d.nndss}'`).join(",");
  const where = `states='U.S. Residents' AND year in('${year - 1}','${year}') AND label in(${labels})`;
  return get(`https://data.cdc.gov/resource/x9gk-5huc.json?$select=year,week,label,m1,m3,m4&$where=${encodeURIComponent(where)}&$limit=5000`);
}

const MIN_WEEKLY_CASES = 3; // below this a few scattered cases would read as a trend

function reportedCases(rows, label, url) {
  const weeks = (rows ?? [])
    .filter((r) => r.label === label)
    .map((r) => ({ year: r.year, date: mmwrWeekEnd(Number(r.year), Number(r.week)), ytd: Number(r.m3 ?? 0), ytdLastYear: Number(r.m4 ?? 0) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  // The "current week" column is patchy (dengue's adds up to under a tenth of its year total), so
  // a week's cases are the rise in the year-to-date total, which also picks up late reports.
  weeks.forEach((w, i) => {
    const before = weeks[i - 1];
    w.count = Math.max(0, w.ytd - (before?.year === w.year ? before.ytd : 0));
  });
  // The latest two weeks are still being reported, so their counts run low.
  const complete = weeks.slice(0, -2);
  const counts = capSpikes(complete.map((w) => w.count));
  const recent = counts.slice(-52);
  if (!recent.length || recent.reduce((a, c) => a + c, 0) / recent.length < MIN_WEEKLY_CASES) return null;
  // Weekly counts are noisy and some states report in bursts, so the reading is the latest
  // 8-week average against the rest of the past two years.
  const h = heat(counts, 8);
  if (!h) return null;
  const average = Math.round(counts.slice(-8).reduce((a, c) => a + c, 0) / 8);
  return {
    label: "US reported cases (CDC, 8-week average)",
    value: average,
    unit: " a week",
    date: complete.at(-1).date,
    change: Math.round(h.growth * 100),
    comparedWith: "the 8 months before",
    url,
    ...h,
    series: complete.map((w, i) => [w.date, counts[i]]),
    ytd: weeks.at(-1).ytd,
    ytdLastYear: weeks.at(-1).ytdLastYear,
  };
}

function surveillanceFor(rows, field, label, unit, url, value = (r) => Number(r[field])) {
  const series = (rows ?? []).map((r) => [(r.date ?? r.weekendingdate).slice(0, 10), value(r)]).filter(([, v]) => Number.isFinite(v));
  const h = heat(series.map(([, v]) => v), 1);
  if (!h) return null;
  const [date, latest] = series.at(-1);
  return { label, value: Math.round(latest * 10) / 10, unit, date, change: Math.round(h.growth * 100), url, ...h, series };
}

async function wikipedia(article) {
  const end = new Date(Date.now() - DAY).toISOString().slice(0, 10).replaceAll("-", "");
  const start = new Date(Date.now() - 366 * DAY).toISOString().slice(0, 10).replaceAll("-", "");
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(article)}/daily/${start}/${end}`;
  const { items } = await get(url);
  return items.map((i) => [`${i.timestamp.slice(0, 4)}-${i.timestamp.slice(4, 6)}-${i.timestamp.slice(6, 8)}`, i.views]);
}

async function gdelt(query, mode, extra = "") {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`${query} sourcelang:eng`)}&mode=${mode}&format=json${extra}`;
  const body = await get(url, "text");
  return JSON.parse(body);
}

async function newsTimeline(d) {
  const { timeline } = await gdelt(d.gdelt, "timelinevolraw", "&timespan=3m");
  const days = completeDays(timeline[0].data).map((x) => ({ ...x, date: `${x.date.slice(0, 4)}-${x.date.slice(4, 6)}-${x.date.slice(6, 8)}` }));
  const through = days.at(-1)?.date;
  if (!through || Date.now() - Date.parse(through) > NEWS_MAX_LAG) throw new Error(`STALE: GDELT has no complete day since ${through ?? "its last update"}`);
  const rate = days.map((x) => [x.date, (x.value / x.norm) * 1e6]);
  const perDay = days.slice(-7).reduce((a, x) => a + x.value, 0) / 7;
  const signal = dampNews(heat(rate.map(([, v]) => v), 7), perDay);
  if (!signal) throw new Error("too few days");
  return { ...signal, perDay: Math.round(perDay), through, fetchedAt: new Date().toISOString(), series: weekly(rate).map(([date, v]) => [date, Math.round(v * 10) / 10]) };
}

// GDELT allows very few requests and often answers 429, so work through the stalest
// diseases first until the time budget is spent. The rest keep their recent reading.
async function collectNews() {
  const news = new Map();
  const age = (d) => Date.parse(previousBySlug.get(d.slug)?.signals?.news?.fetchedAt ?? "1970-01-01");
  const queue = [...diseases].sort((a, b) => age(a) - age(b));
  const articles = [];
  const deadline = Date.now() + GDELT_BUDGET_MS;
  let requests = 0;
  let failures = 0;
  let stale = null;

  // The last minute is kept for the article lists below.
  while (queue.length && Date.now() < deadline - 60_000) {
    const d = queue.shift();
    requests++;
    try {
      news.set(d.slug, await newsTimeline(d));
    } catch (e) {
      // A stalled index is stalled for every disease, so stop instead of spending the budget.
      if (e.message.startsWith("STALE")) {
        stale = e.message.slice(7);
        break;
      }
      failures++;
      queue.push(d);
    }
    await sleep(GDELT_GAP_MS);
  }

  for (const query of ['(outbreak OR epidemic)', '("disease outbreak" OR "health emergency")']) {
    if (Date.now() >= deadline) break;
    requests++;
    try {
      const res = await gdelt(query, "artlist", "&timespan=7d&maxrecords=120&sort=hybridrel");
      articles.push(...(res.articles ?? []).map((a) => ({
        title: a.title,
        url: a.url,
        source: a.domain,
        date: `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}`,
      })));
    } catch {
      failures++;
    }
    await sleep(GDELT_GAP_MS);
  }

  sources.push({
    name: "GDELT global news index",
    url: "https://www.gdeltproject.org/",
    kind: "news volume",
    ok: news.size > 0 && !stale,
    items: news.size,
    checkedAt: new Date().toISOString(),
    ...(stale
      ? { error: `${stale}, so news is left out of scores until it catches up` }
      : failures
        ? { error: `${failures} of ${requests} requests rate-limited; older readings kept where recent` }
        : {}),
  });
  return { news, articles };
}

function carriedNews(slug, fresh) {
  const old = previousBySlug.get(slug)?.signals?.news;
  const current = (n) => n && Date.now() - Date.parse(n.fetchedAt) < NEWS_MAX_AGE && Date.now() - Date.parse(n.through) < NEWS_MAX_LAG;
  return fresh ?? (current(old) ? old : null);
}

async function main() {
  // If WHO is down, last run's reports stand in so scores and alerts do not drop for one run.
  const whoReports =
    (await track("WHO Disease Outbreak News", "https://www.who.int/emergencies/disease-outbreak-news", "official alerts", who)) ??
    (previous?.alerts ?? []).filter((a) => a.source === "WHO");
  const feeds = (
    await Promise.all([
      feed("ECDC", "https://www.ecdc.europa.eu/en/taxonomy/term/1307/feed"),
      feed("UK Health Security Agency", "https://www.gov.uk/government/organisations/uk-health-security-agency.atom"),
      feed("CDC Newsroom", "https://tools.cdc.gov/api/v2/resources/media/132608.rss"),
    ])
  ).flatMap((f) => f ?? []);

  const cdcUrl = "https://data.cdc.gov/Public-Health-Surveillance/Weekly-Hospital-Respiratory-Data-HRD-Metrics-by-Ju/ua7e-t2fy";
  const fluNetUrl = "https://www.who.int/tools/flunet";
  const admissions = await track("CDC hospital admissions (US)", cdcUrl, "case data", cdcAdmissions);
  const lab = await track("WHO FluNet (global lab data)", fluNetUrl, "case data", fluNet);

  const surveillance = {
    influenza: [
      surveillanceFor(lab, "flu", "Global flu test positivity", "%", fluNetUrl, (r) => (r.flu / r.fluTests) * 100),
      surveillanceFor(admissions, "totalconfflunewadm", "US flu hospital admissions", "", cdcUrl),
    ],
    rsv: [
      surveillanceFor(lab, "rsv", "Global RSV test positivity", "%", fluNetUrl, (r) => (r.rsvTests ? (r.rsv / r.rsvTests) * 100 : NaN)),
      surveillanceFor(admissions, "totalconfrsvnewadm", "US RSV hospital admissions", "", cdcUrl),
    ],
    "covid-19": [surveillanceFor(admissions, "totalconfc19newadm", "US COVID-19 hospital admissions", "", cdcUrl)],
  };
  const nndssUrl = "https://data.cdc.gov/NNDSS/NNDSS-Weekly-Data/x9gk-5huc";
  const notifiable = await track("CDC weekly reported cases (US)", nndssUrl, "case data", nndss);
  for (const d of diseases.filter((x) => x.nndss)) (surveillance[d.slug] ??= []).push(reportedCases(notifiable, d.nndss, nndssUrl));

  const pageviews = await track("Wikipedia pageviews", "https://wikimedia.org/api/rest_v1/", "public interest", async () => {
    const all = new Map();
    const stop = Date.now() + WIKIPEDIA_BUDGET_MS;
    for (const d of diseases) {
      if (Date.now() > stop) break;
      try {
        all.set(d.slug, await wikipedia(d.wiki));
      } catch (e) {
        console.warn(`::warning::Wikipedia ${d.wiki}: ${e.message}`);
      }
      await sleep(WIKIPEDIA_GAP_MS);
    }
    if (!all.size) throw new Error("no articles returned");
    return all;
  });

  const { news, articles } = await collectNews();
  const headlines = [...whoReports, ...feeds, ...articles].filter((h) => h.title && /^https?:\/\//.test(h.url));
  const reportCutoff = isoDay(Date.now() - WHO_REPORT_WINDOW);

  const rows = diseases.flatMap((d) => {
    const mentions = headlines.filter((h) => d.re.test(h.title));
    const official = whoReports.filter((r) => d.re.test(r.title) && r.date >= reportCutoff).length;
    const views = pageviews?.get(d.slug);
    const newsSignal = carriedNews(d.slug, news.get(d.slug));
    const wiki = views ? heat(views.map(([, v]) => v), 7) : null;
    const cases = (surveillance[d.slug] ?? []).filter(Boolean);
    const caseSignal = cases.length ? { heat: Math.max(...cases.map((c) => c.heat)), growth: cases.reduce((a, c) => a + c.growth, 0) / cases.length } : null;

    const result = score({ surveillance: caseSignal, news: newsSignal, wiki }, official);
    if (!result) return [];

    const regions = {};
    for (const h of mentions) for (const r of regionsIn(h.title)) regions[r] = (regions[r] ?? 0) + 1;

    const seen = new Set();
    return [{
      slug: d.slug,
      name: d.name,
      ...result,
      previousScore: previousBySlug.get(d.slug)?.score ?? null,
      factors: factors({ news: newsSignal, wiki, surveillance: cases }, official, newsSignal?.perDay ?? 0),
      officialReports: official,
      regions,
      signals: { news: newsSignal, wiki, surveillance: cases.map(({ series, ...c }) => c) },
      trend: trendTable({
        news: newsSignal?.series,
        wiki: views ? weekly(views) : null,
        cases: cases[0] && weekly(cases[0].series),
      }),
      articles: mentions
        .filter((h) => !seen.has(h.title) && seen.add(h.title))
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .slice(0, 6)
        .map(({ title, url, source, date }) => ({ title, url, source, date })),
    }];
  });

  if (rows.length < MIN_SCORED) throw new Error(`only ${rows.length} diseases scored; keeping the last good data`);
  rows.sort((a, b) => b.score - a.score);

  const fresh = (briefing) => briefing && Date.now() - Date.parse(briefing.generatedAt) < AI_MAX_AGE;
  let ai = fresh(previous?.ai) ? previous.ai : null;
  // Counting attempts, not successes, stops a failing briefing from being retried on every run.
  let aiAttemptedAt = previous?.aiAttemptedAt ?? previous?.ai?.generatedAt ?? null;
  // The workflow starts the model and sets OLLAMA_URL; a local run without it skips the briefing.
  const ollama = process.env.OLLAMA_URL;
  const [aiName, aiUrl] = ["Built-in AI (Qwen3 4B, open model)", "https://ollama.com/library/qwen3"];
  if (ollama && Date.now() - Date.parse(aiAttemptedAt ?? "1970-01-01") > AI_EVERY_MS) {
    aiAttemptedAt = new Date().toISOString();
    // Only official and expert sources go in: open-web headlines are an injection risk.
    const recent = [...whoReports, ...feeds].filter((h) => (h.date ?? "") >= isoDay(Date.now() - 14 * DAY));
    // Each disease cites its own reports plus the data pages its facts come from, so every one of
    // the top diseases has something real to cite. The #slug keeps a shared data page apart per disease.
    const withEvidence = rows.slice(0, AI_TOP).map((row) => {
      const d = diseases.find((x) => x.slug === row.slug);
      const reports = recent
        .filter((h) => d.re.test(h.title))
        .slice(0, 3)
        .map((h) => ({ url: h.url, title: `${h.source}, ${h.date}: ${h.title}`, summary: h.summary }));
      const data = [
        ...row.signals.surveillance.map((s) => ({ url: `${s.url}#${row.slug}`, title: `${row.name}: ${s.label}` })),
        ...(row.signals.wiki ? [{ url: `https://pageviews.wmcloud.org/?project=en.wikipedia.org&range=latest-90&pages=${d.wiki}`, title: `${row.name}: Wikipedia readership` }] : []),
      ];
      return { ...row, evidence: [...reports, ...data] };
    });
    const others = recent.filter((h) => !diseases.some((d) => d.re.test(h.title))).slice(0, 15);
    ai = (await track(aiName, aiUrl, "AI analysis", () => writeBriefing(withEvidence, others, ollama))) ?? ai;
  } else {
    const error = ollama ? "No current briefing; the next update will try again" : "Runs in GitHub Actions, not on this machine";
    sources.push({ name: aiName, url: aiUrl, kind: "AI analysis", ok: Boolean(ai), items: ai ? 1 : 0, checkedAt: ai?.generatedAt ?? new Date().toISOString(), ...(ai ? {} : { error }) });
  }

  const known = new Set(diseases.map((d) => d.slug));
  const alertCutoff = isoDay(Date.now() - ALERT_WINDOW);
  const alerts = [...whoReports, ...feeds.filter((f) => ALERT_WORDS.test(f.title) && diseases.some((d) => d.re.test(f.title)))]
    .filter((a) => a.date >= alertCutoff && a.url)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40)
    .map(({ summary, ...a }) => ({ ...a, slug: diseases.find((d) => d.re.test(a.title))?.slug ?? null, regions: regionsIn(a.title) }));

  await mkdir("public/data", { recursive: true });
  await writeFile(OUTPUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    updateEveryHours: 1,
    aiModel: MODEL,
    aiAttemptedAt,
    diseases: rows,
    alerts,
    ai: ai && { ...ai, assessments: ai.assessments.filter((a) => known.has(a.slug)) },
    sources,
  }));
  console.log(`Wrote ${rows.length} diseases, ${news.size} fresh news signals, AI briefing: ${ai ? ai.generatedAt : "off"}`);
  for (const s of sources) console.log(`${s.ok ? "ok  " : "FAIL"} ${s.name} (${s.items})${s.error ? ` - ${s.error}` : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
