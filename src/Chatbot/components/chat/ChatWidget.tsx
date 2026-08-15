'use client';

import { useState, useRef, useEffect } from 'react';
import ChatMessage, { type ChatMessageData } from './ChatMessage';
import ChatInput from './ChatInput';
import SuggestionChips from './SuggestionChips';
import type { School } from '@/db/schema';
import { nanoid } from 'nanoid';

const INITIAL_MESSAGE: ChatMessageData = {
  id: 'initial',
  role: 'assistant',
  content: "Hi, I'm Sarah — an admissions agent with ITS Education Asia. I help families find the right international school and guide you through the whole admissions process. To get started: where will your child be going to school?",
};

const Q2_CHIPS = ['Within 6 months', '6–18 months', '18 months or more', 'Not sure yet'];
const Q4_CHIPS = ['British', 'IB', 'American', 'Boarding', 'Open to suggestions'];

type TurnContext = 'initial' | 'q2' | 'q4' | 'free';

function detectChipContext(messages: ChatMessageData[]): TurnContext {
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const lastAssistant = assistantMessages[assistantMessages.length - 1]?.content?.toLowerCase() || '';

  if (lastAssistant.includes('when would you ideally') || lastAssistant.includes('when they need to start')) {
    return 'q2';
  }
  if (lastAssistant.includes('type of school') || lastAssistant.includes('british') || lastAssistant.includes('open to suggestions')) {
    return 'q4';
  }
  return 'free';
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageData[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const turnCountRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (content: string) => {
    if (isLoading) return;

    const userMessage: ChatMessageData = { id: nanoid(), role: 'user', content };
    const assistantId = nanoid();
    const streamingMessage: ChatMessageData = { id: assistantId, role: 'assistant', content: '', isStreaming: true };

    setMessages(prev => [...prev, userMessage, streamingMessage]);
    setIsLoading(true);
    turnCountRef.current += 1;

    const conversationHistory = messages
      .filter(m => m.id !== 'initial' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    conversationHistory.push({ role: 'user', content });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory, leadId }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accText = '';
      let pendingSchools: School[] | undefined;
      let pendingCalendly: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          try {
            const event = JSON.parse(raw);

            if (event.type === 'text') {
              accText += event.delta;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: accText } : m
              ));
            } else if (event.type === 'schools') {
              pendingSchools = event.schools;
            } else if (event.type === 'calendar') {
              pendingCalendly = event.calendlyUrl;
            } else if (event.type === 'done') {
              if (event.leadId) setLeadId(event.leadId);
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: accText, isStreaming: false, schools: pendingSchools, calendlyUrl: pendingCalendly }
                  : m
              ));
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Sorry, something went wrong. Please try again.', isStreaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendlyBooked = () => {
    setMessages(prev => [...prev, {
      id: nanoid(),
      role: 'assistant',
      content: "You're all set! I've received your booking confirmation. Someone will be in touch shortly to confirm the details. Looking forward to speaking with you!",
    }]);
  };

  const chipContext = detectChipContext(messages);
  const showChips = !isLoading && (chipContext === 'q2' || chipContext === 'q4');
  const activeChips = chipContext === 'q2' ? Q2_CHIPS : Q4_CHIPS;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#712B13] text-white shadow-lg hover:bg-[#993C1D] transition-all hover:scale-105 flex items-center justify-center"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[600px] bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-[#712B13] text-white flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-sm">✦</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Sarah</p>
              <p className="text-xs text-white/70">Admissions Agent · ITS Education Asia</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
            {messages.map(msg => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onCalendlyBooked={handleCalendlyBooked}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start mb-3">
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips */}
          {showChips && (
            <SuggestionChips
              chips={activeChips}
              onSelect={sendMessage}
              disabled={isLoading}
            />
          )}

          {/* Input */}
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </div>
      )}
    </>
  );
}
