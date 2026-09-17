// Score the turn, persist the lead and transcript, and escalate if hot.
//
// Replaces the whole right-hand side of bant-prequalify.json: `re-scoreJS`, the
// `upsert-lead*` / `insert-messages*` HTTP nodes, and the `inform-agent` Gmail
// node (ADR-0018).
//
// Why each write is its own `step.run`: steps are memoised and retried
// individually. If the messages insert fails, the retry does NOT re-run the
// model or re-send the email — it resumes at the failed step with the earlier
// results intact. That is the entire reason this is not just an `await` in the
// route handler.

import { NonRetriableError } from "inngest";
import { chatTurnCompleted, inngest } from "@/inngest/client";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getActiveAgentConfig, getAgencyId } from "@/lib/agent-config";
import { MalformedDeltaError, scoreLead } from "@/lib/bant";
import { NotificationNotConfiguredError, sendHotLeadEmail } from "@/lib/notify";
import type { ScoreBreakdown } from "@/lib/bant/types";

export const scoreAndPersist = inngest.createFunction(
  {
    id: "score-and-persist",
    // Two turns of the same conversation racing would interleave their reads
    // and writes of score_breakdown and produce a score that depends on which
    // one landed second. One at a time per session.
    concurrency: { key: "event.data.sessionId", limit: 1 },
    retries: 3,
    // v4 puts the trigger inside the options object rather than in a third
    // argument, and takes the typed event rather than a bare name string.
    triggers: [chatTurnCompleted],
  },
  async ({ event, step }) => {
    const { sessionId, messages } = event.data;

    const [config, agencyId] = await Promise.all([
      getActiveAgentConfig(),
      getAgencyId(),
    ]);

    // --- Score -------------------------------------------------------------
    const scored = await step.run("score", async () => {
      const supabase = getSupabaseAdminClient();

      // Stage 1 accumulates across turns (ADR-0017), so the previous breakdown
      // is an input, not a reset.
      const { data: existing } = await supabase
        .from("leads")
        .select("score_breakdown")
        .eq("id", sessionId)
        .maybeSingle<{ score_breakdown: ScoreBreakdown | null }>();

      try {
        return await scoreLead({
          messages,
          previousBreakdown: existing?.score_breakdown ?? undefined,
          thresholds: config.thresholds,
          sessionId,
        });
      } catch (error) {
        if (error instanceof MalformedDeltaError) {
          // Already logged with the raw response in lib/bant/delta.ts. Retrying
          // a model that answered with prose will usually get prose again, so
          // fail loudly and stop rather than burning three attempts.
          throw new NonRetriableError(error.message);
        }
        throw error;
      }
    });

    // --- Persist the lead --------------------------------------------------
    await step.run("upsert-lead", async () => {
      const { error } = await getSupabaseAdminClient()
        .from("leads")
        .upsert(
          {
            id: sessionId,
            session_id: sessionId,
            agency_id: agencyId,
            source: "chatbot",
            score: scored.score,
            score_breakdown: scored.breakdown,
            classification: scored.classification,
            // Profile fields are only written when the model actually extracted
            // one: a null here must not erase what an earlier turn captured.
            ...definedOnly({
              location: scored.profile.location,
              timeline: scored.profile.timeline,
              forcing_function: scored.profile.forcing_function,
              child_age: scored.profile.child_age,
              current_school: scored.profile.current_school,
              curriculum: scored.profile.curriculum,
              budget_range_usd: scored.profile.budget_range_usd,
            }),
          },
          { onConflict: "id" },
        );

      if (error) throw new Error(`leads upsert failed: ${error.message}`);
    });

    // --- Persist the transcript -------------------------------------------
    await step.run("insert-messages", async () => {
      const supabase = getSupabaseAdminClient();

      // Only the turns not already stored. `messages` carries no natural key,
      // so the count of existing rows is what makes a retry idempotent.
      const { count, error: countError } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", sessionId);

      if (countError)
        throw new Error(`messages count failed: ${countError.message}`);

      const newTurns = messages.slice(count ?? 0);
      if (newTurns.length === 0) return { inserted: 0 };

      const { error } = await supabase.from("messages").insert(
        newTurns.map((m, i) => ({
          // messages.id is TEXT NOT NULL with no default. Derived from the
          // session and position rather than random, so a retry that partially
          // succeeded collides instead of duplicating.
          id: `${sessionId}-${(count ?? 0) + i}`,
          lead_id: sessionId,
          role: m.role,
          content: m.content,
        })),
      );

      if (error) throw new Error(`messages insert failed: ${error.message}`);
      return { inserted: newTurns.length };
    });

    // --- Escalate ----------------------------------------------------------
    // Only on a refined score: a lead must never reach a counsellor on three
    // keyword-matched dimensions with no Need signal (ADR-0017 § Decision 1).
    if (!scored.refined || scored.score <= config.thresholds.hot) {
      return {
        sessionId,
        score: scored.score,
        tier: scored.tier,
        escalated: false,
      };
    }

    const escalation = await step.run("notify-admissions", async () => {
      const supabase = getSupabaseAdminClient();

      // Claim the escalation before sending. A conditional UPDATE that returns
      // no row means somebody already escalated this lead — which is exactly
      // what a retry of a step that sent the mail and then crashed looks like.
      const { data: claimed, error } = await supabase
        .from("leads")
        .update({ escalated_at: new Date().toISOString() })
        .eq("id", sessionId)
        .is("escalated_at", null)
        .select("id")
        .maybeSingle<{ id: string }>();

      if (error) throw new Error(`escalation claim failed: ${error.message}`);
      if (!claimed) return { sent: false, reason: "already escalated" };

      try {
        await sendHotLeadEmail({
          leadId: sessionId,
          score: scored.score,
          breakdown: scored.breakdown,
          explanation: scored.explanation,
          profile: scored.profile,
          recentParentTurns: messages
            .filter((m) => m.role === "user")
            .slice(-3)
            .map((m) => m.content),
        });
      } catch (sendError) {
        // Release the claim so a retry can try again — holding it would turn a
        // transient Resend outage into a lead nobody is ever told about, which
        // is precisely the failure ADR-0017 found in the n8n version.
        await supabase
          .from("leads")
          .update({ escalated_at: null })
          .eq("id", sessionId);

        // A missing API key is not going to fix itself on the third attempt.
        // Fail once, loudly, so the log says "configure Resend" rather than
        // three identical stack traces that read like a transient fault.
        if (sendError instanceof NotificationNotConfiguredError) {
          throw new NonRetriableError(
            `Hot lead ${sessionId} scored ${scored.score} but could not be sent: ${sendError.message}`
          );
        }

        throw sendError;
      }

      return { sent: true };
    });

    return {
      sessionId,
      score: scored.score,
      tier: scored.tier,
      escalated: escalation.sent,
    };
  },
);

/** Drops null/undefined so an upsert never overwrites a captured value with a blank. */
function definedOnly<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== null && v !== undefined),
  ) as Partial<T>;
}
