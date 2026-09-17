// The two-stage BANT engine (ADR-0017, ADR-0018).
//
//   Stage 1  keyword scoring, no model call, three dimensions, ceiling 67.
//            Decides one thing: whether this conversation is worth a model
//            call. It never escalates to a human — Need is a quarter of the
//            final score and is not measurable here.
//
//   Stage 2  a model rates all four dimensions absolutely over the parent's
//            words. In the 50-75 band the same prompt runs again on a stronger
//            model, because that is the band where the routing decision costs
//            somebody real time and where the call is genuinely close.
//
// Everything in this module takes a conversation and returns a score. No
// request, no session, no route types: per ADR-0010 this same engine must run
// on a form-sourced `leads` row with no conversational turns at all.

import { scoreStage1, stage1Total, type Stage1Breakdown } from "@/lib/bant/keywords";
import { deltaTotal, scoreDelta, type BantDelta } from "@/lib/bant/delta";
import {
  DEFAULT_THRESHOLDS,
  type BantThresholds,
  type ConversationTurn,
  type LeadProfile,
  type RoutingTier,
  type ScoreResult,
} from "@/lib/bant/types";

export * from "@/lib/bant/types";
export { scoreStage1, stage1Total, STAGE1_CEILING } from "@/lib/bant/keywords";
export { MalformedDeltaError } from "@/lib/bant/delta";

/**
 * Routing tier from a refined score. The only thresholds ever applied to a
 * complete four-dimension score, and the only ones that spend counsellor time
 * (ADR-0017). `evals/assert-tier.js` asserts on exactly this function's
 * boundaries — if you change them, that harness is the thing that has to agree.
 */
export function tierFor(score: number, thresholds: BantThresholds): RoutingTier {
  if (score < thresholds.medium) return "standard";
  if (score <= thresholds.hot) return "booking";
  return "hot";
}

/**
 * Display band for Admin. Distinct from the routing tier on purpose: a
 * counsellor scanning a list wants finer gradation than the three decisions the
 * system makes. `lib/score.ts` owns the band boundaries for the UI; this maps
 * onto the three values the `leads.classification` column accepts.
 */
function classificationFor(score: number, thresholds: BantThresholds): "cold" | "warm" | "hot" {
  if (score > thresholds.hot) return "hot";
  if (score >= thresholds.medium) return "warm";
  return "cold";
}

function profileFrom(delta: BantDelta): LeadProfile {
  return {
    location: delta.location ?? null,
    timeline: delta.timeline_text ?? null,
    forcing_function: delta.forcing_function ?? null,
    child_age: delta.child_age ?? null,
    current_school: delta.current_school ?? null,
    curriculum: delta.curriculum ?? null,
    budget_range_usd: delta.budget_range_usd ?? null,
  };
}

const EMPTY_PROFILE: LeadProfile = {
  location: null,
  timeline: null,
  forcing_function: null,
  child_age: null,
  current_school: null,
  curriculum: null,
  budget_range_usd: null,
};

export interface ScoreLeadInput {
  /** The whole conversation. Only the `user` turns are ever scored. */
  messages: ConversationTurn[];
  /** Stage-1 breakdown from earlier turns, so the score accumulates. */
  previousBreakdown?: Partial<Stage1Breakdown>;
  thresholds?: BantThresholds;
  sessionId?: string;
}

export async function scoreLead({
  messages,
  previousBreakdown,
  thresholds = DEFAULT_THRESHOLDS,
  sessionId,
}: ScoreLeadInput): Promise<ScoreResult> {
  const parentTurns = messages.filter((m) => m.role === "user");
  const latest = parentTurns.at(-1)?.content ?? "";

  // --- Stage 1 -------------------------------------------------------------
  const stage1 = scoreStage1(latest, previousBreakdown);
  const stage1Score = stage1Total(stage1);

  if (stage1Score < thresholds.low) {
    // Below the gate: no model call. Note that the parent still receives a full
    // streamed reply — Stage 1 gates spend, never warmth. And because Stage 1
    // accumulates with Math.max, this is a "not yet", not a verdict.
    return {
      score: stage1Score,
      breakdown: stage1,
      tier: "standard",
      classification: "cold",
      refined: false,
      profile: EMPTY_PROFILE,
    };
  }

  // --- Stage 2 -------------------------------------------------------------
  let delta = await scoreDelta({ messages, job: "bant_delta", sessionId });
  let score = deltaTotal(delta);

  // The 50-75 band is where a human's time is on the line and the call is
  // closest. A second pass on a stronger model, same rubric, same prompt file.
  if (score >= thresholds.medium && score <= thresholds.hot) {
    delta = await scoreDelta({ messages, job: "bant_refine", sessionId });
    score = deltaTotal(delta);
  }

  return {
    score,
    breakdown: {
      timeline: delta.timeline,
      budget: delta.budget,
      authority: delta.authority,
      need: delta.need,
    },
    tier: tierFor(score, thresholds),
    classification: classificationFor(score, thresholds),
    refined: true,
    profile: profileFrom(delta),
    explanation: delta.explanation,
  };
}
