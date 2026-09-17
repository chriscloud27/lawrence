// Shared Lawrence domain types, mapped onto the real database row shapes —
// `leads` and `messages` as defined in .claude/docs/data/db-tables.md, not the
// mock field names the Vite Admin app used before build step 13.

export type ScoreBand = "cold" | "warm" | "qualified" | "hot";

/** `leads.status` — matches the CHECK constraint on the column. */
export type LeadStatus = "new" | "contacted" | "booked" | "nurture" | "closed";

/** `leads.classification` — the three routing tiers, written by the scorer. */
export type LeadClassification = "hot" | "warm" | "cold";

/** `leads.source` — ADR-0010's intake-method tag. */
export type LeadSource = "chatbot" | "form";

/**
 * `leads.score_breakdown`. Every dimension is 0–25 and every one is optional:
 * Stage 1 pre-qual writes only timeline/budget/authority, and `need` appears
 * after Stage 2 refinement (.claude/rules/bant-scoring.md).
 */
export interface BantBreakdown {
  budget?: number;
  authority?: number;
  need?: number;
  timeline?: number;
}

/** One row of `leads`. */
export interface Lead {
  id: string;
  created_at: string;
  agency_id: string;
  source: LeadSource;
  status: LeadStatus;
  classification: LeadClassification | null;
  score: number;
  score_breakdown: BantBreakdown | null;
  captured_name: string | null;
  captured_email: string | null;
  location: string | null;
  timeline: string | null;
  forcing_function: string | null;
  child_age: number | null;
  current_school: string | null;
  curriculum: string | null;
  budget_range_usd: string | null;
}

/** One row of `messages`. */
export interface LeadMessage {
  id: string;
  lead_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

/** One row of `agencies`. */
export interface Agency {
  id: string;
  slug: string;
  name: string;
  intake_method: "chatbot" | "form" | "both";
  accent_family: string;
}

// --- Form builder -----------------------------------------------------------
// Intake form templates have no table yet — the builder is a prototype surface
// over local state (step 13 is read-only; writes land in step 14).

export type FormStatus = "live" | "draft" | "ab-test";

export interface IntakeFormTemplate {
  id: string;
  name: string;
  fieldCount: number;
  submissions: number;
  completionRate: number;
  status: FormStatus;
  lastEdited: string;
  isDefault: boolean;
}
