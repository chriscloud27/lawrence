// Final screen of the parent intake flow: what happens after the profile is
// built. Static by design — the two routes out (book a call, see the shortlist)
// are links, not data.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, BookOpen } from "lucide-react";
import { getLead } from "@/lib/leads";
import { ProgressStepper } from "@/components/admin/forms/ProgressStepper";
import { INTAKE_FLOW_STEPS } from "@/lib/admin/form-options";
import { BTN_PRIMARY, BTN_SECONDARY, CARD_WRAPPER, FOOTER_NOTE } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Next step" };

export default async function NextStepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <div className="w-full py-lw-2xl">
      <div className={CARD_WRAPPER}>
        <ProgressStepper steps={INTAKE_FLOW_STEPS} currentStep={3} />

        <div className="mb-lw-base border-b-0 text-lg font-semibold text-lw-text">
          Your profile is ready
        </div>

        <p className="mb-lw-xl text-base leading-relaxed text-lw-text">
          We&apos;ve built your search profile from everything you&apos;ve shared. Here are two ways
          to move forward.
        </p>

        <div className="mb-lw-xl grid grid-cols-2 gap-lw-base max-[560px]:grid-cols-1">
          <div className="flex flex-col items-center gap-lw-md rounded-lw-lg border border-lw-border p-lw-lg text-center">
            <Calendar size={32} strokeWidth={1.5} className="text-lw-accent" />
            <div className="text-sm font-semibold text-lw-text">Book a consultation</div>
            <div className="mb-lw-md text-[13px] text-lw-text-muted">
              Talk directly with an advisor about your child&apos;s journey
            </div>
            <span className={`${BTN_PRIMARY} pointer-events-none opacity-50`}>Schedule call</span>
          </div>

          <div className="flex flex-col items-center gap-lw-md rounded-lw-lg border border-lw-border p-lw-lg text-center">
            <BookOpen size={32} strokeWidth={1.5} className="text-lw-text-muted" />
            <div className="text-sm font-semibold text-lw-text">View your shortlist</div>
            <div className="mb-lw-md text-[13px] text-lw-text-muted">
              See schools matched to your criteria
            </div>
            <Link href="/schools" className={BTN_SECONDARY}>
              View schools
            </Link>
          </div>
        </div>

        {/* The booking link lives in the n8n SET node today; build step 14 moves
            it into agent_config, which is when this button can point somewhere. */}
        <div className="mb-lw-base rounded-lw-lg bg-lw-bg-subtle px-lw-base py-lw-md text-[13px] leading-relaxed text-lw-text-muted">
          Even if you don&apos;t book a call right now, we&apos;ll keep your profile on file and
          follow up if anything changes.
        </div>

        <div className={FOOTER_NOTE}>Powered by Lawrence</div>
      </div>
    </div>
  );
}
