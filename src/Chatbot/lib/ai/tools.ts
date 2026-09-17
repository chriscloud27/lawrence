// Tools the parent-facing agent can call.
//
// These replace two n8n nodes (ADR-0018): the `search_schools`
// `toolHttpRequest`, which reached PostgREST directly holding a Supabase
// service key in workflow JSON, and the `offer_calendar` `toolCode` node.
//
// `search_schools` goes through the existing `searchSchools()` in lib/schools.ts
// rather than re-querying: that function already reads the `schools_chatbot`
// view with the ANON key — correct least privilege for a public directory — and
// already handles the jsonb curricula partial match that PostgREST cannot
// express as a query parameter.

import { tool } from "ai";
import { z } from "zod";
import { searchSchools, type School } from "@/lib/schools";
import { CALENDLY_URL } from "@/lib/env";

/**
 * Trimmed to the fields a recommendation actually needs. The full row carries
 * hero images and slugs that cost tokens on every turn and tell the model
 * nothing.
 */
function forModel(school: School) {
  return {
    name: school.name,
    city: school.city,
    country: school.country,
    curricula: school.curricula ?? [],
    age_from: school.age_from,
    age_to: school.age_to,
    fees_min_usd: school.fees_min_usd,
    fees_max_usd: school.fees_max_usd,
    boarding: school.boarding,
    description: school.description,
    website: school.website,
  };
}

export const searchSchoolsTool = tool({
  description:
    "Search the school directory. Use this whenever you are about to name a school, a fee, or an age range — never state one from memory. All filters are optional; omit what the parent has not told you.",
  inputSchema: z.object({
    city: z.string().optional().describe("City or country name, partial match"),
    curriculum: z
      .string()
      .optional()
      .describe("IB, British, American, Australian — partial match against the school's curricula"),
    ageMin: z.number().int().optional().describe("The child's age; finds schools that admit it"),
    ageMax: z.number().int().optional(),
    feesMaxUsd: z.number().int().optional().describe("Upper annual fee bound in USD"),
    boarding: z.boolean().optional(),
    limit: z.number().int().min(1).max(6).optional().describe("Default 4"),
  }),
  execute: async (filters) => {
    const schools = await searchSchools({ ...filters, limit: filters.limit ?? 4 });
    if (schools.length === 0) {
      // Said plainly rather than returned as an empty array, because an empty
      // array is exactly what a model fills in from memory. The prompt tells it
      // to say so honestly; this makes that the easiest thing to do.
      return {
        schools: [],
        note: "No schools in the directory match those criteria. Tell the parent honestly rather than suggesting a school you have not seen here.",
      };
    }
    return { schools: schools.map(forModel) };
  },
});

export const offerCalendarTool = tool({
  description:
    "Offer the parent a booking link for a conversation with a human advisor. Never before the third turn, and at most twice in one conversation.",
  inputSchema: z.object({
    reason: z
      .string()
      .describe("Why this parent's situation calls for a person — one short phrase"),
  }),
  execute: async () => {
    if (!CALENDLY_URL) {
      return {
        url: null,
        note: "No booking link is configured. Offer to pass their details to an advisor by email instead.",
      };
    }
    return { url: CALENDLY_URL };
  },
});

export const parentAgentTools = {
  search_schools: searchSchoolsTool,
  offer_calendar: offerCalendarTool,
};
