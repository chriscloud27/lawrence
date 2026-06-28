import type { School } from '@/db/schema';

interface SchoolCardProps {
  school: School;
}

export default function SchoolCard({ school }: SchoolCardProps) {
  const curricula: string[] = Array.isArray(school.curricula)
    ? school.curricula
    : school.curricula
    ? JSON.parse(school.curricula as unknown as string)
    : [];

  const feeRange = school.feesMinUsd && school.feesMaxUsd
    ? `$${(school.feesMinUsd / 1000).toFixed(0)}k–$${(school.feesMaxUsd / 1000).toFixed(0)}k/yr`
    : school.feesMinUsd
    ? `From $${(school.feesMinUsd / 1000).toFixed(0)}k/yr`
    : 'Fees on request';

  const ageRange = school.ageFrom && school.ageTo
    ? `Ages ${school.ageFrom}–${school.ageTo}`
    : '';

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {school.heroImageUrl ? (
        <img
          src={school.heroImageUrl}
          alt={school.name}
          className="w-full h-28 object-cover"
        />
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-[#FAECE7] to-[#FAEEDA] flex items-center justify-center">
          <span className="text-2xl">🏫</span>
        </div>
      )}
      <div className="p-3">
        <h4 className="font-semibold text-sm text-gray-900 leading-tight">{school.name}</h4>
        <p className="text-xs text-gray-500 mt-0.5">{school.city}, {school.country}</p>

        <div className="flex flex-wrap gap-1 mt-2">
          {curricula.map(c => (
            <span key={c} className="px-2 py-0.5 bg-[#E1F5EE] text-[#085041] text-xs rounded-full">
              {c}
            </span>
          ))}
          {school.boarding && (
            <span className="px-2 py-0.5 bg-[#FAEEDA] text-[#633806] text-xs rounded-full">
              Boarding
            </span>
          )}
        </div>

        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">{feeRange}</span>
          {ageRange && <span className="text-xs text-gray-500">{ageRange}</span>}
        </div>

        {school.description && (
          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{school.description}</p>
        )}

        <a
          href={school.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-[#712B13] hover:underline font-medium"
        >
          Learn more →
        </a>
      </div>
    </div>
  );
}
