// Reads the system prompts from src/agents/prompts/.
//
// They live there as .txt rather than as TypeScript string literals for two
// reasons: .claude/rules/ai-agents.md requires it, and evals/prompt.js reads
// the same files — an eval that grades a prompt the app does not use is worth
// nothing (.claude/rules/ai-providers.md).
//
// The files sit OUTSIDE this Next app (../agents/prompts), and Turbopack
// refuses a file-tracing glob that escapes the app root. So they are staged
// into `.prompts/` by scripts/sync-prompts.mjs, which `predev` and `prebuild`
// run automatically. Read the staged copy; never edit it — it is overwritten on
// every build.
//
// Note the asymmetry with the PARENT-facing prompt: that one is not read from
// disk at all at runtime. It lives in `agent_config.system_prompt` so a
// counsellor can edit it without a deploy (ADR-0018). The .txt file is its
// seed and the thing the evals grade, which is why the two must be kept
// identical when either changes.

import { readFileSync } from "node:fs";
import path from "node:path";

const PROMPT_DIR = path.join(process.cwd(), ".prompts");

// Prompts are immutable for the life of the process; re-reading per turn is
// syscalls for nothing.
const cache = new Map<string, string>();

export function readPrompt(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;

  try {
    const text = readFileSync(path.join(PROMPT_DIR, name), "utf8");
    cache.set(name, text);
    return text;
  } catch (error) {
    throw new Error(
      `Could not read system prompt "${name}" from ${PROMPT_DIR}. ` +
        `Run \`npm run sync-prompts\`, and check next.config.ts outputFileTracingIncludes. ` +
        `Cause: ${String(error)}`
    );
  }
}
