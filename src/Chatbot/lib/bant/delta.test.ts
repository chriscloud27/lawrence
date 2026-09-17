// The "never silently skip" requirement, as a test rather than a claim.
//
// A scoring engine that quietly swallows a malformed model response produces a
// lead that looks cold because the model stuttered, and nothing anywhere says
// so. `.claude/rules/ai-agents.md` requires the raw response to be logged and
// the call to throw.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDelta, deltaTotal, MalformedDeltaError } from "./delta.ts";

const VALID = JSON.stringify({
  timeline: 24,
  budget: 23,
  authority: 24,
  need: 22,
  explanation:
    "September term, premium framing, decides alone, entrance exams named",
  location: "Hong Kong",
  timeline_text: "before the September term",
  forcing_function: "relocation",
  child_age: 11,
  current_school: null,
  curriculum: null,
  budget_range_usd: null,
});

test("a well-formed delta parses, with profile fields", () => {
  const delta = parseDelta(VALID, "bant_delta");
  assert.equal(deltaTotal(delta), 93);
  assert.equal(delta.location, "Hong Kong");
  assert.equal(delta.child_age, 11);
  assert.equal(delta.current_school, null);
});

test("a code fence is unwrapped, not rejected", () => {
  // Models do this constantly; refusing is pedantry, not strictness.
  assert.equal(
    deltaTotal(parseDelta("```json\n" + VALID + "\n```", "bant_delta")),
    93,
  );
});

test("a leading sentence before the JSON is tolerated", () => {
  assert.equal(
    deltaTotal(parseDelta("Here is the scoring:\n" + VALID, "bant_delta")),
    93,
  );
});

test("prose instead of JSON throws and does not return a zero score", () => {
  assert.throws(
    () =>
      parseDelta("I'm sorry, I can't score that conversation.", "bant_delta"),
    MalformedDeltaError,
  );
});

test("the raw response is carried on the error for the log", () => {
  try {
    parseDelta("not json at all", "bant_refine");
    assert.fail("should have thrown");
  } catch (error) {
    assert.ok(error instanceof MalformedDeltaError);
    assert.equal(error.raw, "not json at all");
    assert.match(error.message, /bant_refine/);
  }
});

test("a missing dimension is a failure, not a default of zero", () => {
  // The dangerous shape: valid JSON, plausible-looking, one dimension absent.
  // Defaulting it to 0 would silently under-score a real family.
  const missingNeed = JSON.stringify({
    timeline: 20,
    budget: 20,
    authority: 20,
  });
  assert.throws(
    () => parseDelta(missingNeed, "bant_delta"),
    MalformedDeltaError,
  );
});

test("a dimension outside 0-25 is a failure", () => {
  const outOfRange = JSON.stringify({
    timeline: 99,
    budget: 20,
    authority: 20,
    need: 20,
  });
  assert.throws(
    () => parseDelta(outOfRange, "bant_delta"),
    MalformedDeltaError,
  );
});

test("a hallucinated profile type is dropped, not fatal", () => {
  // Scores are load-bearing and must be strict. A profile field is advisory —
  // failing the whole turn because the model wrote an age as a sentence would
  // lose a correct score over a cosmetic field.
  const oddProfile = JSON.stringify({
    timeline: 20,
    budget: 20,
    authority: 20,
    need: 20,
    child_age: "about eleven",
  });
  const delta = parseDelta(oddProfile, "bant_delta");
  assert.equal(deltaTotal(delta), 80);
  assert.equal(delta.child_age, null);
});
