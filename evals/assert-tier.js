// Asserts on routing tier and score band, never on an exact integer: the rubric
// is keyword-driven and two points of drift is not a regression. Crossing 50 or
// 75 is, because that is where the parent's experience changes.
const tierFor = (score) => (score < 50 ? "standard" : score <= 75 ? "booking" : "hot");

module.exports = (output, { vars }) => {
  let delta;
  try {
    delta = JSON.parse(String(output).trim().replace(/^```(?:json)?|```$/g, ""));
  } catch {
    return { pass: false, score: 0, reason: `not JSON: ${String(output).slice(0, 120)}` };
  }

  const dims = ["timeline", "budget", "authority", "need"];
  for (const d of dims) {
    const v = delta[d];
    if (typeof v !== "number" || v < 0 || v > 25) {
      return { pass: false, score: 0, reason: `${d} missing or outside 0-25: ${JSON.stringify(v)}` };
    }
  }

  const total = dims.reduce((sum, d) => sum + delta[d], 0);
  const tier = tierFor(total);
  const pass = tier === vars.expectedTier;

  return {
    pass,
    score: pass ? 1 : 0,
    reason: `scored ${total} → ${tier} (expected ${vars.expectedTier}; rubric reference ${vars.referenceScore})`,
  };
};
