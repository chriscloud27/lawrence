import ChatWidget from '@/components/chat/ChatWidget';
import { ThemeToggle } from '@/components/theme-toggle';

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="flex justify-end px-6 pt-4">
        <ThemeToggle />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#712B13] flex items-center justify-center mx-auto">
              <span className="text-white text-2xl font-bold">ITS</span>
            </div>
          </div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">
            ITS Education Asia
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Specialist consultants helping families find the right international school across Asia.
            Trusted by hundreds of families since 1999.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { title: '500+', subtitle: 'Schools in our network', icon: '🏫' },
            { title: '25+', subtitle: 'Years of experience', icon: '⭐' },
            { title: '12', subtitle: 'Countries across Asia', icon: '🌏' },
          ].map(stat => (
            <div key={stat.title} className="bg-card rounded-2xl p-6 text-center shadow-sm border border-border">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-[#712B13] mb-1">{stat.title}</div>
              <div className="text-sm text-muted-foreground">{stat.subtitle}</div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border text-center">
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-3">
            Talk to Sarah, our admissions agent
          </h2>
          <p className="text-muted-foreground mb-2">
            Chat with Sarah, our admissions agent, to find the right school for your child and get guidance through the admissions process.
          </p>
          <p className="text-sm text-muted-foreground/60">
            Click the button in the bottom right to get started — no obligation, just helpful advice.
          </p>
        </div>
      </div>

      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-300">
        Prototype — not for distribution
      </div>

      <ChatWidget />
    </main>
  );
}
