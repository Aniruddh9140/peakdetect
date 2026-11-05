import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import { BATCH, parseJson, validate, writeBriefing } from "./briefing.mjs";

const SEEN = "https://www.who.int/report";
const FLU_TITLE = "Influenza activity rises in Europe";
const reply = (over = {}) => ({
  assessments: [{ slug: "influenza", summary: "Up.", where: ["Europe"], sources: [SEEN] }],
  emerging: [],
  ...over,
});
const slugs = new Set(["influenza"]);
const seen = new Map([[SEEN, FLU_TITLE]]);
const flu = (over = {}) => ({ slug: "influenza", name: "Influenza (flu)", score: 80, phase: "rising", factors: [], evidence: [{ url: SEEN, title: FLU_TITLE, summary: "WHO says flu is up." }], ...over });

// A stand-in for Ollama: answers each /api/chat request with the next reply in the list.
async function fakeOllama(replies) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      requests.push(JSON.parse(body));
      const next = replies[requests.length - 1];
      if (next === 500) return res.writeHead(500).end('{"error":"boom"}');
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ message: { content: JSON.stringify(next) } }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}`, requests, close: () => server.close() };
}

test("parseJson tolerates text around the object", () => {
  assert.deepEqual(parseJson('Here you go:\n{"a":1}\nDone.'), { a: 1 });
  assert.throws(() => parseJson("no json"));
});

test("validate keeps a well-formed briefing", () => {
  assert.equal(validate(reply(), slugs, seen).assessments.length, 1);
});

test("validate drops claims citing a URL the model never saw", () => {
  const assessments = [{ slug: "influenza", summary: "Made up.", sources: ["https://evil.example/x"] }];
  assert.throws(() => validate(reply({ assessments }), slugs, seen), /failed validation/);
});

test("validate drops unknown slugs and non-web URLs", () => {
  const assessments = [{ slug: "made-up", summary: "x", sources: [SEEN] }, reply().assessments[0]];
  const javascriptUrl = "javascript:alert(1)";
  const broken = "https://exa mple.com/";
  const emerging = [{ name: "X", summary: "y", sources: [javascriptUrl, broken] }];
  const out = validate(reply({ assessments, emerging }), slugs, new Map([[SEEN, FLU_TITLE], [javascriptUrl, "x"], [broken, "x"]]));
  assert.equal(out.assessments.length, 1);
  assert.equal(out.emerging.length, 0);
});

test("validate drops a citation whose evidence is about a different disease", () => {
  const ebola = "https://www.who.int/ebola";
  const assessments = [{ slug: "cholera", summary: "Cites an Ebola report.", sources: [ebola] }, reply().assessments[0]];
  const out = validate(reply({ assessments }), new Set(["influenza", "cholera"]), new Map([[SEEN, FLU_TITLE], [ebola, "Ebola disease - Democratic Republic of the Congo"]]));
  assert.deepEqual(out.assessments.map((a) => a.slug), ["influenza"]);
});

test("validate survives garbage shapes", () => {
  assert.throws(() => validate({ assessments: "nope" }, slugs, seen));
  assert.throws(() => validate(reply({ assessments: [null, 3] }), slugs, seen));
});

test("every disease name counts as evidence about itself", () => {
  // Data-page evidence is titled "<name>: ..." and must pass the same relevance check as reports.
  const catalog = JSON.parse(readFileSync("src/data/diseases.json", "utf8"));
  for (const d of catalog) assert.match(d.name, new RegExp(d.keywords, "i"), d.slug);
});

test("writeBriefing sends each disease's evidence and drops invented citations", async () => {
  const ollama = await fakeOllama([
    reply({ assessments: [reply().assessments[0], { slug: "influenza", summary: "Made up.", where: [], sources: ["https://invented.example/"] }] }),
  ]);
  try {
    const out = await writeBriefing([flu()], [], ollama.url);
    const [request] = ollama.requests;
    assert.equal(request.think, false);
    assert.deepEqual(request.format.properties.assessments.items.properties.slug.enum, ["influenza"]);
    assert.match(request.messages[1].content, /WHO says flu is up/);
    assert.equal(out.assessments.length, 1);
    assert.equal(out.model, "qwen3:4b");
  } finally {
    ollama.close();
  }
});

test("writeBriefing covers diseases in batches and retries the ones a failed batch missed", async () => {
  const rows = Array.from({ length: BATCH + 2 }, (_, i) => flu({ slug: i < BATCH ? "influenza" : "covid-19", name: i < BATCH ? "Influenza (flu)" : "COVID-19" }));
  const covid = "https://www.cdc.gov/covid";
  rows.at(-1).evidence = [{ url: covid, title: "COVID-19: US hospital admissions" }];
  const ollama = await fakeOllama([500, reply({ assessments: [{ slug: "covid-19", summary: "Steady.", where: [], sources: [covid] }] }), reply()]);
  try {
    const out = await writeBriefing(rows, [], ollama.url);
    assert.equal(ollama.requests.length, 3);
    assert.deepEqual(ollama.requests[2].format.properties.assessments.items.properties.slug.enum.includes("covid-19"), false);
    assert.deepEqual(out.assessments.map((a) => a.slug), ["covid-19", "influenza"]);
  } finally {
    ollama.close();
  }
});

test("writeBriefing reports when every batch fails", async () => {
  const ollama = await fakeOllama([500]);
  try {
    await assert.rejects(writeBriefing([flu()], [], ollama.url), /Ollama HTTP 500/);
  } finally {
    ollama.close();
  }
});
