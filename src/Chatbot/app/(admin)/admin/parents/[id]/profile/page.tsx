// Search profile — the parent-facing view of what the agency knows, rendered
// from the lead's real columns.
//
// The mock version let a parent edit free-text criteria and drag-rank
// preferences. Neither has a column to persist into, and Admin is read-only
// until build step 14, so the editable surfaces are not ported: an edit control
// that silently discards the edit is worse than no edit control.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLead } from "@/lib/leads";
import { getBandClasses, getBandLabel, getScoreBand } from "@/lib/score";
import { LINK_BTN, PILL, SECTION_LABEL } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  return { title: lead ? `${lead.captured_name ?? "Lead"} · profile` : "Profile" };
}

export default async function SearchProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const band = getScoreBand(lead.score);
  const bandClasses = getBandClasses(band);

  const criteria = [
    { label: "Timeline", value: lead.timeline },
    { label: "Budget", value: lead.budget_range_usd },
    { label: "Location", value: lead.location },
    { label: "Curriculum", value: lead.curriculum },
    { label: "Current school", value: lead.current_school },
    { label: "Child age", value: lead.child_age != null ? String(lead.child_age) : null },
    { label: "What is driving the move", value: lead.forcing_function },
  ];

  const captured = criteria.filter((c) => Boolean(c.value));
  const missing = criteria.filter((c) => !c.value);
  const completeness = Math.round((captured.length / criteria.length) * 100);

  return (
    <div className="mx-auto w-full max-w-[800px] px-lw-xl pt-lw-xl pb-lw-section max-[640px]:px-lw-base max-[640px]:pt-lw-lg max-[640px]:pb-lw-2xl">
      <Link href={`/admin/parents/${lead.id}`} className={`${LINK_BTN} mb-lw-md`}>
        <ArrowLeft size={16} />
        Back to lead
      </Link>

      <div className="rounded-lw-lg bg-lw-bg-card p-lw-lg">
        <div className="text-[22px] font-bold text-lw-text">
          {lead.captured_name ?? "Unnamed lead"}
        </div>
        <div className="mt-[2px] text-sm text-lw-text-secondary">
          {lead.child_age != null ? `Parent of a ${lead.child_age}-year-old` : "Child age not captured"}
        </div>

        <div className="mt-lw-lg">
          <div className="mb-1 w-[200px] text-right text-sm text-lw-text">
            Profile completeness: {completeness}%
          </div>
          <div className="h-[6px] w-[200px] overflow-hidden rounded-full bg-lw-border">
            <div className="h-full rounded-full bg-lw-accent" style={{ width: `${completeness}%` }} />
          </div>
        </div>

        <div className="mt-lw-lg flex items-center gap-lw-md">
          <span className="font-mono text-sm text-lw-text">BANT Score: {lead.score}/100</span>
          <span className={`${PILL} ${bandClasses.pill}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${bandClasses.dot}`} />
            {getBandLabel(band)}
          </span>
        </div>

        <div className="mt-lw-base text-[13px] text-lw-text-muted">
          Captured: {new Date(lead.created_at).toLocaleDateString("en-GB")} · via {lead.source}
        </div>
      </div>

      <div className={SECTION_LABEL}>Search criteria</div>
      <div className="flex flex-col gap-lw-md">
        {captured.map((criterion) => (
          <div key={criterion.label} className="rounded-lw-lg bg-lw-bg-card p-lw-lg">
            <div className="text-sm font-semibold text-lw-text">{criterion.label}</div>
            <div className="mt-[6px] text-base text-lw-text">{criterion.value}</div>
          </div>
        ))}
      </div>

      {missing.length > 0 && (
        <>
          <div className={SECTION_LABEL}>Not captured yet</div>
          <div className="flex flex-wrap gap-lw-sm">
            {missing.map((criterion) => (
              <span
                key={criterion.label}
                className="rounded-full bg-lw-bg-card px-lw-md py-lw-sm text-[13px] text-lw-text-muted"
              >
                {criterion.label}
              </span>
            ))}
          </div>
        </>
      )}

      <div className={SECTION_LABEL}>Uploaded documents</div>
      <div className="rounded-lw-lg bg-lw-bg-card p-lw-lg text-sm text-lw-text-muted">
        Document upload is a v2 intake path (ADR-0010). Nothing is stored yet.
      </div>

      <div className="mt-lw-xl text-center text-[10px] text-lw-text-muted">Powered by Lawrence</div>
    </div>
  );
}
