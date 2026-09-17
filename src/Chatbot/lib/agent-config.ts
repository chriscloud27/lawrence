// Reads the active `agent_config` row — the prompt and thresholds a counsellor
// owns (ADR-0018).
//
// Read with the SERVICE key, not the anon one. The parent is anonymous, so
// there is no session for RLS to key off, and the table grants nothing to anon
// deliberately: one agency's visitors must not be able to read another
// agency's prompt. The route resolves its own tenant from AGENCY_SLUG rather
// than from anything in the request, so a crafted request cannot select a
// tenant either.

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { AGENCY_SLUG } from "@/lib/env";
import { DEFAULT_THRESHOLDS, type BantThresholds } from "@/lib/bant/types";

export interface RoutingCopy {
  /** Shown when the per-session turn cap is reached. Never mentions the cap. */
  turn_cap_close: string;
  resources: string;
  booking: string;
}

export interface AgentConfig {
  id: string;
  agencyId: string;
  systemPrompt: string;
  thresholds: BantThresholds;
  routingCopy: RoutingCopy;
  version: number;
}

const FALLBACK_COPY: RoutingCopy = {
  turn_cap_close:
    "We have covered a lot of ground together — thank you for sharing all of that. " +
    "I would suggest taking some time with what we have talked through, and coming " +
    "back whenever you would like to pick the conversation back up.",
  resources:
    "There is a lot to weigh up here, and no rush to decide any of it today. " +
    "Have a read at your own pace, and come back whenever you would like to talk it through.",
  booking:
    "It might be worth a proper conversation with one of our advisors — they can go " +
    "through the specifics with you in a way this chat cannot.",
};

interface ConfigRow {
  id: string;
  agency_id: string;
  system_prompt: string;
  bant_thresholds: Partial<BantThresholds> | null;
  routing_copy: Partial<RoutingCopy> | null;
  version: number;
}

/**
 * The active config for this deployment's agency.
 *
 * Not cached across requests on purpose: an edit in Admin has to change the
 * next turn with no redeploy, which is the whole point of the table. One
 * indexed single-row read per turn, against a model call that costs orders of
 * magnitude more.
 */
export async function getActiveAgentConfig(): Promise<AgentConfig> {
  const supabase = getSupabaseAdminClient();

  // One round trip, joined on the slug rather than on a separately-fetched
  // agency id. The two-query version cached that id at module scope and went
  // stale the moment the agencies table was rebuilt — which is exactly what a
  // local `supabase db reset` does, and it surfaced as a hard 500 on every
  // turn with a message blaming the migration.
  const { data, error } = await supabase
    .from("agent_config")
    .select("id, agency_id, system_prompt, bant_thresholds, routing_copy, version, agencies!inner(slug)")
    .eq("is_active", true)
    .eq("agencies.slug", AGENCY_SLUG)
    .maybeSingle<ConfigRow>();

  if (error) throw new Error(`Could not read agent_config: ${error.message}`);
  if (!data) {
    throw new Error(
      `No active agent_config row for agency "${AGENCY_SLUG}". ` +
        `The migration seeds version 1 — has it been applied to this project?`
    );
  }

  return {
    id: data.id,
    agencyId: data.agency_id,
    systemPrompt: data.system_prompt,
    // Merged over the defaults rather than trusted wholesale: a hand-edited
    // jsonb missing `hot` would otherwise make every comparison NaN, and every
    // lead would silently route to `standard`.
    thresholds: { ...DEFAULT_THRESHOLDS, ...(data.bant_thresholds ?? {}) },
    routingCopy: { ...FALLBACK_COPY, ...(data.routing_copy ?? {}) },
    version: data.version,
  };
}

/**
 * The tenant every chatbot-sourced lead is written into.
 *
 * Deliberately NOT memoised. A cached uuid here survives the agencies table
 * being rebuilt underneath it, and the failure mode is a 500 on every turn that
 * blames the migration rather than the cache. It is one indexed single-row read
 * against a model call that costs orders of magnitude more.
 */
export async function getAgencyId(): Promise<string> {
  const { data, error } = await getSupabaseAdminClient()
    .from("agencies")
    .select("id")
    .eq("slug", AGENCY_SLUG)
    .maybeSingle<{ id: string }>();

  if (error) throw new Error(`Could not resolve agency "${AGENCY_SLUG}": ${error.message}`);
  if (!data) throw new Error(`No agency with slug "${AGENCY_SLUG}"`);

  return data.id;
}
