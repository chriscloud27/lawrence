import SchoolCard from './SchoolCard';
import CalendlyEmbed from './CalendlyEmbed';
import type { School } from '@/db/schema';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  schools?: School[];
  calendlyUrl?: string;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  onCalendlyBooked?: () => void;
}

export default function ChatMessage({ message, onCalendlyBooked }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-full bg-[#712B13] flex items-center justify-center">
              <span className="text-white text-xs">✦</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Assistant</span>
          </div>
        )}

        {message.content && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isUser
                ? 'bg-[#712B13] text-white rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
            } ${message.isStreaming ? 'after:content-["▋"] after:animate-pulse after:ml-0.5' : ''}`}
          >
            {message.content}
          </div>
        )}

        {message.calendlyUrl && (
          <CalendlyEmbed url={message.calendlyUrl} onBooked={onCalendlyBooked} />
        )}

        {message.schools && message.schools.length > 0 && (
          <div className="mt-2 grid grid-cols-1 gap-2">
            {message.schools.slice(0, 4).map(school => (
              <SchoolCard key={school.id} school={school} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
