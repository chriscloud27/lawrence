// Document upload — the v2 intake path (ADR-0010). Genuinely interactive, so it
// stays a Client Component; the page itself only resolves the lead so the route
// 404s for a lead the counsellor cannot see.

import { notFound } from "next/navigation";
import { getLead } from "@/lib/leads";
import { DocumentUploadClient } from "@/components/admin/DocumentUploadClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Documents" };

export default async function DocumentUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return <DocumentUploadClient leadId={lead.id} />;
}
