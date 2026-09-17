/**
 * Proves the seam's cost instrumentation end to end: two identical calls, so the
 * first writes the prompt cache and the second reads it. The gap between the two
 * [ai-cost] lines is the cost lever ADR-0015 turns on.
 *
 *   npm run ai:smoke
 *
 * Costs a fraction of a cent. Requires ANTHROPIC_API_KEY in .env.local.
 */
import { cacheableSystem, generateForJob } from "../lib/ai/provider";

// Anthropic will not cache a block below its minimum (2048 tokens on Haiku), so
// a toy prompt would report zero and prove nothing. This padding stands in for
// the real system prompt plus school context block.
const PADDING = Array.from(
  { length: 400 },
  (_, i) =>
    `Reference note ${i}: admissions timelines, entry points, and fee bands vary by school and by year group.`
).join("\n");

const SYSTEM = `You are a warm, experienced admissions advisor. Answer in one short sentence.\n\n${PADDING}`;

async function main() {
  for (const attempt of [1, 2]) {
    await generateForJob({
      job: "parent_turn",
      system: cacheableSystem(SYSTEM),
      messages: [{ role: "user", content: "Say the word ready." }],
      maxOutputTokens: 16,
      sessionId: `cost-smoke-${attempt}`,
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
