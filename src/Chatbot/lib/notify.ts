// Outbound notification to the admissions team.
//
// Resend, not the n8n Gmail node it replaces: that node authenticated as a
// personal test account, with no domain authentication, no deliverability
// story, and no audit trail — and, per ADR-0017, was wired to an unreachable
// branch and never sent anything at all.
//
// Called only from an Inngest step, never from the request path.

import { Resend } from "resend";
import { HotLeadEmail, type HotLeadEmailProps } from "@/emails/hot-lead";
import {
  ADMISSIONS_EMAIL,
  NEXT_PUBLIC_SITE_URL,
  RESEND_API_KEY,
  RESEND_FROM,
} from "@/lib/env";

export class NotificationNotConfiguredError extends Error {}

let resend: Resend | null = null;

function getResend(): Resend {
  if (!RESEND_API_KEY) {
    throw new NotificationNotConfiguredError(
      "RESEND_API_KEY is not configured",
    );
  }
  if (!resend) resend = new Resend(RESEND_API_KEY);
  return resend;
}

export async function sendHotLeadEmail(
  props: Omit<HotLeadEmailProps, "adminUrl">,
): Promise<void> {
  if (!RESEND_FROM || !ADMISSIONS_EMAIL) {
    throw new NotificationNotConfiguredError(
      "RESEND_FROM / ADMISSIONS_EMAIL are not configured — a hot lead would be scored and then silently dropped",
    );
  }

  const adminUrl = `${NEXT_PUBLIC_SITE_URL}/admin/parents/${props.leadId}`;

  const { error } = await getResend().emails.send({
    from: RESEND_FROM,
    to: ADMISSIONS_EMAIL,
    // No name, no score, no location in the subject: this lands in an inbox
    // that is not necessarily private, and the row is one click away.
    subject: "New enquiry worth a call",
    react: HotLeadEmail({ ...props, adminUrl }),
  });

  if (error)
    throw new Error(`Resend rejected the hot-lead email: ${error.message}`);
}
