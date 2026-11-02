import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { parseJson, validate, writeBriefing } from "./briefing.mjs";

const SEEN = "https://www.who.int/report";
const reply = (over = {}) => ({
  assessments: [{ slug: "influenza", phase: "rising", summary: "Up.", where: ["Europe"], sources: [SEEN] }],
  emerging: [],
  ...over,
});
const slugs = new Set(["influenza"]);
const FLU_TITLE = "Influenza activity rises in Europe";
const seen = new Map([[SEEN, FLU_TITLE]]);

test("parseJson tolerates text around the object", () => {
  assert.deepEqual(parseJson('Here you go:\n{"a":1}\nDone.'), { a: 1 });
  assert.throws(() => parseJson("no json"));
});

test("validate keeps a well-formed briefing", () => {
  assert.equal(validate(reply(), slugs, seen).assessments.length, 1);
});

test("validate drops claims citing a URL the model never saw", () => {
  const assessments = [{ slug: "influenza", phase: "rising", summary: "Made up.", sources: ["https://evil.example/x"] }];
  assert.throws(() => validate(reply({ assessments }), slugs, seen), /failed validation/);
});

test("validate drops unknown slugs and phases, and non-web URLs", () => {
  const assessments = [
    { slug: "made-up", phase: "rising", summary: "x", sources: [SEEN] },
    { slug: "influenza", phase: "apocalyptic", summary: "x", sources: [SEEN] },
    reply().assessments[0],
  ];
  const javascriptUrl = "javascript:alert(1)";
  const broken = "https://exa mple.com/";
  const emerging = [{ name: "X", summary: "y", sources: [javascriptUrl, broken] }];
  const out = validate(reply({ assessments, emerging }), slugs, new Map([[SEEN, FLU_TITLE], [javascriptUrl, "x"], [broken, "x"]]));
  assert.equal(out.assessments.length, 1);
  assert.equal(out.emerging.length, 0);
});

test("validate drops a citation whose report is about a different disease", () => {
  const ebola = "https://www.who.int/ebola";
  const assessments = [
    { slug: "cholera", phase: "rising", summary: "Cites an Ebola report.", sources: [ebola] },
    reply().assessments[0],
  ];
  const out = validate(reply({ assessments }), new Set(["influenza", "cholera"]), new Map([[SEEN, FLU_TITLE], [ebola, "Ebola disease - Democratic Republic of the Congo"]]));
  assert.deepEqual(out.assessments.map((a) => a.slug), ["influenza"]);
});

test("validate survives garbage shapes", () => {
  assert.throws(() => validate({ assessments: "nope" }, slugs, seen));
  assert.throws(() => validate(reply({ assessments: [null, 3] }), slugs, seen));
});

test("writeBriefing asks Ollama for schema-shaped JSON and drops invented citations", async () => {
  let request;
  const content = JSON.stringify(reply({
    assessments: [
      { slug: "influenza", phase: "rising", summary: "Up.", where: [], sources: [SEEN] },
      { slug: "influenza", phase: "peaking", summary: "Made up.", where: [], sources: ["https://invented.example/"] },
    ],
  }));
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      request = { url: req.url, body: JSON.parse(body) };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: { role: "assistant", content } }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const rows = [{ slug: "influenza", name: "Flu", score: 80, phase: "rising", factors: [] }];
    const out = await writeBriefing(rows, [{ title: FLU_TITLE, url: SEEN, source: "WHO", date: "2026-11-01", summary: "WHO says flu is up." }], `http://127.0.0.1:${server.address().port}`);
    assert.equal(request.url, "/api/chat");
    assert.equal(request.body.think, false);
    assert.deepEqual(request.body.format.properties.assessments.items.properties.slug.enum, ["influenza"]);
    assert.match(request.body.messages[1].content, /WHO says flu is up/);
    assert.equal(out.assessments.length, 1);
    assert.equal(out.model, "qwen3:4b");
  } finally {
    server.close();
  }
});

test("writeBriefing waits longer than fetch's 5-minute header limit would allow", async () => {
  const server = http.createServer((req, res) => {
    req.resume();
    // A slow first byte would kill fetch() at 300s; here the reply arrives after a short pause.
    setTimeout(() => res.end(JSON.stringify({ message: { content: JSON.stringify(reply()) } })), 200);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const rows = [{ slug: "influenza", name: "Flu", score: 80, phase: "rising", factors: [] }];
    const out = await writeBriefing(rows, [{ title: FLU_TITLE, url: SEEN, source: "WHO", date: "2026-11-01" }], `http://127.0.0.1:${server.address().port}`);
    assert.equal(out.assessments[0].slug, "influenza");
  } finally {
    server.close();
  }
});

test("writeBriefing reports an Ollama error status", async () => {
  const server = http.createServer((req, res) => {
    req.resume();
    res.writeHead(404).end('{"error":"model not found"}');
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const rows = [{ slug: "influenza", name: "Flu", score: 80, phase: "rising", factors: [] }];
    await assert.rejects(writeBriefing(rows, [], `http://127.0.0.1:${server.address().port}`), /Ollama HTTP 404: .*model not found/);
  } finally {
    server.close();
  }
});
