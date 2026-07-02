// Barrel. Split by ownership boundary:
//   schema.leads.ts   — chatbot-owned tables (leads, messages)
//   schema.schools.ts — project-owned read contract (schools_chatbot view)
export * from './schema.leads';
export * from './schema.schools';
