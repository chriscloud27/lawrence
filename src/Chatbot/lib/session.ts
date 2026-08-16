// Client-side only. Browser localStorage is the sole persistence layer for the
// BANT pre-qual flow right now — there is no backing database yet, so a page
// reload must not lose the conversation or the accumulated score.

const STORAGE_KEY = "bant-chat-state";

export interface BantBreakdown {
  timeline: number;
  budget: number;
  authority: number;
}

export interface BantScoreState {
  score: number;
  breakdown: BantBreakdown;
  tier: "low" | "medium" | "high";
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface PrequalState {
  // -1 = not started (show the Start button), 0..N-1 = currently showing
  // that question, N = all questions answered (free-text chat unlocked).
  stepIndex: number;
  answers: Record<string, string>;
}

const INITIAL_PREQUAL_STATE: PrequalState = { stepIndex: -1, answers: {} };

interface StoredState {
  sessionId: string;
  score: BantScoreState | null;
  messages: ChatMessageData[];
  prequal: PrequalState;
}

function readStore(): StoredState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredState;
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
  writeStore({ sessionId, score: null, messages: [], prequal: INITIAL_PREQUAL_STATE });
  return sessionId;
}

export function loadScoreState(): BantScoreState | null {
  return readStore()?.score ?? null;
}

export function saveScoreState(score: BantScoreState) {
  const current = readStore();
  writeStore({
    sessionId: current?.sessionId ?? getOrCreateSessionId(),
    score,
    messages: current?.messages ?? [],
    prequal: current?.prequal ?? INITIAL_PREQUAL_STATE,
  });
}

export function loadHistory(): ChatMessageData[] {
  return readStore()?.messages ?? [];
}

export function saveHistory(messages: ChatMessageData[]) {
  const current = readStore();
  writeStore({
    sessionId: current?.sessionId ?? getOrCreateSessionId(),
    score: current?.score ?? null,
    messages,
    prequal: current?.prequal ?? INITIAL_PREQUAL_STATE,
  });
}

export function loadPrequalState(): PrequalState {
  return readStore()?.prequal ?? INITIAL_PREQUAL_STATE;
}

export function savePrequalState(prequal: PrequalState) {
  const current = readStore();
  writeStore({
    sessionId: current?.sessionId ?? getOrCreateSessionId(),
    score: current?.score ?? null,
    messages: current?.messages ?? [],
    prequal,
  });
}
