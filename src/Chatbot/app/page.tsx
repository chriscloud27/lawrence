import ChatWidget from "@/components/chat/ChatWidget";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">BANT Pre-Qualification Chat</h1>
        <p className="mt-2 text-gray-500">Open the chat bubble in the bottom-right corner to try it out.</p>
      </div>
      <ChatWidget />
    </main>
  );
}
