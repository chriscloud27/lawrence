// Stage src/agents/prompts/*.txt inside this app so Next can bundle them.
//
// The prompts live outside the app by rule (.claude/rules/ai-agents.md keeps
// them as .txt; evals/prompt.js reads the same files), and Turbopack refuses a
// file-tracing glob that escapes the app root — "it has a prefix that navigates
// out of the project root". Widening the root to the whole monorepo is the
// other way out, but that pulls src/Landing into this app's watch scope.
//
// So: copy on every dev and build, into a gitignored directory. The originals
// stay the single source of truth; this directory is a build artifact and
// nothing should ever be edited here.

import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, "..", "..", "agents", "prompts");
const target = path.join(here, "..", ".prompts");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

console.log(`[sync-prompts] ${source} -> ${target}`);
