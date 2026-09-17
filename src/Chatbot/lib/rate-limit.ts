import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { IS_PRODUCTION, UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from "@/lib/env";

// A public endpoint that bills an LLM on every request has no ceiling without this.
// Three independent controls, because each catches what the others cannot:
//   ipLimiter      — burst abuse from one source
//   sessionLimiter — sustained drain that rotates IPs but reuses a session
//   turn cap       — one well-paced session that simply never stops

const IP_WINDOW = { limit: 20, window: "60 s" } as const;
const SESSION_WINDOW = { limit: 30, window: "24 h" } as const;

// The BANT flow converges in six to eight turns; twenty is already anomalous.
export const MAX_TURNS_PER_SESSION = 25;

// Turn counters expire so an abandoned session does not hold a key forever.
const TURN_COUNTER_TTL_SECONDS = 60 * 60 * 24;

const configured = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

const redis = configured
  ? new Redis({ url: UPSTASH_REDIS_REST_URL!, token: UPSTASH_REDIS_REST_TOKEN! })
  : null;

const ipLimiter = redis
  ? new Ratelimit({
      redis,
      prefix: "lw:rl:ip",
      limiter: Ratelimit.slidingWindow(IP_WINDOW.limit, IP_WINDOW.window),
      analytics: false,
    })
  : null;

const sessionLimiter = redis
  ? new Ratelimit({
      redis,
      prefix: "lw:rl:session",
      limiter: Ratelimit.slidingWindow(SESSION_WINDOW.limit, SESSION_WINDOW.window),
      analytics: false,
    })
  : null;

export type LimitResult =
  | { ok: true; turnCapReached: false }
  // The parent has talked past the cap. Not an error: the route answers 200 with a
  // conversational close. A hostile client gets the 429 above; a real parent gets an ending.
  | { ok: true; turnCapReached: true }
  | { ok: false; reason: "missing_session"; status: 400 }
  | { ok: false; reason: "not_configured"; status: 503 }
  | { ok: false; reason: "rate_limited"; status: 429; limiter: "ip" | "session"; retryAfter: number };

export interface LimitInput {
  ip: string;
  sessionId?: string | null;
  /** Only conversational routes advance the turn counter. */
  countsAsTurn?: boolean;
}

/**
 * Read the client IP. Vercel sets x-forwarded-for; the constant fallback is
 * development-only, where every request shares one bucket by design.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return IS_PRODUCTION ? "unknown" : "dev-local";
}

const retryAfterSeconds = (reset: number) =>
  Math.max(1, Math.ceil((reset - Date.now()) / 1000));

export async function checkLimits({
  ip,
  sessionId,
  countsAsTurn = false,
}: LimitInput): Promise<LimitResult> {
  // Rejected explicitly rather than waved through: without a session id the
  // session limiter and the turn cap are both unenforceable.
  if (countsAsTurn && !sessionId) {
    return { ok: false, reason: "missing_session", status: 400 };
  }

  if (!redis || !ipLimiter || !sessionLimiter) return unavailable();

  try {
    return await enforce({ redis, ipLimiter, sessionLimiter, ip, sessionId, countsAsTurn });
  } catch (error) {
    // Upstash unreachable, or the credential is wrong. Same policy as an absent
    // token — never a 500, and never an unmetered request in production.
    console.error("[rate-limit] limiter unavailable:", error);
    return unavailable();
  }
}

/** A missing or broken limiter must never silently remove the ceiling on a deployed app. */
function unavailable(): LimitResult {
  return IS_PRODUCTION
    ? { ok: false, reason: "not_configured", status: 503 }
    : { ok: true, turnCapReached: false };
}

async function enforce({
  redis,
  ipLimiter,
  sessionLimiter,
  ip,
  sessionId,
  countsAsTurn,
}: {
  redis: Redis;
  ipLimiter: Ratelimit;
  sessionLimiter: Ratelimit;
  ip: string;
  sessionId?: string | null;
  countsAsTurn: boolean;
}): Promise<LimitResult> {
  const ipResult = await ipLimiter.limit(ip);
  if (!ipResult.success) {
    return {
      ok: false,
      reason: "rate_limited",
      status: 429,
      limiter: "ip",
      retryAfter: retryAfterSeconds(ipResult.reset),
    };
  }

  if (sessionId) {
    const sessionResult = await sessionLimiter.limit(sessionId);
    if (!sessionResult.success) {
      return {
        ok: false,
        reason: "rate_limited",
        status: 429,
        limiter: "session",
        retryAfter: retryAfterSeconds(sessionResult.reset),
      };
    }
  }

  if (countsAsTurn && sessionId) {
    const key = `lw:turns:${sessionId}`;
    const turns = await redis.incr(key);
    if (turns === 1) await redis.expire(key, TURN_COUNTER_TTL_SECONDS);
    if (turns > MAX_TURNS_PER_SESSION) {
      return { ok: true, turnCapReached: true };
    }
  }

  return { ok: true, turnCapReached: false };
}

/** 429 / 400 / 503 response with the headers a well-behaved client needs. */
export function limitResponse(result: Extract<LimitResult, { ok: false }>): Response {
  const headers: Record<string, string> = {};
  if (result.reason === "rate_limited") headers["Retry-After"] = String(result.retryAfter);

  const message =
    result.reason === "rate_limited"
      ? "Too many requests. Please wait a moment and try again."
      : result.reason === "missing_session"
        ? "sessionId is required"
        : "Rate limiting is not configured";

  // Never echo the request body here — parent messages are PII.
  return Response.json({ error: message }, { status: result.status, headers });
}
