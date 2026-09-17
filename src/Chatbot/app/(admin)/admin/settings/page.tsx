// Assistant settings — the Admin surface over `agent_config` (ADR-0018).
//
// Server Component: the rows come through RLS on the cookie-bound client, so
// what a counsellor can see and change is decided by their agency membership
// and their role, not by this page.

import {
  getActiveVersion,
  listAgentConfigVersions,
} from "@/lib/admin/agent-config";
import { AgentConfigForm } from "@/components/admin/AgentConfigForm";

export const metadata = { title: "Assistant settings" };

// Never cache: the point of the table is that an edit changes the next turn.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [active, history] = await Promise.all([
    getActiveVersion(),
    listAgentConfigVersions(),
  ]);

  if (!active) {
    return (
      <div className="p-lw-xl">
        <h1 className="mb-lw-md text-xl font-bold text-lw-text">
          Assistant settings
        </h1>
        <p className="text-sm text-lw-text-secondary">
          No configuration exists for your agency yet. The migration seeds
          version 1 — if you are seeing this, it has not been applied to this
          project.
        </p>
      </div>
    );
  }

  return (
    <div className="p-lw-xl">
      <h1 className="mb-lw-sm text-xl font-bold text-lw-text">
        Assistant settings
      </h1>
      <p className="mb-lw-lg text-sm text-lw-text-secondary">
        What the assistant says to parents, and when a conversation reaches you.
      </p>
      <AgentConfigForm active={active} history={history} />
    </div>
  );
}
