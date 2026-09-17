// The parent must never learn that a score exists. This catches the leak the
// persona rules care about most, in the rendered text the parent actually sees.
const FORBIDDEN = /\b(score|scoring|qualif\w*|threshold|tier|band|points|rating|rank\w*|lead)\b/i;

module.exports = (output) => {
  const match = String(output).match(FORBIDDEN);
  return {
    pass: !match,
    score: match ? 0 : 1,
    reason: match ? `mentions "${match[0]}" to the parent` : "no qualification vocabulary",
  };
};
