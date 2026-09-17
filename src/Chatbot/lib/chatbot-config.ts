// Per-customer chatbot configuration — the client-side, purely presentational
// part of it.
//
// What used to live here and no longer does: `prequalQuestions`, the three
// canned multiple-choice questions the widget asked before the AI took over.
// They were removed with ADR-0018, for a reason that is in the project's own
// architectural principles: qualification happens by listening, not by
// interrogation. Three forced-choice questions in front of a conversation is a
// form wearing a chat's clothes, and it also threw away the thing the scorer is
// best at — reading what a parent volunteers in their own words.
//
// The parts a counsellor can actually change — the system prompt, the BANT
// thresholds, the routing copy — are in `agent_config` in the database, not
// here, so changing them needs no deploy. This file holds only what the browser
// renders before the first byte comes back from the server.

export interface ChatbotConfig {
  customerId: string;
  agentName: string;
  welcomeMessage: string;
}

export const defaultChatbotConfig: ChatbotConfig = {
  customerId: "default",
  agentName: "Education Assistant",
  // Open invitation, not an announcement of an interview. The previous copy
  // ("I'd like to ask a few quick questions") set exactly the expectation the
  // persona spends the whole conversation trying not to meet.
  welcomeMessage:
    "Hello — I help families find the right school. Tell me a little about what you're " +
    "working through and I'll do my best to point you somewhere useful.",
};

// Placeholder for future per-customer lookup (e.g. by domain or tenant id).
// Returns the default config until multi-tenant loading is implemented.
export function getChatbotConfig(): ChatbotConfig {
  return defaultChatbotConfig;
}
