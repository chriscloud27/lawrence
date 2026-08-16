// Project-owned read contract. Backed by the `schools_chatbot` VIEW, NOT a table
// (see supabase/migrations/20260702_create_schools_chatbot_view.sql).
// Ingestion (n8n) owns the underlying normalized schools/school_fees tables.
// The chatbot only ever SELECTs from this — never insert/update/delete.
import { pgTable, text, integer, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';

export const schools = pgTable('schools_chatbot', {
  id: uuid('id').primaryKey(),          // UUID from the target schema (was serial int in the prototype)
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  website: text('website').notNull(),
  curricula: jsonb('curricula'),
  ageFrom: integer('age_from'),
  ageTo: integer('age_to'),
  feesMinUsd: integer('fees_min_usd'),
  feesMaxUsd: integer('fees_max_usd'),
  boarding: boolean('boarding').default(false),
  day: boolean('day').default(true),
  description: text('description'),
  heroImageUrl: text('hero_image_url'),
});

export type School = typeof schools.$inferSelect;
