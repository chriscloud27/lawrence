import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },

  // `.prompts/` is staged from src/agents/prompts by scripts/sync-prompts.mjs
  // on every dev and build. Nothing imports those .txt files, so Next's tracer
  // cannot infer them — without this they are absent from a production build
  // and lib/prompts.ts throws on the first turn while working fine in dev.
  outputFileTracingIncludes: {
    "/api/chat": [".prompts/**"],
    "/api/inngest": [".prompts/**"],
  },
};

export default nextConfig;
