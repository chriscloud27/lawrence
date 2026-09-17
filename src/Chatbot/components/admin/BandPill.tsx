import { getBandClasses, getBandLabel, getScoreBand } from "@/lib/score";
import { PILL } from "@/components/admin/ui";

/** Diagnostic badge — score-band colours never appear on an interactive control. */
export function BandPill({ score }: { score: number }) {
  const band = getScoreBand(score);
  const { pill, dot } = getBandClasses(band);

  return (
    <span className={`${PILL} ${pill}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      {getBandLabel(band)}
    </span>
  );
}

/** Score value plus its band dot. Numbers are font-mono, per DESIGN.md. */
export function ScoreValue({ score, suffix }: { score: number; suffix?: string }) {
  const { dot } = getBandClasses(getScoreBand(score));

  return (
    <span className="flex items-center gap-[6px] font-mono text-sm text-lw-text">
      <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${dot}`} />
      {score}
      {suffix && <span className="text-lw-text-muted">{suffix}</span>}
    </span>
  );
}
