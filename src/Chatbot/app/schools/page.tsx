import { searchSchools } from "@/lib/schools";
import SchoolFilterBar from "@/components/schools/SchoolFilterBar";
import SchoolCard from "@/components/schools/SchoolCard";
import MapPlaceholder from "@/components/schools/MapPlaceholder";

interface SchoolsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SchoolsPage({ searchParams }: SchoolsPageProps) {
  const params = await searchParams;

  const results = await searchSchools({
    name: params.name,
    city: params.city,
    curriculum: params.curriculum,
    ageMin: params.age_min ? parseInt(params.age_min) : undefined,
    ageMax: params.age_max ? parseInt(params.age_max) : undefined,
    feesMaxUsd: params.fees_max_usd ? parseInt(params.fees_max_usd) : undefined,
    boarding: params.boarding === "true",
    limit: 20,
  });

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
