// Regression tests for the Stage-1 scorer.
//
// These exist because of ADR-0018's central argument: the negation bug and the
// "scores the advisor's reply" bug both survived months of live use in n8n, not
// because they were subtle, but because workflow JSON has nowhere to put a test
// like this. The port is only worth doing if the tests come with it.
//
// Node's built-in runner with type stripping — no test framework added to the
// dependency tree for eight assertions.
//
//   npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreStage1, stage1Total, STAGE1_CEILING } from "./keywords.ts";

test("a denial scores low, not maximum (ADR-0017)", () => {
  // Every one of these scored 22 of 25 before the port: the positive branch ran
  // first and "my decision" is a substring of "not my decision".
  assert.ok(scoreStage1("not my decision").authority <= 5);
  assert.ok(
    scoreStage1("my partner is leading, not my decision").authority <= 5,
  );
  assert.ok(scoreStage1("we cannot afford premium").budget <= 5);
  assert.ok(
    scoreStage1("I'm looking for a state school, my wife decides").authority <=
      5,
  );
});

test("a parent disqualifying themselves twice does not reach the gate", () => {
  // Scored 47 before the port — comfortably into Stage 2 under any threshold.
  assert.ok(
    stage1Total(scoreStage1("not my decision and we cannot afford premium")) <
      25,
  );
});

test("apostrophe form does not change the score", () => {
  // "I am looking" scored 3 and "I'm looking" scored 22, purely because
  // `i'm looking` was a maximum-authority keyword and a curly apostrophe
  // missed it entirely.
  const straight = scoreStage1("I'm looking for a school").authority;
  const spelled = scoreStage1("I am looking for a school").authority;
  const curly = scoreStage1("I’m looking for a school").authority;
  assert.equal(straight, spelled);
  assert.equal(curly, spelled);
});

test("genuine signals still score", () => {
  assert.equal(scoreStage1("I decide on this").authority, 22);
  assert.equal(scoreStage1("we need a place in September").timeline, 23);
  assert.equal(scoreStage1("looking at a premium boarding school").budget, 22);
  // "considering private" must not fall into the bare `private` branch.
  assert.equal(scoreStage1("considering private").budget, 14);
  assert.equal(scoreStage1("my wife and I will decide together").authority, 16);
});

test("scores accumulate across turns and never decrease", () => {
  const first = scoreStage1("we need a place in September");
  const second = scoreStage1("hello", first);
  assert.equal(second.timeline, first.timeline);
});

test("the achievable ceiling is 67, not 75 — ADR-0017 depends on it", () => {
  assert.equal(STAGE1_CEILING, 67);
  assert.equal(
    stage1Total(scoreStage1("urgent premium boarding place, my decision")),
    67,
  );
});

test("ADR-0017's measured table still reproduces", () => {
  // The justification for the gate at 25 is these numbers. If the scorer drifts,
  // the ADR's reasoning stops holding and this is where that shows up.
  const expected: [string, number][] = [
    ["hello", 9],
    ["just exploring, state school, consulting with family", 25],
    ["I decide on this", 28],
    ["looking at a premium boarding school", 28],
    ["we need a place in September", 29],
    ["we need a place in September, considering private", 40],
    ["urgent premium boarding place, my decision", 67],
  ];

  for (const [input, score] of expected) {
    assert.equal(stage1Total(scoreStage1(input)), score, `"${input}"`);
  }
});
