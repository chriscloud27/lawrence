// Inngest's entry point into this app. It discovers the functions below by
// fetching this route — `npx inngest-cli dev` finds it automatically in
// development; in production it is registered once per deploy.

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { scoreAndPersist } from "@/inngest/functions/score-and-persist";

// The functions read prompts from disk and use the Supabase service client.
export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scoreAndPersist],
});
