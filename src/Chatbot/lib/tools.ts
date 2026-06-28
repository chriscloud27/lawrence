import type Anthropic from '@anthropic-ai/sdk';

export const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_schools',
    description: 'Query the school directory. Use when the parent enters Phase 2 or asks about schools.',
    input_schema: {
      type: 'object',
      properties: {
        country: { type: 'string' },
        city: { type: 'string' },
        curriculum: { type: 'string', enum: ['IB', 'British', 'American', 'Australian', 'Any'] },
        age_min: { type: 'integer' },
        age_max: { type: 'integer' },
        fees_max_usd: { type: 'integer' },
        boarding: { type: 'boolean' },
        limit: { type: 'integer', default: 4 },
      },
    },
  },
  {
    name: 'offer_calendar',
    description: "Surface the agent's Calendly link inline in the chat. Use only when classification is Hot and at least turn 3 has passed.",
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Brief reason this lead qualifies for the call' },
      },
      required: ['reason'],
    },
  },
];
