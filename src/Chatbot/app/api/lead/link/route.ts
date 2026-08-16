import { N8N_LINK_LEAD_WEBHOOK_URL } from "@/lib/env";

interface LinkLeadRequestBody {
  sessionId: string;
  userId: string;
}

export async function POST(request: Request) {
  if (!N8N_LINK_LEAD_WEBHOOK_URL) {
    return Response.json(
      { error: "N8N_LINK_LEAD_WEBHOOK_URL is not configured" },
      { status: 503 }
    );
  }

  const body: LinkLeadRequestBody = await request.json();

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
