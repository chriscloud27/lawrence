// Shared shapes for the scoring engine.
//
// Deliberately free of request, session, and route types. Per ADR-0010 the
// same engine has to run on a `leads` row that came from the v2 structured
// intake form with no conversational turns at all — so "the AI agent's
// follow-up turn" must not appear in any signature here.

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

/** The three routing tiers applied to a complete four-dimension score. */
export type RoutingTier = "standard" | "booking" | "hot";

/** ADR-0017's thresholds, as stored in `agent_config.bant_thresholds`. */
export interface BantThresholds {
  /** Stage-1 gate: below this, no Stage-2 model call. */
  low: number;
  /** Refined score at or above this offers a booking. */
  medium: number;
  /** Refined score above this escalates to a human. */
  hot: number;
}

export const DEFAULT_THRESHOLDS: BantThresholds = { low: 25, medium: 50, hot: 75 };

/** The four-dimension breakdown stored in `leads.score_breakdown`. */
export interface ScoreBreakdown {
  timeline: number;
  budget: number;
  authority: number;
  need?: number;
}

/** What the parent's situation looks like, for the counsellor who picks it up. */
export interface LeadProfile {
  location: string | null;
  timeline: string | null;
  forcing_function: string | null;
  child_age: number | null;
  current_school: string | null;
  curriculum: string | null;
  budget_range_usd: string | null;
}

export interface ScoreResult {
  /** 0–100 once Stage 2 has run; 0–67 when only Stage 1 did. */
  score: number;
  breakdown: ScoreBreakdown;
  tier: RoutingTier;
  /** Display band for Admin — `lib/score.ts` owns the band boundaries. */
  classification: "cold" | "warm" | "hot";
  /** True when a model scored this; false when Stage 1 gated it out. */
  refined: boolean;
  profile: LeadProfile;
  /** The model's one-sentence rationale. Internal only, never parent-visible. */
  explanation?: string;
}
