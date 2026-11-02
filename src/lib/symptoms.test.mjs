import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkSymptoms } from "./symptoms.ts";

const profiles = JSON.parse(readFileSync("src/data/diseases.json", "utf8"));
const check = (symptoms, over = {}) => checkSymptoms({ symptoms, severity: "mild", durationDays: 1, ...over }, profiles);

test("a symptom specific to dengue puts it first", () => {
  const { matches } = check(["fever", "joint pain", "rash", "headache", "pain behind eyes"]);
  assert.equal(matches[0].slug, "dengue");
});

test("one common symptom stays a weak match with no alarm", () => {
  const { matches, seekCare } = check(["fever"]);
  assert.ok(matches[0].match < 40);
  assert.equal(seekCare, false);
});

test("many symptoms matching a critical disease trigger care", () => {
  assert.equal(check(["fever", "headache", "neck stiffness", "vomiting"]).seekCare, true);
  assert.equal(check(["fever", "muscle aches", "headache", "sore throat", "vomiting"]).seekCare, true);
});

test("no overlap gives no matches", () => {
  assert.deepEqual(check(["hiccups"]).matches, []);
});

test("mild symptoms do not trigger a care warning", () => {
  assert.equal(check(["runny nose", "sneezing"]).seekCare, false);
});

test("red flags, severe rating and high fever all trigger care", () => {
  assert.equal(check(["shortness of breath"]).seekCare, true);
  assert.match(check(["chest pain"]).advice, /chest pain/);
  assert.equal(check(["cough"], { severity: "severe" }).seekCare, true);
  assert.equal(check(["cough"], { temperature: 39.6 }).seekCare, true);
});

test("everyday wording for an emergency still triggers care", () => {
  assert.equal(check(["trouble breathing"]).seekCare, true);
  assert.equal(check(["passed out"]).seekCare, true);
  assert.equal(check(["bleeding gums"]).seekCare, true);
});

test("adding symptoms cannot hide a critical-disease warning", () => {
  const base = ["fever", "headache", "neck stiffness", "vomiting"];
  assert.equal(check([...base, "cough", "runny nose", "sneezing"]).seekCare, true);
  assert.equal(check(["fever", "muscle aches", "headache", "sore throat", "vomiting", "cough", "runny nose"]).seekCare, true);
});

test("a strong match to a serious disease adds travel advice", () => {
  assert.match(check(["fever", "joint pain", "rash", "headache", "pain behind eyes"]).advice, /Dengue/);
});

test("a long illness is pointed to a doctor", () => {
  assert.match(check(["cough"], { durationDays: 9 }).advice, /week or more/);
});
