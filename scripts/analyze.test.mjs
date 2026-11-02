import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { completeDays, dampNews, heat, phaseOf, regionsIn, score, trendTable, weekly } from "./analyze.mjs";

const flat = Array(60).fill(100);

test("heat puts a fresh spike above a flat history", () => {
  const spike = heat([...flat, 300, 300, 300, 300, 300, 300, 300], 7);
  assert.equal(spike.percentile, 100);
  assert.ok(spike.growth > 1.5);
  assert.ok(spike.heat > 90);
});

test("heat reads a falling series as cold", () => {
  const falling = heat([...Array(30).fill(500), ...Array(30).fill(100)], 7);
  assert.ok(falling.heat < 40);
});

test("heat refuses a series too short to compare", () => {
  assert.equal(heat([1, 2, 3], 7), null);
});

test("heat survives gaps and an all-zero history", () => {
  assert.equal(heat(Array(40).fill(0), 7).growth, 0);
  assert.ok(heat([NaN, ...flat], 7));
});

test("dampNews discounts a handful of articles but not real volume", () => {
  assert.equal(dampNews({ heat: 80 }, 1).heat, 16);
  assert.equal(dampNews({ heat: 80 }, 50).heat, 80);
  assert.equal(dampNews(null, 50), null);
});

test("phaseOf separates peak, rise, fall and normal", () => {
  assert.equal(phaseOf(85, 0.3), "peaking");
  assert.equal(phaseOf(85, -0.1), "peaking");
  assert.equal(phaseOf(85, -0.4), "falling");
  assert.equal(phaseOf(50, 0.3), "rising");
  assert.equal(phaseOf(20, 0.3), "baseline");
});

test("score reweights around a missing signal", () => {
  const signal = { heat: 80, growth: 0.1 };
  assert.equal(score({ wiki: signal }).score, 80);
  assert.equal(score({ wiki: signal, news: signal, surveillance: signal }).score, 80);
  assert.equal(score({}), null);
});

test("attention alone cannot make a peak without case data or a WHO report", () => {
  const hot = { heat: 95, growth: 0.5 };
  assert.equal(score({ news: hot }).phase, "rising");
  assert.equal(score({ news: hot, wiki: hot }).phase, "rising");
  assert.equal(score({ news: hot, wiki: hot }, 1).phase, "peaking");
  assert.equal(score({ surveillance: hot }).phase, "peaking");
});

test("completeDays drops outage days, which is what the live GDELT data contains", () => {
  const days = [{ norm: 146057 }, { norm: 156425 }, { norm: 123805 }, { norm: 4483 }, { norm: 2218 }];
  assert.deepEqual(completeDays(days).map((d) => d.norm), [146057, 156425, 123805]);
  assert.deepEqual(completeDays([]), []);
});

test("official reports raise the score, capped at 10 points", () => {
  const wiki = { heat: 50, growth: 0 };
  assert.equal(score({ wiki }, 1).score, 55);
  assert.equal(score({ wiki }, 9).score, 60);
});

test("weekly groups days into their Monday", () => {
  const rows = weekly([["2026-11-02", 2], ["2026-11-08", 4], ["2026-11-09", 10]]);
  assert.deepEqual(rows, [["2026-11-02", 3], ["2026-11-09", 10]]);
});

test("trendTable scales each signal to its own high and tolerates missing ones", () => {
  const rows = trendTable({ wiki: [["2026-10-05", 50], ["2026-10-12", 200]], news: null });
  assert.deepEqual(rows, [{ date: "2026-10-05", wiki: 25 }, { date: "2026-10-12", wiki: 100 }]);
});

test("regionsIn reads places from titles without matching the word us", () => {
  assert.deepEqual(regionsIn("Ebola disease - Democratic Republic of the Congo, Kenya and Nigeria"), ["Africa"]);
  assert.deepEqual(regionsIn("Nipah cases in Kerala, India and Bangladesh"), ["South Asia"]);
  assert.deepEqual(regionsIn("What the outbreak means for us"), []);
});

test("disease keywords do not bleed into each other", () => {
  const catalog = JSON.parse(readFileSync("src/data/diseases.json", "utf8"));
  const matches = (title) => catalog.filter((d) => new RegExp(d.keywords, "i").test(title)).map((d) => d.slug);
  assert.deepEqual(matches("Bird flu found in dairy herds"), ["h5n1"]);
  assert.deepEqual(matches("Avian influenza A(H5N1) in Cambodia"), ["h5n1"]);
  assert.deepEqual(matches("Flu season starts early"), ["influenza"]);
  assert.deepEqual(matches("Middle East respiratory syndrome coronavirus - Saudi Arabia"), []);
  assert.deepEqual(matches("COVID-19 admissions rise"), ["covid-19"]);
});
