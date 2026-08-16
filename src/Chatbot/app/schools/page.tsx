import { and, eq, gte, lte, like, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { schools } from '@/db/schema';
import SchoolFilterBar from '@/components/schools/SchoolFilterBar';
import SchoolCard from '@/components/schools/SchoolCard';
import MapPlaceholder from '@/components/schools/MapPlaceholder';

interface SchoolsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SchoolsPage({ searchParams }: SchoolsPageProps) {
  const params = await searchParams;

  const conditions = [];
  if (params.name) conditions.push(like(schools.name, `%${params.name}%`));
  if (params.city) conditions.push(like(schools.city, `%${params.city}%`));
  if (params.curriculum) {
    conditions.push(sql`${schools.curricula}::text ilike ${`%${params.curriculum}%`}`);
  }
  if (params.age_min) conditions.push(lte(schools.ageFrom, parseInt(params.age_min)));
  if (params.age_max) conditions.push(gte(schools.ageTo, parseInt(params.age_max)));
  if (params.fees_max_usd) conditions.push(lte(schools.feesMinUsd, parseInt(params.fees_max_usd)));
  if (params.boarding === 'true') conditions.push(eq(schools.boarding, true));

  const results = await db
    .select()
    .from(schools)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(20);

  return (
    <div className="min-h-screen bg-gray-50">
      <SchoolFilterBar />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-4 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
          {results.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-full">No schools match these filters yet.</p>
          ) : (
            results.map((school) => <SchoolCard key={school.id} school={school} />)
          )}
        </div>
        <MapPlaceholder />
      </div>
    </div>
  );
}
