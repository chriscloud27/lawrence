import type { ChatMessageData } from "@/lib/session";

export default function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lw-lg px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-lw-accent text-lw-text-on-accent rounded-tr-[4px]"
            : "bg-lw-bg text-lw-text rounded-tl-[4px] border border-lw-border-subtle shadow-lw-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
