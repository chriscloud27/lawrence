// Client-side only. localStorage holds the session id and the transcript so a
// page reload does not lose the conversation.
//
// What it deliberately no longer holds, after ADR-0018: the BANT score.
//
// The score used to live here because there was no backing database — the n8n
// webhook returned `{score, breakdown, tier}` and the widget stored it and
// posted it back as `previousBreakdown` on the next turn. That made the browser
// an authority on its own qualification, which is both a trust problem and a
// design mistake: a value the parent must never see should never have been in
// their localStorage. Scoring state now lives in `leads.score_breakdown` and
// accumulates server-side in the Inngest function.
//
// The transcript stays here purely so the bubbles survive a refresh. The
// authoritative copy is the `messages` table.

const STORAGE_KEY = "bant-chat-state";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface StoredState {
  sessionId: string;
  messages: ChatMessageData[];
}

function readStore(): StoredState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (!parsed?.sessionId) return null;
    return { sessionId: parsed.sessionId, messages: parsed.messages ?? [] };
  } catch {
    return null;
  }
}

function writeStore(state: StoredState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getOrCreateSessionId(): string {
  const existing = readStore();
  if (existing?.sessionId) return existing.sessionId;

  const sessionId = crypto.randomUUID();
  writeStore({ sessionId, messages: [] });
  return sessionId;
}

export function loadHistory(): ChatMessageData[] {
  return readStore()?.messages ?? [];
}

export function saveHistory(messages: ChatMessageData[]) {
  const current = readStore();
  writeStore({
    sessionId: current?.sessionId ?? getOrCreateSessionId(),
    messages,
  });
}
