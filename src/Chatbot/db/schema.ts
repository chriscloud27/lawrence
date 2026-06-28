import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  status: text('status', { enum: ['new', 'contacted', 'booked', 'nurture', 'closed'] }).notNull().default('new'),
  classification: text('classification', { enum: ['hot', 'warm', 'cold'] }),
  score: integer('score').notNull().default(0),
  scoreBreakdown: text('score_breakdown', { mode: 'json' }),
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

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull().references(() => leads.id),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const schools = sqliteTable('schools', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  website: text('website').notNull(),
  curricula: text('curricula', { mode: 'json' }),
  ageFrom: integer('age_from'),
  ageTo: integer('age_to'),
  feesMinUsd: integer('fees_min_usd'),
  feesMaxUsd: integer('fees_max_usd'),
  boarding: integer('boarding', { mode: 'boolean' }).default(false),
  day: integer('day', { mode: 'boolean' }).default(true),
  description: text('description'),
  heroImageUrl: text('hero_image_url'),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type School = typeof schools.$inferSelect;
