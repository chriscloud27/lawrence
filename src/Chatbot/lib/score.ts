import type { BantBreakdown, LeadStatus, ScoreBand } from "@/types/lawrence";

/**
 * Display bands, four of them, at 35 / 50 / 75.
 *
 * These are deliberately finer-grained than the three *routing* tiers in
 * .claude/rules/bant-scoring.md (<50 / 50–75 / >75), which decide what happens
 * to a lead. A counsellor scanning a list wants to tell a 40 from a 20; the
 * router does not. `leads.classification` carries the routing tier and is not
 * derived from this function.
 */
export function getScoreBand(score: number): ScoreBand {
  if (score < 35) return "cold";
  if (score < 50) return "warm";
  if (score < 75) return "qualified";
  return "hot";
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

/**
 * Token *class names*, never resolved colour values, so a band follows the
 * active [data-theme] (.claude/rules/design.md). Score-band colours are
 * diagnostic — they belong on badges and dots, never on a button.
 */
export function getBandClasses(band: ScoreBand): { pill: string; dot: string; bg: string } {
  const bg: Record<ScoreBand, string> = {
    cold: "bg-lw-score-cold-bg",
    warm: "bg-lw-score-warm-bg",
    qualified: "bg-lw-score-qualified-bg",
    hot: "bg-lw-score-hot-bg",
  };
  const pill: Record<ScoreBand, string> = {
    cold: `${bg.cold} text-lw-score-cold-text`,
    warm: `${bg.warm} text-lw-score-warm-text`,
    qualified: `${bg.qualified} text-lw-score-qualified-text`,
    hot: `${bg.hot} text-lw-score-hot-text`,
  };
  const dot: Record<ScoreBand, string> = {
    cold: "bg-lw-score-cold-text",
    warm: "bg-lw-score-warm-text",
    qualified: "bg-lw-score-qualified-text",
    hot: "bg-lw-score-hot-text",
  };
  return { pill: pill[band], dot: dot[band], bg: bg[band] };
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  booked: "Booked",
  nurture: "Nurture",
  closed: "Closed",
};

export function formatLeadStatus(status: LeadStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export const BANT_DIMENSIONS = ["budget", "authority", "need", "timeline"] as const;

export function bantValue(breakdown: BantBreakdown | null, key: keyof BantBreakdown): number | null {
  const value = breakdown?.[key];
  return typeof value === "number" ? value : null;
}
