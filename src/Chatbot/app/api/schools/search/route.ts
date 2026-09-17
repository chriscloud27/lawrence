import { searchSchools } from "@/lib/schools";
import { checkLimits, clientIp, limitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  // Database load rather than LLM spend, but still an unauthenticated public
  // endpoint — same IP ceiling. No sessionId on a GET, so no turn counting.
  const limit = await checkLimits({ ip: clientIp(request) });
  if (!limit.ok) return limitResponse(limit);

  const { searchParams } = new URL(request.url);

  const schools = await searchSchools({
    name: searchParams.get("name") ?? undefined,
    city: searchParams.get("city") && searchParams.get("city") !== "All cities"
      ? searchParams.get("city")!
      : undefined,
    curriculum:
      searchParams.get("curriculum") &&
      !["Any", "Any course"].includes(searchParams.get("curriculum")!)
        ? searchParams.get("curriculum")!
        : undefined,
    ageMin: searchParams.get("age_min") ? parseInt(searchParams.get("age_min")!) : undefined,
    ageMax: searchParams.get("age_max") ? parseInt(searchParams.get("age_max")!) : undefined,
    feesMaxUsd: searchParams.get("fees_max_usd")
      ? parseInt(searchParams.get("fees_max_usd")!)
      : undefined,
    boarding: searchParams.get("boarding") === "true",
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
  });

  return Response.json({ schools });
}
