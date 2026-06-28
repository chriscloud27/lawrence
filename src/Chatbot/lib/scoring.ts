export interface ScoreBreakdown {
  timeline: number;
  forcing_function: number;
  commitment: number;
  location: number;
  budget: number;
  total: number;
}

export type Classification = 'hot' | 'warm' | 'cold';

export function classify(score: number): Classification {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

export function buildScoreBreakdownText(breakdown: ScoreBreakdown): string {
  const lines: string[] = [`Total: ${breakdown.total}`];
  if (breakdown.timeline > 0) lines.push(`Timeline +${breakdown.timeline}`);
  if (breakdown.forcing_function > 0) lines.push(`Forcing function +${breakdown.forcing_function}`);
  if (breakdown.commitment > 0) lines.push(`Commitment +${breakdown.commitment}`);
  if (breakdown.location > 0) lines.push(`Location +${breakdown.location}`);
  if (breakdown.budget > 0) lines.push(`Budget +${breakdown.budget}`);
  return lines.join(', ');
}
