// Stage 2 — the model-scored BANT delta, and the lead profile extracted in the
// same call.
//
// Two things changed versus the n8n `re-scoreJS` node this replaces:
//
//   1. IT SCORES THE PARENT. The n8n version opened with
//      `const aiReply = $json.reply.toLowerCase()` and matched every bonus
//      against the ADVISOR's words — so a warm reply mentioning September and
//      entrance exams awarded the parent timeline +10 and need 20 for saying
//      nothing (ADR-0018 finding 3). Only parent turns are scored here.
//
//   2. IT IS ABSOLUTE, NOT ADDITIVE. The model rates each dimension 0-25 over
//      the whole conversation rather than nudging Stage 1's keyword guess,
//      which is what makes Need measurable at all.
//
// The output is NEVER shown to the parent. It is not in the response body, not
// in a header, not in a stream part — it is computed off the request path
// entirely, inside an Inngest step.

import { z } from "zod";
import { generateForJob, type RoutedJob } from "@/lib/ai/provider";
import { readPrompt } from "@/lib/prompts";
import type { ConversationTurn } from "@/lib/bant/types";

const dimension = z.number().int().min(0).max(25);

// Profile fields are optional and nullable: the prompt is told to use null
// rather than guess, and a hallucinated child_age is worse than a blank one.
const nullableText = z.string().trim().min(1).nullable().optional().catch(null);

export const BantDeltaSchema = z.object({
  timeline: dimension,
  budget: dimension,
  authority: dimension,
  need: dimension,
  explanation: z.string().optional().catch(undefined),
  location: nullableText,
  timeline_text: nullableText,
  forcing_function: nullableText,
  child_age: z.number().int().min(0).max(25).nullable().optional().catch(null),
  current_school: nullableText,
  curriculum: nullableText,
  budget_range_usd: nullableText,
});

export type BantDelta = z.infer<typeof BantDeltaSchema>;

export class MalformedDeltaError extends Error {
  // Declared explicitly rather than as a constructor parameter property: Node's
  // --experimental-strip-types is strip-only, and a parameter property needs
  // real transformation. The test file runs under it.
  readonly raw: string;

  constructor(message: string, raw: string) {
    super(message);
    this.name = "MalformedDeltaError";
    this.raw = raw;
  }
}

/**
 * Models wrap JSON in a code fence often enough that refusing to unwrap one is
 * pedantry rather than strictness. Anything beyond that is a genuine failure.
 */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) return fenced[1].trim();

  // A model that prefixes a sentence still leaves one JSON object in there.
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) return trimmed.slice(first, last + 1);

  return trimmed;
}

/**
 * Only the parent's words. The advisor's turns are dropped rather than labelled
 * — labelling them "Advisor:" still puts the vocabulary in front of a model
 * that has been told to score vocabulary, which is how the n8n bug worked.
 */
function parentTranscript(messages: ConversationTurn[]): string {
  return messages
    .filter((m) => m.role === "user")
    .map((m) => `Parent: ${m.content}`)
    .join("\n\n");
}

/**
 * Parse and validate a model's raw delta response.
 *
 * Split out from the model call so the "never silently skip" requirement is a
 * unit test rather than a claim — see keywords.test.ts's sibling, delta.test.ts.
 * A scoring engine that quietly drops a malformed response produces a lead that
 * looks cold because the model stuttered, and nothing anywhere says so.
 */
export function parseDelta(raw: string, job: string): BantDelta {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    // Log the raw response and throw — never silently skip
    // (.claude/rules/ai-agents.md). The raw text is the model's own output
    // about a scoring rubric, not parent PII, so it is safe to log; the
    // transcript that produced it is not, and is not logged.
    console.error("[bant-delta] model did not return JSON", { job, raw });
    throw new MalformedDeltaError(`BANT delta from "${job}" was not JSON`, raw);
  }

  const validated = BantDeltaSchema.safeParse(parsed);
  if (!validated.success) {
    console.error("[bant-delta] model returned JSON that failed validation", {
      job,
      raw,
      issues: validated.error.issues,
    });
    throw new MalformedDeltaError(
      `BANT delta from "${job}" failed validation: ${validated.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`,
      raw
    );
  }

  return validated.data;
}

/**
 * Score a conversation. `job` selects the model: `bant_delta` (Haiku) for the
 * ordinary case, `bant_refine` (Sonnet) for the 50-75 band where the routing
 * decision actually costs somebody something.
 *
 * Both use the SAME prompt file on purpose. A separate refine prompt is a
 * second rubric that can drift from the first, and this one is already covered
 * by promptfooconfig.yaml — `npx promptfoo eval --providers
 * anthropic:messages:claude-sonnet-4-6` grades the refine path for free.
 */
export async function scoreDelta({
  messages,
  job = "bant_delta",
  sessionId,
}: {
  messages: ConversationTurn[];
  job?: Extract<RoutedJob, "bant_delta" | "bant_refine">;
  sessionId?: string;
}): Promise<BantDelta> {
  const result = await generateForJob({
    job,
    system: readPrompt("bant-delta.txt"),
    messages: [{ role: "user", content: parentTranscript(messages) }],
    // Deterministic extraction (.claude/rules/ai-agents.md).
    temperature: 0,
    sessionId,
  });

  return parseDelta(result.text, job);
}

export function deltaTotal(delta: BantDelta): number {
  return delta.timeline + delta.budget + delta.authority + delta.need;
}
