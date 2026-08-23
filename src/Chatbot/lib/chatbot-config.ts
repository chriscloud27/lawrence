// Per-customer chatbot configuration. Each deployment (school/agency) gets its
// own config object; the widget reads everything customer-facing from here
// instead of hardcoding copy or BANT question wording in components.

export interface PrequalOption {
  label: string;
  value: string;
}

export interface PrequalQuestion {
  id: "timeline" | "budget" | "authority";
  question: string;
  options: PrequalOption[];
}

export interface ChatbotConfig {
  customerId: string;
  agentName: string;
  welcomeMessage: string;
  startButtonLabel: string;
  prequalQuestions: PrequalQuestion[];
}

export const defaultChatbotConfig: ChatbotConfig = {
  customerId: "default",
  agentName: "Education Assistant",
  welcomeMessage:
    "Hello! I'm the education assistant here. To help you better, I'd like to ask a few quick questions to help you find the right international school.",
  startButtonLabel: "Start",
  prequalQuestions: [
    {
      id: "timeline",
      question: "When are you looking to start studying?",
      options: [
        { label: "Urgent / next month", value: "urgent next month" },
        { label: "Few months away", value: "few months" },
        { label: "Just exploring options", value: "exploring" },
        { label: "No specific timeline", value: "no specific timeline" },
      ],
    },
    {
      id: "budget",
      question: "What annual school fee range are you considering, and are extras like extracurriculars or transportation important to you?",
      options: [
        { label: "Premium / private / international school", value: "premium private international" },
        { label: "Considering both private and public", value: "considering private" },
        { label: "Public school or budget-conscious", value: "public school" },
      ],
    },
    {
      id: "authority",
      question: "Who would you like to bring into the conversation around deciding on a school for your child?",
      options: [
        { label: "I'm the lead decision-maker", value: "i decide" },
        { label: "Joint decision with spouse/partner", value: "joint decision with spouse" },
        { label: "Consulting with family members", value: "consulting with family" },
      ],
    },
  ],
};

// Placeholder for future per-customer lookup (e.g. by domain or tenant id).
// Returns the default config until multi-tenant loading is implemented.
export function getChatbotConfig(): ChatbotConfig {
  return defaultChatbotConfig;
}
