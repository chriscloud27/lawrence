import { Heart, Tag, Users, GraduationCap, ChevronRight } from 'lucide-react';
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
    ? `$${school.feesMinUsd.toLocaleString()} - ${school.feesMaxUsd.toLocaleString()}`
    : school.feesMinUsd
    ? `From $${school.feesMinUsd.toLocaleString()}`
    : 'Fees on request';

  const ageRange = school.ageFrom && school.ageTo
    ? `Ages ${school.ageFrom} to ${school.ageTo} years`
    : '';

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="relative h-44">
        {school.heroImageUrl ? (
          <img
            src={school.heroImageUrl}
            alt={school.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <span className="text-3xl">🏫</span>
          </div>
        )}
        <button
          type="button"
          aria-label="Add to shortlist"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow"
        >
          <Heart className="w-4 h-4 text-gray-700" />
        </button>
        <button
          type="button"
          aria-label="Next image"
          className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow"
        >
          <ChevronRight className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-base text-gray-900 leading-snug">{school.name}</h3>
        <p className="text-xs text-gray-500">{school.city}, {school.country}</p>

        <div className="flex flex-col gap-1.5 mt-1 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{feeRange}</span>
          </div>
          {ageRange && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{ageRange}</span>
            </div>
          )}
          {curricula.length > 0 && (
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="line-clamp-1">{curricula.join(', ')}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-auto pt-3">
          <a
            href={school.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-sm font-medium text-blue-700 border border-blue-700 rounded-lg py-2 hover:bg-blue-50"
          >
            View Profile
          </a>
          <button
            type="button"
            className="flex-1 text-center text-sm font-medium text-gray-700 border border-gray-300 rounded-lg py-2 hover:bg-gray-50"
          >
            Compare +
          </button>
        </div>
      </div>
    </div>
  );
}
