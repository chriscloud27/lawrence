"use client";

import { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import { getChatbotConfig } from "@/lib/chatbot-config";
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  getOrCreateSessionId,
  loadHistory,
  saveHistory,
  loadScoreState,
  saveScoreState,
  loadPrequalState,
  savePrequalState,
  type ChatMessageData,
  type BantScoreState,
  type PrequalState,
} from "@/lib/session";

// Google sign-in (ADR-0008) is optional — only offered when Supabase auth env
// vars are configured, so the feature degrades cleanly in dev/local setups.
const authEnabled = Boolean(NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY);

const config = getChatbotConfig();

const INITIAL_MESSAGE: ChatMessageData = {
  id: "initial",
  role: "assistant",
  content: config.welcomeMessage,
};

// Lazy initializers read localStorage on the client only; on the server
// (typeof window === "undefined") they fall back to the same defaults the
// client starts with before hydration, so there's no hydration mismatch —
// the chat popup itself only renders once opened, well after mount.
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageData[]>(() => {
    if (typeof window === "undefined") return [INITIAL_MESSAGE];
    const history = loadHistory();
    return history.length > 0 ? history : [INITIAL_MESSAGE];
  });
  const [scoreState, setScoreState] = useState<BantScoreState | null>(() =>
    typeof window === "undefined" ? null : loadScoreState()
  );
  const [prequal, setPrequal] = useState<PrequalState>(() =>
    typeof window === "undefined" ? { stepIndex: -1, answers: {} } : loadPrequalState()
  );
  const [sessionId] = useState<string>(() =>
    typeof window === "undefined" ? "" : getOrCreateSessionId()
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const prequalDone = prequal.stepIndex >= config.prequalQuestions.length;

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, prequal.stepIndex]);

  useEffect(() => {
    if (!authEnabled) return;
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUserId(data.session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || !sessionId) return;
    // Best-effort: links this device's session to the signed-in user via n8n
    // (ADR-0008). A no-op if no `leads` row exists yet for this session_id.
    fetch("/api/lead/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, userId }),
    }).catch(() => {});
  }, [userId, sessionId]);

  const signInWithGoogle = () => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const appendMessage = (message: ChatMessageData) => {
    setMessages(prev => {
      const next = [...prev, message];
      saveHistory(next);
      return next;
    });
  };

  const callPrequalify = async (chatInput: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/prequalify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatInput,
          sessionId,
          previousScore: scoreState?.score,
          previousBreakdown: scoreState?.breakdown,
        }),
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      const reply: string = data.reply || data.output || "Thanks! How can I help you today?";

      appendMessage({ id: crypto.randomUUID(), role: "assistant", content: reply });

      if (typeof data.score === "number" && data.breakdown && data.tier) {
        const nextScore: BantScoreState = { score: data.score, breakdown: data.breakdown, tier: data.tier };
        setScoreState(nextScore);
        saveScoreState(nextScore);
      }
    } catch {
      appendMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, something went wrong reaching the assistant. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startPrequal = () => {
    const next: PrequalState = { stepIndex: 0, answers: {} };
    setPrequal(next);
    savePrequalState(next);
    appendMessage({ id: crypto.randomUUID(), role: "assistant", content: config.prequalQuestions[0].question });
  };

  const answerPrequalQuestion = (option: { label: string; value: string }) => {
    if (isLoading) return;
    const question = config.prequalQuestions[prequal.stepIndex];
    if (!question) return;

    appendMessage({ id: crypto.randomUUID(), role: "user", content: option.label });

    const nextAnswers = { ...prequal.answers, [question.id]: option.value };
    const nextStepIndex = prequal.stepIndex + 1;
    const next: PrequalState = { stepIndex: nextStepIndex, answers: nextAnswers };
    setPrequal(next);
    savePrequalState(next);

    if (nextStepIndex < config.prequalQuestions.length) {
      const nextQuestion = config.prequalQuestions[nextStepIndex];
      appendMessage({ id: crypto.randomUUID(), role: "assistant", content: nextQuestion.question });
    } else {
      const combined = config.prequalQuestions
        .map(q => `${q.id[0].toUpperCase()}${q.id.slice(1)}: ${nextAnswers[q.id]}.`)
        .join(" ");
      callPrequalify(combined);
    }
  };

  const sendMessage = async (content: string) => {
    if (isLoading || !content.trim() || !sessionId) return;
    appendMessage({ id: crypto.randomUUID(), role: "user", content });
    await callPrequalify(content);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    sendMessage(content);
  };

  const currentQuestion = !prequalDone && prequal.stepIndex >= 0 ? config.prequalQuestions[prequal.stepIndex] : null;
  const showStartButton = !prequalDone && prequal.stepIndex === -1;

  return (
    <>
      <button
        onClick={() => setIsOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-105 flex items-center justify-center"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-blue-600 text-white flex-shrink-0 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{config.agentName}</p>
              <p className="text-xs text-white/70">Ask me anything</p>
            </div>
            {authEnabled && prequalDone && !userId && (
              <button
                onClick={signInWithGoogle}
                className="text-xs bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 whitespace-nowrap"
              >
                Sign in with Google
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {showStartButton && (
              <div className="flex justify-start mb-3">
                <button
                  onClick={startPrequal}
                  className="rounded-full bg-blue-600 text-white text-sm px-4 py-2 hover:bg-blue-700"
                >
                  {config.startButtonLabel}
                </button>
              </div>
            )}

            {currentQuestion && (
              <div className="flex flex-col items-start gap-2 mb-3">
                {currentQuestion.options.map(option => (
                  <button
                    key={option.value}
                    onClick={() => answerPrequalQuestion(option)}
                    disabled={isLoading}
                    className="rounded-2xl rounded-tl-sm border border-blue-200 bg-blue-50 text-blue-700 text-sm px-4 py-2 text-left hover:bg-blue-100 disabled:opacity-50"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-400 italic">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {prequalDone && (
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-gray-200">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Type a message…"
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-50"
                aria-label="Send"
              >
                ➤
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
