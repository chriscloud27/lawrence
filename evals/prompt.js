// One prompt function, not two prompt files, so promptfoo does not run the
// persona tests against the scoring prompt and vice versa (prompts × tests is a
// cartesian product otherwise).
//
// The system prompts are the real ones from src/agents/prompts/ — the eval has
// no value if it grades a prompt the app does not use.
const fs = require("fs");
const path = require("path");

const PROMPTS = path.join(__dirname, "..", "src", "agents", "prompts");

const systemFor = (suite) => {
  const file = suite === "persona" ? "parent-turn.txt" : "bant-delta.txt";
  return fs.readFileSync(path.join(PROMPTS, file), "utf8");
};

module.exports = function ({ vars }) {
  return [
    { role: "system", content: systemFor(vars.suite) },
    { role: "user", content: vars.conversation },
  ];
};
