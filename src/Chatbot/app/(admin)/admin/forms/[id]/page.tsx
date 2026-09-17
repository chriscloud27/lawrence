// The intake form as a parent sees it. A preview of the template, not a live
// submission surface: intake form templates have no table yet, and Admin is
// read-only until build step 14.

import { IntakeFormClient } from "@/components/admin/IntakeFormClient";

export const metadata = { title: "Intake form" };

export default async function IntakeFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IntakeFormClient formId={id} />;
}
