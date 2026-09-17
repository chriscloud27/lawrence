// Counsellor-facing reads of the app-owned tables, modelled on lib/schools.ts.
//
// Tenant isolation is RLS and only RLS (ADR-0016): `leads_agency_select` and
// `messages_agency_select` scope every row below to the signed-in counsellor's
// agency. Deliberately no `.eq("agency_id", …)` on top — two isolation
// mechanisms means the weaker one eventually wins an argument nobody is
// watching, and an application filter that silently disagrees with the policy
// is exactly that.
//
// Read-only. Writes go through n8n today and the TypeScript agent after step 14.

import { getSupabaseRequestClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import type { Agency, Lead, LeadMessage, LeadStatus, ScoreBand } from "@/types/lawrence";
import { getScoreBand } from "@/lib/score";

const LEAD_COLUMNS =
  "id, created_at, agency_id, source, status, classification, score, score_breakdown, " +
  "captured_name, captured_email, location, timeline, forcing_function, child_age, " +
  "current_school, curriculum, budget_range_usd";

export interface LeadFilters {
  band?: ScoreBand;
  status?: LeadStatus;
  /** Matches captured_name or captured_email. */
  search?: string;
  limit?: number;
}

export async function listLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  const supabase = await getSupabaseRequestClient();
  await requireUser();

  let query = supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .order("score", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) {
    const needle = `%${filters.search}%`;
    query = query.or(`captured_name.ilike.${needle},captured_email.ilike.${needle}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const leads = (data ?? []) as unknown as Lead[];

  // Band is derived from `score`, not stored, so it cannot be a WHERE clause.
  return filters.band ? leads.filter((l) => getScoreBand(l.score) === filters.band) : leads;
}

export async function getLead(id: string): Promise<Lead | null> {
  const supabase = await getSupabaseRequestClient();
  await requireUser();

  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Lead) ?? null;
}

export async function listMessages(leadId: string): Promise<LeadMessage[]> {
  const supabase = await getSupabaseRequestClient();
  await requireUser();

  const { data, error } = await supabase
    .from("messages")
    .select("id, lead_id, role, content, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as LeadMessage[];
}

/**
 * The signed-in counsellor's agency. `agencies_member_select` already limits
 * this to agencies they belong to, so a single row is the expected result —
 * one counsellor, one agency, in this prototype.
 */
export async function getCurrentAgency(): Promise<Agency | null> {
  const supabase = await getSupabaseRequestClient();
  await requireUser();

  const { data, error } = await supabase
    .from("agencies")
    .select("id, slug, name, intake_method, accent_family")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Agency) ?? null;
}
