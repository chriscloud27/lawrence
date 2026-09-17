"use client";

import { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import { getChatbotConfig } from "@/lib/chatbot-config";
import {
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
} from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchLatestLeadRecap, type LeadRecap } from "@/lib/lead-history";
import { composeWelcomeBackMessage } from "@/lib/greeting";
import {
  getOrCreateSessionId,
  loadHistory,
  saveHistory,
  type ChatMessageData,
} from "@/lib/session";

// Google sign-in (ADR-0008) is optional — only offered when Supabase auth env
// vars are configured, so the feature degrades cleanly in dev/local setups.
const authEnabled = Boolean(
  NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

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
  const [sessionId] = useState<string>(() =>
    typeof window === "undefined" ? "" : getOrCreateSessionId(),
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [recap, setRecap] = useState<LeadRecap | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!authEnabled) return;
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUserId(data.session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
      },
    );

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

  useEffect(() => {
    if (!authEnabled || !userId || recap) return;
    // Only fetch and show recap if the local conversation is genuinely fresh
    // (not mid-conversation). A fresh state is exactly [INITIAL_MESSAGE].
    if (!(messages.length === 1 && messages[0].id === "initial")) return;

    fetchLatestLeadRecap().then((r) => {
      if (!r) return; // No prior lead found, keep the generic INITIAL_MESSAGE
      setRecap(r);
      // Replace the initial message with the personalized welcome-back greeting
      const welcomeMsg: ChatMessageData = {
        id: "welcome-back",
        role: "assistant",
        content: composeWelcomeBackMessage(r),
      };
      setMessages([welcomeMsg]);
      saveHistory([welcomeMsg]);
    });
  }, [userId]);

  const signInWithGoogle = () => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  /**
   * Post the conversation to /api/chat and append tokens as they arrive.
   *
   * The response body is plain text — not JSON, not a UI message stream. That
   * is deliberate (see the route): there is no field in this response for a
   * score, a tier, or a BANT breakdown to leak into, because the parent must
   * never see any of it. The scoring runs server-side after the stream closes.
   */
  const streamReply = async (history: ChatMessageData[]) => {
    setIsLoading(true);

    // The assistant bubble is created empty and filled in place, so the first
    // token paints immediately instead of after the whole reply.
    const replyId = crypto.randomUUID();
    let streamed = "";
    let opened = false;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok || !res.body)
        throw new Error(`Request failed (${res.status})`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        streamed += value;

        if (!opened) {
          // First token: the placeholder becomes a real bubble and the
          // "Thinking…" indicator goes away.
          opened = true;
          setIsLoading(false);
          setMessages((prev) => [
            ...prev,
            { id: replyId, role: "assistant", content: streamed },
          ]);
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId ? { ...m, content: streamed } : m,
            ),
          );
        }
      }

      if (!opened) throw new Error("Empty response");

      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === replyId ? { ...m, content: streamed } : m,
        );
        saveHistory(next);
        return next;
      });
    } catch {
      setMessages((prev) => {
        const withoutPartial = prev.filter((m) => m.id !== replyId);
        const next: ChatMessageData[] = [
          ...withoutPartial,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "Sorry, something went wrong reaching the assistant. Please try again.",
          },
        ];
        saveHistory(next);
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (isLoading || !content.trim() || !sessionId) return;

    const withUserTurn: ChatMessageData[] = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", content },
    ];
    setMessages(withUserTurn);
    saveHistory(withUserTurn);

    await streamReply(withUserTurn);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    sendMessage(content);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-lw-accent text-lw-text-on-accent shadow-lw-lg hover:bg-lw-accent-hover transition-all hover:scale-105 flex items-center justify-center"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[560px] bg-lw-bg rounded-lw-xl shadow-lw-lg border border-lw-border flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-lw-accent text-lw-text-on-accent flex-shrink-0 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{config.agentName}</p>
              <p className="text-xs text-white/70">Ask me anything</p>
            </div>
            {authEnabled && !userId && (
              <button
                onClick={signInWithGoogle}
                className="text-xs bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 whitespace-nowrap"
              >
                Sign in with Google
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-lw-bg-card rounded-lw-lg rounded-tl-[4px] px-4 py-3 text-sm text-lw-text-muted italic">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 p-3 border-t border-lw-border"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Type a message…"
              className="flex-1 border border-lw-border rounded-full px-4 py-2 text-sm outline-none focus:border-lw-accent focus:shadow-lw-focus"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-9 h-9 rounded-full bg-lw-accent text-lw-text-on-accent flex items-center justify-center disabled:opacity-50"
              aria-label="Send"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
