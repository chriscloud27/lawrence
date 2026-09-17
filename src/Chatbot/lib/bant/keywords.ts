// Stage 1 — keyword pre-qualification, ported from `pre-qualifyJS` in
// n8n/workflows/bant-prequalify.json (archived under .claude/docs/archive/n8n/).
//
// Three dimensions, no model call. Its whole job is to decide whether a
// conversation is worth spending a Stage-2 model call on (ADR-0017): it never
// escalates to a human, because Need — a quarter of the final score — is not
// measurable here at all.
//
// TWO BUGS ARE FIXED IN THIS PORT (ADR-0017 § "the scorer reads negations as
// maximum signal", ADR-0018 finding 2). Both were invisible in the n8n canvas,
// which renders a box labelled "pre-qualifyJS" rather than the line inside it.
//
//   1. NEGATIONS FIRST. The original was an else-if chain ordered
//      strongest-match-first over raw substrings, so "my decision" matched
//      inside "not my decision" and a parent disqualifying themselves scored
//      maximum authority. Every chain below tests its negation branch first.
//
//   2. WORD BOUNDARIES AND NORMALISED APOSTROPHES. "I'm looking" scored 22 and
//      "I am looking" scored 3, because `i'm looking` was a maximum-authority
//      keyword and a curly apostrophe missed it entirely.
//
// The 23 / 22 / 22 maxima are deliberately unchanged. They are what make the
// achievable Stage-1 ceiling 67 rather than the nominal 75, and ADR-0017's gate
// at 25 is reasoned against exactly those numbers.

export interface Stage1Breakdown {
  timeline: number;
  budget: number;
  authority: number;
}

/** Per-dimension maxima. Below 25 by construction — see ADR-0017. */
export const STAGE1_MAX = { timeline: 23, budget: 22, authority: 22 } as const;

/** The highest total Stage 1 can produce: 67, not 75. */
export const STAGE1_CEILING =
  STAGE1_MAX.timeline + STAGE1_MAX.budget + STAGE1_MAX.authority;

/**
 * Curly apostrophes and smart quotes come from real keyboards and phone
 * keyboards constantly. Folding them to ASCII before matching is the
 * difference between "I'm the one deciding" scoring 22 and scoring 3.
 */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ordered rules, first match wins. Negation rules come first in every list so
 * a denial cannot fall through into the positive branch that contains it as a
 * substring.
 */
interface Rule {
  points: number;
  match: RegExp;
}

const TIMELINE_RULES: Rule[] = [
  // Negative / no-signal first.
  { points: 2, match: /\b(just (researching|looking|browsing)|no (specific |particular )?timeline|nothing (urgent|fixed)|no rush)\b/ },
  // Strong.
  { points: 23, match: /\b(urgent|urgently|asap|immediately|next month|this month|within a month|semester starts?|term starts?|september|january|deadline)\b/ },
  // Medium.
  { points: 15, match: /\b(few months|couple of months|spring|summer|autumn|next term|end of (the )?year|before next year|six weeks|[0-9]+ weeks)\b/ },
  // Weak.
  { points: 8, match: /\b(exploring|sometime|eventually|not sure|early days|starting to look)\b/ },
];

const BUDGET_RULES: Rule[] = [
  // Negation first: "cannot afford premium" must never reach the premium rule.
  { points: 2, match: /\b(can'?t afford|cannot afford|too expensive|out of (our )?(price )?range|very budget[- ]limited|budget[- ]limited|scholarship only|need (a )?scholarship|no budget)\b/ },
  // Cost-conscious.
  { points: 8, match: /\b(public school|state school|state sector|cost[- ]conscious|budget[- ]conscious|budget matters|cost (does )?matters?|affordable|keep costs down)\b/ },
  // Considering — checked before the strong rule because "considering private"
  // contains "private".
  { points: 14, match: /\b(considering private|looking at both|open to options|weighing up|both private and)\b/ },
  // Strong.
  { points: 22, match: /\b(premium|international school|boarding|selective|top[- ]tier|private school|independent school|fees aren'?t|money (is )?(no|not an) (object|issue)|whatever it takes)\b/ },
  // Bare "private" last, so it cannot pre-empt "considering private".
  { points: 22, match: /\bprivate\b/ },
];

const AUTHORITY_RULES: Rule[] = [
  // Negation first. This is the rule the n8n version had LAST, which is the
  // entire bug: "not my decision" contains "my decision".
  { points: 2, match: /\b(not my decision|isn'?t my decision|spouse decides|wife decides|husband decides|partner (is )?(leading|decides)|she'?ll decide|he'?ll decide|she is really the one|he is really the one|gathering information for)\b/ },
  // Consulting.
  { points: 9, match: /\b(consulting (with)?|discussing (with|it with)|getting input|asking around|talking to family)\b/ },
  // Joint — before the strong rule, because "we decided together" contains
  // nothing strong but "I decide" patterns can overlap loosely worded joint
  // phrasing.
  { points: 16, match: /\b(we decide|we decided|we'?ll decide|decide together|joint decision|with (my )?(spouse|wife|husband|partner)|partner and i|my wife and i|my husband and i|family consensus)\b/ },
  // Strong.
  { points: 22, match: /\b(i decide|i'?m the one|i am the one|my decision|i lead|i'?m handling|i am handling|i'?m leading|i am leading|i decide these things|my call)\b/ },
];

function scoreDimension(text: string, rules: Rule[], noSignal: number): number {
  for (const rule of rules) {
    if (rule.match.test(text)) return rule.points;
  }
  return noSignal;
}

/**
 * Score one parent message, then accumulate against whatever Stage 1 returned
 * on earlier turns.
 *
 * Accumulation is `Math.max` per dimension, exactly as the n8n version did: a
 * score never decreases, so a low total is a "not yet" rather than a verdict,
 * and a later turn can lift the same parent over the gate.
 *
 * Takes text and a previous breakdown — not a request, a session, or a route
 * type. Per ADR-0010 this same engine has to run on a form-sourced `leads` row
 * with no conversational turns at all.
 */
export function scoreStage1(
  parentText: string,
  previous?: Partial<Stage1Breakdown>
): Stage1Breakdown {
  const text = normalise(parentText ?? "");

  // 3, not 0, for "said nothing relevant" — carried over from the n8n scorer so
  // ADR-0017's measured table (e.g. "hello" scores 9) still holds.
  const turn: Stage1Breakdown = {
    timeline: scoreDimension(text, TIMELINE_RULES, 3),
    budget: scoreDimension(text, BUDGET_RULES, 3),
    authority: scoreDimension(text, AUTHORITY_RULES, 3),
  };

  return {
    timeline: Math.max(turn.timeline, previous?.timeline ?? 0),
    budget: Math.max(turn.budget, previous?.budget ?? 0),
    authority: Math.max(turn.authority, previous?.authority ?? 0),
  };
}

export function stage1Total(breakdown: Stage1Breakdown): number {
  return breakdown.timeline + breakdown.budget + breakdown.authority;
}
