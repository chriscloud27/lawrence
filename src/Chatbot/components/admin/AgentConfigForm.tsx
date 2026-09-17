"use client";

// The form ADR-0006 actually wanted.
//
// A counsellor edits the prompt the product speaks with and the thresholds that
// decide who gets a call, with no developer and no deploy — the property n8n
// offered — plus three it never had: every previous version is still here, each
// one says who wrote it and when, and reverting is one button.
//
// Styling is lw-* tokens only (.claude/rules/design.md). The threshold inputs
// use font-mono because they are score values.

import { useActionState } from "react";
import {
  saveAgentConfig,
  revertAgentConfig,
  type ActionResult,
} from "@/app/(admin)/admin/settings/actions";
import type { AgentConfigVersion } from "@/lib/admin/agent-config";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  FIELD_LABEL,
  INPUT_BASE,
  SECTION_LABEL,
  TEXTAREA,
} from "@/components/admin/ui";

function Result({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return state.ok ? (
    <p className="text-[13px] text-lw-success">
      Saved as version {state.version}. The next conversation uses it.
    </p>
  ) : (
    <p className="text-[13px] text-lw-error">{state.error}</p>
  );
}

export function AgentConfigForm({
  active,
  history,
}: {
  active: AgentConfigVersion;
  history: AgentConfigVersion[];
}) {
  const [saveState, save, saving] = useActionState<
    ActionResult | null,
    FormData
  >(saveAgentConfig, null);
  const [revertState, revert, reverting] = useActionState<
    ActionResult | null,
    FormData
  >(revertAgentConfig, null);

  return (
    <div className="max-w-[760px]">
      <form action={save}>
        <h2 className={SECTION_LABEL}>How the assistant speaks</h2>
        <p className="mb-lw-md text-sm text-lw-text-secondary">
          This is the whole instruction the assistant follows on every turn.
          Changes take effect on the next message a parent sends — there is
          nothing to deploy.
        </p>

        <label className={FIELD_LABEL} htmlFor="systemPrompt">
          System prompt
        </label>
        <textarea
          id="systemPrompt"
          name="systemPrompt"
          rows={22}
          defaultValue={active.systemPrompt}
          className={`${TEXTAREA} font-mono text-[13px] leading-relaxed`}
        />

        <h2 className={SECTION_LABEL}>When a conversation changes course</h2>
        <p className="mb-lw-md text-sm text-lw-text-secondary">
          Scores run from 0 to 100. A parent never sees any of these numbers,
          and the assistant is never told them.
        </p>

        <div className="flex flex-wrap gap-lw-lg">
          {(
            [
              [
                "low",
                "Keep qualifying at",
                active.thresholds.low,
                "Below this, the assistant still replies warmly — it just stops spending a scoring call on the conversation. Cannot exceed 67.",
              ],
              [
                "medium",
                "Offer a booking at",
                active.thresholds.medium,
                "The band where a conversation with an advisor is worth suggesting.",
              ],
              [
                "hot",
                "Tell admissions above",
                active.thresholds.hot,
                "Crossing this emails the admissions inbox once, and only once.",
              ],
            ] as const
          ).map(([name, label, value, help]) => (
            <div key={name} className="w-[200px]">
              <label className={FIELD_LABEL} htmlFor={name}>
                {label}
              </label>
              <input
                id={name}
                name={name}
                type="number"
                min={0}
                max={100}
                defaultValue={value}
                className={`${INPUT_BASE} w-[100px] font-mono`}
              />
              <p className="mt-lw-sm text-[13px] text-lw-text-muted">{help}</p>
            </div>
          ))}
        </div>

        <h2 className={SECTION_LABEL}>Fixed messages</h2>
        <p className="mb-lw-md text-sm text-lw-text-secondary">
          The few things a parent reads that the assistant does not write.
        </p>

        {(
          [
            [
              "turnCapClose",
              "Closing a very long conversation",
              active.routingCopy.turn_cap_close,
            ],
            [
              "resources",
              "When someone is just exploring",
              active.routingCopy.resources,
            ],
            ["booking", "When suggesting a call", active.routingCopy.booking],
          ] as const
        ).map(([name, label, value]) => (
          <div key={name} className="mb-lw-lg">
            <label className={FIELD_LABEL} htmlFor={name}>
              {label}
            </label>
            <textarea
              id={name}
              name={name}
              rows={3}
              defaultValue={value ?? ""}
              className={TEXTAREA}
            />
          </div>
        ))}

        <div className="mt-lw-lg flex items-center gap-lw-md">
          <button type="submit" className={BTN_PRIMARY} disabled={saving}>
            {saving ? "Saving…" : "Save as a new version"}
          </button>
          <Result state={saveState} />
        </div>
      </form>

      <h2 className={SECTION_LABEL}>History</h2>
      <p className="mb-lw-md text-sm text-lw-text-secondary">
        Nothing is overwritten. Every save keeps the version it replaced.
      </p>
      <Result state={revertState} />

      <ul className="mt-lw-md">
        {history.map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between gap-lw-md border-b border-lw-border py-lw-md"
          >
            <div>
              <p className="text-sm font-medium text-lw-text">
                <span className="font-mono">v{v.version}</span>
                {v.isActive ? (
                  <span className="ml-lw-sm rounded-full bg-lw-accent-subtle px-[10px] py-[2px] text-[13px] font-medium text-lw-accent">
                    Live
                  </span>
                ) : null}
              </p>
              <p className="text-[13px] text-lw-text-muted">
                {new Date(v.createdAt).toLocaleString()}
                {" · thresholds "}
                <span className="font-mono">
                  {v.thresholds.low}/{v.thresholds.medium}/{v.thresholds.hot}
                </span>
              </p>
            </div>

            {v.isActive ? null : (
              <form action={revert}>
                <input type="hidden" name="id" value={v.id} />
                <button
                  type="submit"
                  className={BTN_SECONDARY}
                  disabled={reverting}
                >
                  Make this live
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
