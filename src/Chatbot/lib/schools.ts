import { getSupabaseServerClient } from "@/lib/supabase-server";

// Row shape of the `schools_chatbot` view (see
// supabase/migrations/20260702120000_create_schools_chatbot_view.sql).
export interface School {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  website: string;
  curricula: string[] | null;
  age_from: number | null;
  age_to: number | null;
  fees_min_usd: number | null;
  fees_max_usd: number | null;
  boarding: boolean;
  day: boolean;
  description: string | null;
  hero_image_url: string | null;
}

export interface SchoolSearchFilters {
  name?: string;
  city?: string;
  curriculum?: string;
  ageMin?: number;
  ageMax?: number;
  feesMaxUsd?: number;
  boarding?: boolean;
  limit?: number;
}

export async function searchSchools(filters: SchoolSearchFilters): Promise<School[]> {
  const supabase = getSupabaseServerClient();

  let query = supabase.from("schools_chatbot").select("*");

  if (filters.name) query = query.ilike("name", `%${filters.name}%`);
  if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters.ageMin != null) query = query.lte("age_from", filters.ageMin);
  if (filters.ageMax != null) query = query.gte("age_to", filters.ageMax);
  if (filters.feesMaxUsd != null) query = query.lte("fees_min_usd", filters.feesMaxUsd);
  if (filters.boarding) query = query.eq("boarding", true);

  query = query.limit(filters.limit ?? 20);

  const { data, error } = await query;
  if (error) throw error;

  const schools = (data ?? []) as School[];

  // curricula is a jsonb array; partial substring match (e.g. "IB" matches
  // "IB (DP)") isn't expressible via the REST filter builder, so it's applied
  // here instead of in the query.
  if (filters.curriculum) {
    const needle = filters.curriculum.toLowerCase();
    return schools.filter((s) =>
      (s.curricula ?? []).some((c) => c.toLowerCase().includes(needle))
    );
  }

  return schools;
}
