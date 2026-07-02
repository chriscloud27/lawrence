// Chatbot-owned tables. The chatbot writes and reads these directly.
// Safe to evolve within the chatbot; keep in sync with
// supabase/migrations/20260702_create_chatbot_leads_messages.sql
import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  status: text('status', { enum: ['new', 'contacted', 'booked', 'nurture', 'closed'] }).notNull().default('new'),
  classification: text('classification', { enum: ['hot', 'warm', 'cold'] }),
  score: integer('score').notNull().default(0),
  scoreBreakdown: jsonb('score_breakdown'),
  capturedName: text('captured_name'),
  capturedEmail: text('captured_email'),
  location: text('location'),
  timeline: text('timeline'),
  forcingFunction: text('forcing_function'),
  childAge: integer('child_age'),
  currentSchool: text('current_school'),
  curriculum: text('curriculum'),
  budgetRangeUsd: text('budget_range_usd'),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull().references(() => leads.id),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Message = typeof messages.$inferSelect;
