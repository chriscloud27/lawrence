// Server-side only — never import this from a "use client" component.
// Per .claude/rules/chatbot.md: never access process.env directly elsewhere.

export const N8N_BANT_WEBHOOK_URL = process.env.N8N_BANT_WEBHOOK_URL;
