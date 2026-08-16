import { getSupabaseBrowserClient } from "./supabase-browser";

export interface LeadRecap {
  classification: string | null;
  score: number;
  timeline: string | null;
  budgetRangeUsd: string | null;
  curriculum: string | null;
  currentSchool: string | null;
  capturedName: string | null;
  lastAssistantMessage: string | null;
}

export async function fetchLatestLeadRecap(): Promise<LeadRecap | null> {
  const supabase = getSupabaseBrowserClient();

  // Fetch the most recent lead for the authenticated user (RLS automatically scopes to auth.uid())
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, classification, score, timeline, budget_range_usd, curriculum, current_school, captured_name")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (leadsError || !leads || leads.length === 0) {
    return null;
  }

  const lead = leads[0];

  // Fetch the most recent assistant message for this lead
  const { data: messages } = await supabase
    .from("messages")
    .select("content, role")
    .eq("lead_id", lead.id)
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1);

  const lastAssistantMessage = messages && messages.length > 0 ? messages[0].content : null;

  return {
    classification: lead.classification,
    score: lead.score,
    timeline: lead.timeline,
    budgetRangeUsd: lead.budget_range_usd,
    curriculum: lead.curriculum,
    currentSchool: lead.current_school,
    capturedName: lead.captured_name,
    lastAssistantMessage,
  };
}
