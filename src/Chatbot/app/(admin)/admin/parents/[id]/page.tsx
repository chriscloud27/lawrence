// Lead detail. Server Component — every field below is a real column on the
// `leads` row, and the activity timeline is the real `messages` transcript.
//
// The mock version carried an AI summary, extracted document criteria and
// hand-written "suggested actions" naming a specific family. None of those are
// stored anywhere, so they are empty states here rather than fiction.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Mail, User } from "lucide-react";
import { getLead, listMessages } from "@/lib/leads";
import { bantValue, formatLeadStatus, getScoreBand, getBandClasses, getBandLabel } from "@/lib/score";
import type { BantBreakdown } from "@/types/lawrence";
import { BTN_SECONDARY, CARD, LINK_BTN, PILL, SECTION_LABEL } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const BANT_ROWS: { key: keyof BantBreakdown; label: string }[] = [
  { key: "budget", label: "Budget" },
  { key: "authority", label: "Authority" },
  { key: "need", label: "Need" },
  { key: "timeline", label: "Timeline" },
];

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  return { title: lead?.captured_name ?? "Lead" };
}

export default async function ParentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // RLS makes "not yours" and "does not exist" the same answer, which is the
  // right answer to give either way.
  const lead = await getLead(id);
  if (!lead) notFound();

  const messages = await listMessages(id);
  const band = getScoreBand(lead.score);
  const bandClasses = getBandClasses(band);

  const facts = [
    { label: "Timeline", value: lead.timeline },
    { label: "Location", value: lead.location },
    { label: "Curriculum", value: lead.curriculum },
    { label: "Budget", value: lead.budget_range_usd },
  ].filter((fact) => Boolean(fact.value));

  return (
    <div className="mx-auto max-w-[900px] p-lw-xl max-[640px]:px-lw-base max-[640px]:pt-lw-lg max-[640px]:pb-lw-2xl">
      <Link href="/admin" className={`${LINK_BTN} mb-lw-md`}>
        <ArrowLeft size={16} />
        Back to Parents
      </Link>

      <div className={CARD}>
        <div className="flex justify-between gap-lw-lg max-[640px]:flex-col">
          <div className="min-w-0 flex-1">
            <div className="text-[22px] font-bold text-lw-text">
              {lead.captured_name ?? "Unnamed lead"}
            </div>

            {lead.captured_email && (
              <div className="mt-[6px] flex items-center gap-[6px] text-sm text-lw-text-secondary">
                <Mail size={14} />
                {lead.captured_email}
              </div>
            )}

            <div className="mt-lw-sm text-sm text-lw-text">
              {lead.child_age != null ? `Child age ${lead.child_age}` : "Child age not captured"}
              {lead.current_school ? ` · currently at ${lead.current_school}` : ""}
            </div>

            {lead.forcing_function && (
              <div className="mt-lw-sm text-sm text-lw-text">
                <span className="text-lw-text-muted">Driver:</span> {lead.forcing_function}
              </div>
            )}

            <div className="mt-lw-md flex flex-wrap text-sm max-[640px]:flex-col max-[640px]:gap-1">
              {facts.map((fact, index) => (
                <span key={fact.label}>
                  {index > 0 && (
                    <span className="mx-lw-sm text-lw-text-muted max-[640px]:hidden">·</span>
                  )}
                  <span className="text-lw-text-muted">{fact.label}:</span>{" "}
                  <span className="text-lw-text">{fact.value}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end max-[640px]:mt-lw-base max-[640px]:items-start">
            <div className="font-mono text-4xl text-lw-text">
              {lead.score}
              <span className="text-lg text-lw-text-muted">/100</span>
            </div>
            <span className={`${PILL} mt-lw-sm ${bandClasses.pill}`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${bandClasses.dot}`} />
              {getBandLabel(band)}
            </span>
            <span className="mt-lw-sm text-[13px] text-lw-text-muted">
              {formatLeadStatus(lead.status)} · via {lead.source}
            </span>
          </div>
        </div>

        <div className="mt-lw-lg flex flex-wrap gap-lw-md max-[640px]:flex-col">
          <a
            href={lead.captured_email ? `mailto:${lead.captured_email}` : undefined}
            aria-disabled={!lead.captured_email}
            className={`${BTN_SECONDARY} max-[640px]:w-full ${
              lead.captured_email ? "" : "pointer-events-none opacity-50"
            }`}
          >
            <Mail size={16} />
            Send Email
          </a>
          <Link
            href={`/admin/parents/${lead.id}/profile`}
            className={`${BTN_SECONDARY} max-[640px]:w-full`}
          >
            <User size={16} />
            Search Profile
          </Link>
          <Link
            href={`/admin/parents/${lead.id}/documents`}
            className={`${BTN_SECONDARY} max-[640px]:w-full`}
          >
            <FileText size={16} />
            Documents
          </Link>
        </div>
      </div>

      <div className="mt-lw-lg grid grid-cols-4 gap-lw-md max-[640px]:grid-cols-2">
        {BANT_ROWS.map((row) => {
          const value = bantValue(lead.score_breakdown, row.key);
          const low = value != null && value < 18;
          return (
            <div
              key={row.key}
              className={`rounded-lw-lg bg-lw-bg-card p-lw-lg ${
                low ? "border-l-[3px] border-lw-warning" : ""
              }`}
            >
              <div className="text-[13px] font-semibold uppercase tracking-[0.02em] text-lw-text-muted">
                {row.label}
              </div>
              <div className="mt-lw-sm font-mono text-sm text-lw-text">
                {value == null ? (
                  <span className="text-lw-text-muted">not scored</span>
                ) : (
                  <>
                    {value}
                    <span className="text-lw-text-muted">/25</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={SECTION_LABEL}>Conversation</div>
      {messages.length === 0 ? (
        <div className="rounded-lw-lg bg-lw-bg-card p-lw-lg text-sm text-lw-text-muted">
          No transcript stored for this lead. The chat path writes messages only on some
          branches today — build step 14 makes that unconditional.
        </div>
      ) : (
        <div>
          {messages.map((message, index) => (
            <div key={message.id} className="flex gap-lw-md">
              <div className="flex w-2 shrink-0 flex-col items-center">
                <span className="h-2 w-2 shrink-0 rounded-full bg-lw-border" />
                {index < messages.length - 1 && <span className="mt-1 w-px flex-1 bg-lw-border" />}
              </div>
              <div className="pb-lw-base">
                <div className="text-[13px] text-lw-text-muted">
                  {message.role === "user" ? "Parent" : "Assistant"} ·{" "}
                  {formatTimestamp(message.created_at)}
                </div>
                <div className="mt-[2px] text-sm text-lw-text">{message.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={SECTION_LABEL}>Notes</div>
      <div className="rounded-lw-lg bg-lw-bg-card p-lw-lg text-center text-sm text-lw-text-muted">
        Notes have no table yet — adding one is a write, and Admin is read-only until build
        step 14.
      </div>
    </div>
  );
}
