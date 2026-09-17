import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  generateText,
  type LanguageModel,
  type ModelMessage,
  type SystemModelMessage,
} from "ai";

import {
  AI_COMPAT_API_KEY,
  AI_COMPAT_BASE_URL,
  AI_COMPAT_REGION,
  AI_MODEL_BANT_DELTA,
  AI_MODEL_BANT_REFINE,
  AI_MODEL_PARENT_TURN,
  AI_MODEL_SCHOOL_ENRICH,
  ANTHROPIC_API_KEY,
  OPENAI_API_KEY,
} from "@/lib/env";

// The one place in this codebase that names a model or imports a provider SDK.
// Everything else asks for a *job* and gets a model back, so changing what runs
// a job is a one-line diff here instead of a search across call sites.
// See .claude/rules/ai-providers.md and ADR-0015.

export type AiJob =
  | "parent_turn" // highest volume, highest quality sensitivity
  | "bant_delta" // structured extraction, folded into the turn today
  | "bant_refine" // Stage-2, 50–75 band only
  | "school_enrich" // ingestion, batched, lowest risk
  | "doc_extract"; // v2 document upload — deliberately unrouted

/** Jobs that have a model today. `doc_extract` is v2 and has none. */
export type RoutedJob = Exclude<AiJob, "doc_extract">;

export type ProviderId = "anthropic" | "openai" | "openai-compatible";

export interface Route {
  provider: ProviderId;
  model: string;
  /**
   * Where the endpoint actually serves from. ADR-0015 makes this part of the
   * record rather than a footnote: the market is UK agencies handling data
   * about children, so "which region" is a compliance answer, not a preference.
   */
  endpointRegion: string;
}

// Data, not branching logic — a routing change is meant to read as a one-line
// diff in review. This step changes no routing: every conversational job is
// Anthropic, exactly as it was before the seam existed.
export const ROUTING: Record<RoutedJob, Route> = {
  parent_turn: {
    provider: "anthropic",
    // Pre-4.6 model: thinking takes `budget_tokens`; passing `effort` 400s.
    model: AI_MODEL_PARENT_TURN ?? "claude-haiku-4-5",
    endpointRegion: "anthropic-api:us",
  },
  bant_delta: {
    provider: "anthropic",
    model: AI_MODEL_BANT_DELTA ?? "claude-haiku-4-5",
    endpointRegion: "anthropic-api:us",
  },
  bant_refine: {
    provider: "anthropic",
    model: AI_MODEL_BANT_REFINE ?? "claude-sonnet-4-6",
    endpointRegion: "anthropic-api:us",
  },
  school_enrich: {
    provider: "openai",
    model: AI_MODEL_SCHOOL_ENRICH ?? "gpt-4o-mini",
    endpointRegion: "openai-api:us",
  },
};

const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY });
const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

// Wired so an open-weight candidate is a routing-table edit rather than a new
// integration. No job points here, and none may until evals have run.
const compat =
  AI_COMPAT_BASE_URL && AI_COMPAT_API_KEY
    ? createOpenAI({ baseURL: AI_COMPAT_BASE_URL, apiKey: AI_COMPAT_API_KEY })
    : null;

export function routeFor(job: RoutedJob): Route {
  const route = ROUTING[job];
  if (!route) throw new Error(`No route configured for AI job "${job}"`);
  if (route.provider === "openai-compatible" && !route.endpointRegion) {
    throw new Error(`Route for "${job}" must declare endpointRegion`);
  }
  return route;
}

export function modelFor(job: RoutedJob): LanguageModel {
  const route = routeFor(job);
  switch (route.provider) {
    case "anthropic":
      return anthropic(route.model);
    case "openai":
      return openai(route.model);
    case "openai-compatible":
      if (!compat) {
        throw new Error(
          `Job "${job}" routes to an OpenAI-compatible endpoint, but AI_COMPAT_BASE_URL / AI_COMPAT_API_KEY are unset`
        );
      }
      return compat(route.model);
  }
}

/** Region of the compat endpoint, for the cost log. Unset until one is used. */
export const compatRegion = AI_COMPAT_REGION;

// --- Prompt caching ---------------------------------------------------------
// Caching is the largest single cost lever in the ADR-0015 model, and the thing
// an open-weight endpoint most often lacks. Marking the cacheable blocks here
// means a provider swap shows up as a measured cost change in the log below,
// not as a silent one.

const EPHEMERAL = { anthropic: { cacheControl: { type: "ephemeral" } } } as const;

/** System prompt as a cacheable message — stable across every turn of a session. */
export function cacheableSystem(text: string): SystemModelMessage {
  return { role: "system", content: text, providerOptions: EPHEMERAL };
}

/** School context block as a cacheable user message — large, and reused per turn. */
export function cacheableContext(text: string): ModelMessage {
  return { role: "user", content: text, providerOptions: EPHEMERAL };
}

// --- Cost instrumentation ---------------------------------------------------
// ADR-0015 is decided on effective cost per conversation, not list price per
// token. Nothing recorded that before this step, which is why the provider
// comparison could not be run at all.

export interface AiCostLog {
  job: AiJob;
  provider: ProviderId;
  model: string;
  endpointRegion: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  latencyMs: number;
  sessionId?: string;
}

interface UsageLike {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
}

export function logAiCall(entry: AiCostLog): void {
  // One line, structured, no prompt or completion text — parent messages are PII.
  console.log("[ai-cost]", JSON.stringify(entry));
}

export function costLogFrom({
  job,
  usage,
  providerMetadata,
  latencyMs,
  sessionId,
}: {
  job: RoutedJob;
  usage: UsageLike | undefined;
  providerMetadata?: Record<string, unknown>;
  latencyMs: number;
  sessionId?: string;
}): AiCostLog {
  const route = routeFor(job);
  const anthropicMeta = providerMetadata?.anthropic as
    | { cacheCreationInputTokens?: number; cacheReadInputTokens?: number }
    | undefined;

  return {
    job,
    provider: route.provider,
    model: route.model,
    endpointRegion:
      route.provider === "openai-compatible"
        ? compatRegion ?? route.endpointRegion
        : route.endpointRegion,
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cacheReadTokens: usage?.cachedInputTokens ?? anthropicMeta?.cacheReadInputTokens ?? 0,
    cacheWriteTokens: anthropicMeta?.cacheCreationInputTokens ?? 0,
    latencyMs,
    sessionId,
  };
}

/**
 * generateText for a job, timed and logged. Call sites that stream should use
 * modelFor() + logAiCall(costLogFrom(...)) in onFinish — the log is not optional.
 */
export async function generateForJob({
  job,
  system,
  messages,
  sessionId,
  ...options
}: {
  job: RoutedJob;
  system?: string | SystemModelMessage;
  messages: ModelMessage[];
  sessionId?: string;
} & Omit<Parameters<typeof generateText>[0], "model" | "messages" | "prompt" | "system">) {
  const startedAt = Date.now();
  const result = await generateText({
    model: modelFor(job),
    system,
    messages,
    ...options,
  });

  logAiCall(
    costLogFrom({
      job,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
      latencyMs: Date.now() - startedAt,
      sessionId,
    })
  );

  return result;
}
