import { ScoreBand } from "../types/lawrence";

export function getScoreBand(score: number): ScoreBand {
  if (score < 35) return "cold";
  if (score < 50) return "warm";
  if (score < 75) return "qualified";
  return "hot";
}

// Returns token references, not resolved values, so band colours follow the
// active data-theme (including the manual toggle) rather than the OS setting.
export function getBandColor(band: ScoreBand): { dot: string; bg: string; text: string } {
  return {
    dot: `var(--lw-score-${band}-text)`,
    bg: `var(--lw-score-${band}-bg)`,
    text: `var(--lw-score-${band}-text)`,
  };
}

export function getBandLabel(band: ScoreBand): string {
  const labels: Record<ScoreBand, string> = {
    cold: "Cold",
    warm: "Warm",
    qualified: "Qualified",
    hot: "Hot",
  };
  return labels[band];
}
