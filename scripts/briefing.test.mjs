import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { parseJson, validate, writeBriefing, writeLocalBriefing } from "./briefing.mjs";

const SEEN = "https://www.who.int/report";
const reply = (over = {}) => ({
  headline: "Flu is climbing.",
  overview: "Activity is rising.",
  assessments: [{ slug: "influenza", phase: "rising", summary: "Up.", where: ["Europe"], sources: [SEEN] }],
  emerging: [],
  ...over,
});
const slugs = new Set(["influenza"]);
const seen = new Set([SEEN]);

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
  const out = validate(reply({ assessments, emerging }), slugs, new Set([SEEN, javascriptUrl, broken]));
  assert.equal(out.assessments.length, 1);
  assert.equal(out.emerging.length, 0);
});

test("validate survives garbage shapes", () => {
  assert.throws(() => validate({ assessments: "nope" }, slugs, seen));
  assert.throws(() => validate(reply({ assessments: [null, 3] }), slugs, seen));
});

// Stands in for the Anthropic API so the real SDK runs end to end: a search that
// pauses the turn, then a final answer citing a URL found only by that search.
function fakeApi() {
  const requests = [];
  const event = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  const send = (res, blocks, stop_reason) => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(event("message_start", { message: { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } }));
    blocks.forEach((block, index) => {
      const { text, ...start } = block;
      res.write(event("content_block_start", { index, content_block: text === undefined ? block : { ...start, text: "" } }));
      if (text !== undefined) res.write(event("content_block_delta", { index, delta: { type: "text_delta", text } }));
      res.write(event("content_block_stop", { index }));
    });
    res.write(event("message_delta", { delta: { stop_reason, stop_sequence: null }, usage: { output_tokens: 5, server_tool_use: { web_search_requests: 1 } } }));
    res.write(event("message_stop", {}));
    res.end();
  };
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      requests.push({ url: req.url, headers: req.headers, body: JSON.parse(body) });
      if (requests.length === 1) {
        const result = { type: "web_search_tool_result", tool_use_id: "t1", content: [{ type: "web_search_result", url: "https://cdc.gov/found", title: "CDC" }] };
        return send(res, [result], "pause_turn");
      }
      const text = JSON.stringify(reply({ assessments: [{ slug: "influenza", phase: "peaking", summary: "Near its high.", where: [], sources: ["https://cdc.gov/found"] }] }));
      send(res, [{ type: "text", text }], "end_turn");
    });
  });
  return { server, requests };
}

test("writeBriefing continues a paused search and accepts URLs the search returned", async () => {
  const { server, requests } = fakeApi();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  process.env.ANTHROPIC_API_KEY = "test";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  try {
    const rows = [{ slug: "influenza", name: "Flu", score: 80, phase: "rising", factors: [] }];
    const out = await writeBriefing(rows, [{ title: "t", url: SEEN, source: "WHO", date: "2026-11-01" }]);
    assert.equal(out.assessments[0].sources[0], "https://cdc.gov/found");
    assert.equal(out.searches, 2);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].body.fallbacks, "default");
    assert.equal(requests[0].body.tools[0].type, "web_search_20260209");
    assert.match(requests[0].headers["anthropic-beta"], /server-side-fallback-2026-07-01/);
    assert.equal(requests[1].body.messages.at(-1).role, "assistant");
  } finally {
    server.close();
  }
});

test("writeLocalBriefing asks Ollama for schema-shaped JSON and drops invented citations", async () => {
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
    const out = await writeLocalBriefing(rows, [{ title: "t", url: SEEN, source: "WHO", date: "2026-11-01", summary: "WHO says flu is up." }], `http://127.0.0.1:${server.address().port}`);
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
