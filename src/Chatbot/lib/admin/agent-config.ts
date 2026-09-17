// Counsellor-facing reads and writes of `agent_config` (ADR-0018).
//
// Distinct from lib/agent-config.ts on purpose. That one reads the active row
// for the anonymous chat route using the SERVICE key; this one goes through the
// cookie-bound client so RLS decides what an individual counsellor may see and
// change — `agent_config_owner_insert` restricts writes to the `owner` role.
// Two callers with different privileges must not share one client.

import { cache } from "react";
import { getSupabaseRequestClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import { DEFAULT_THRESHOLDS, type BantThresholds } from "@/lib/bant/types";
import type { RoutingCopy } from "@/lib/agent-config";

export interface AgentConfigVersion {
  id: string;
  agencyId: string;
  systemPrompt: string;
  thresholds: BantThresholds;
  routingCopy: RoutingCopy;
  version: number;
  createdAt: string;
  createdBy: string | null;
  isActive: boolean;
}

const COLUMNS =
  "id, agency_id, system_prompt, bant_thresholds, routing_copy, version, created_at, created_by, is_active";

interface Row {
  id: string;
  agency_id: string;
  system_prompt: string;
  bant_thresholds: Partial<BantThresholds> | null;
  routing_copy: Partial<RoutingCopy> | null;
  version: number;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
}

function toVersion(row: Row): AgentConfigVersion {
  return {
    id: row.id,
    agencyId: row.agency_id,
    systemPrompt: row.system_prompt,
    thresholds: { ...DEFAULT_THRESHOLDS, ...(row.bant_thresholds ?? {}) },
    routingCopy: (row.routing_copy ?? {}) as RoutingCopy,
    version: row.version,
    createdAt: row.created_at,
    createdBy: row.created_by,
    isActive: row.is_active,
  };
}

/**
 * Every version, newest first. No `.eq("agency_id", …)`: isolation here is RLS
 * and only RLS. A second, application-level filter looks like belt and braces
 * and is actually a liability — the day the two disagree, the one that is wrong
 * is the one nobody is testing.
 */
export const listAgentConfigVersions = cache(
  async (): Promise<AgentConfigVersion[]> => {
    const supabase = await getSupabaseRequestClient();
    await requireUser();

    const { data, error } = await supabase
      .from("agent_config")
      .select(COLUMNS)
      .order("version", { ascending: false })
      .limit(50)
      .returns<Row[]>();

    if (error) throw new Error(`Could not list agent_config: ${error.message}`);
    return (data ?? []).map(toVersion);
  },
);

export async function getActiveVersion(): Promise<AgentConfigVersion | null> {
  const versions = await listAgentConfigVersions();
  return versions.find((v) => v.isActive) ?? null;
}
