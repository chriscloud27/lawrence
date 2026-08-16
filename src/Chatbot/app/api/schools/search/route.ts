import { db } from '@/lib/db';
import { schools } from '@/db/schema';
import { sql, and, gte, lte, like, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const country = searchParams.get('country');
  const city = searchParams.get('city');
  const curriculum = searchParams.get('curriculum');
  const ageMin = searchParams.get('age_min');
  const ageMax = searchParams.get('age_max');
  const feesMax = searchParams.get('fees_max_usd');
  const boarding = searchParams.get('boarding');
  const limit = parseInt(searchParams.get('limit') || '20');

  const conditions = [];

  if (name) conditions.push(like(schools.name, `%${name}%`));
  if (country) conditions.push(like(schools.country, `%${country}%`));
  if (city && city !== 'All cities') conditions.push(like(schools.city, `%${city}%`));
  if (curriculum && curriculum !== 'Any' && curriculum !== 'Any course') {
    // curricula is jsonb (array); cast to text for a partial match, e.g. 'IB' → 'IB (DP)'
    conditions.push(sql`${schools.curricula}::text ilike ${`%${curriculum}%`}`);
  }
  if (ageMin) conditions.push(lte(schools.ageFrom, parseInt(ageMin)));
  if (ageMax) conditions.push(gte(schools.ageTo, parseInt(ageMax)));
  if (feesMax) conditions.push(lte(schools.feesMinUsd, parseInt(feesMax)));
  if (boarding === 'true') conditions.push(eq(schools.boarding, true));

  const results = await db
    .select()
    .from(schools)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limit);

  return Response.json({ schools: results });
}
