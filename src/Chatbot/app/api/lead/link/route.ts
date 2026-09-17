import { N8N_LINK_LEAD_WEBHOOK_URL } from "@/lib/env";
import { checkLimits, clientIp, limitResponse } from "@/lib/rate-limit";

interface LinkLeadRequestBody {
  sessionId: string;
  userId: string;
}

export async function POST(request: Request) {
  const body: LinkLeadRequestBody = await request.json();

  // Ceiling first: an unconfigured endpoint must not also be an unmetered one.
  // Not a conversational turn — identity linking fires once per sign-in — but
  // abuse here is a data-integrity problem, so it takes the same ceiling.
  const limit = await checkLimits({ ip: clientIp(request), sessionId: body?.sessionId });
  if (!limit.ok) return limitResponse(limit);

  if (!N8N_LINK_LEAD_WEBHOOK_URL) {
    return Response.json(
      { error: "N8N_LINK_LEAD_WEBHOOK_URL is not configured" },
      { status: 503 }
    );
  }

  const res = await fetch(N8N_LINK_LEAD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return Response.json(
      { error: `n8n webhook responded ${res.status}` },
      { status: 502 }
    );
  }

  const result = await res.json();
  return Response.json(result);
}
