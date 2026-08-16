'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Building2, Tag, Users, GraduationCap, SlidersHorizontal, Search } from 'lucide-react';

const FEES_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'Up to $10,000/yr', value: '10000' },
  { label: 'Up to $20,000/yr', value: '20000' },
  { label: 'Up to $30,000/yr', value: '30000' },
];

const AGE_OPTIONS = [
  { label: 'Any age', value: '' },
  { label: '3 to 5 years', value: '3-5' },
  { label: '6 to 11 years', value: '6-11' },
  { label: '12 to 18 years', value: '12-18' },
];

const CURRICULUM_OPTIONS = [
  { label: 'Any course', value: '' },
  { label: 'British Curriculum', value: 'British' },
  { label: 'IB', value: 'IB' },
  { label: 'Cambridge IGCSE', value: 'Cambridge IGCSE' },
  { label: 'American Curriculum', value: 'American' },
];

export default function SchoolFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleAgeChange(value: string) {
    if (!value) {
      setParam('age_min', '');
      setParam('age_max', '');
      return;
    }
    const [min, max] = value.split('-');
    const params = new URLSearchParams(searchParams.toString());
    params.set('age_min', min);
    params.set('age_max', max);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
      <FilterField icon={Building2} label="City">
        <input
          type="text"
          placeholder="All cities"
          defaultValue={searchParams.get('city') ?? ''}
          onBlur={(e) => setParam('city', e.target.value)}
          className="bg-transparent text-sm font-medium text-gray-900 outline-none w-24 placeholder:text-gray-900"
        />
      </FilterField>

      <FilterField icon={Tag} label="Fees">
        <select
          defaultValue={searchParams.get('fees_max_usd') ?? ''}
          onChange={(e) => setParam('fees_max_usd', e.target.value)}
          className="bg-transparent text-sm font-medium text-gray-900 outline-none"
        >
          {FEES_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FilterField>

      <FilterField icon={Users} label="Age of child">
        <select
          defaultValue={
            searchParams.get('age_min') && searchParams.get('age_max')
              ? `${searchParams.get('age_min')}-${searchParams.get('age_max')}`
              : ''
          }
          onChange={(e) => handleAgeChange(e.target.value)}
          className="bg-transparent text-sm font-medium text-gray-900 outline-none"
        >
          {AGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FilterField>

      <FilterField icon={GraduationCap} label="Curriculum">
        <select
          defaultValue={searchParams.get('curriculum') ?? ''}
          onChange={(e) => setParam('curriculum', e.target.value)}
          className="bg-transparent text-sm font-medium text-gray-900 outline-none"
        >
          {CURRICULUM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FilterField>

      <button
        type="button"
        disabled
        className="flex items-center gap-2 text-sm font-medium text-gray-400 px-3 py-2 rounded-lg border border-gray-200 cursor-not-allowed"
        title="Coming soon"
      >
        <SlidersHorizontal className="w-4 h-4" />
        More filters
      </button>

      <div className="flex items-center gap-2 ml-auto bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-w-[220px]">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name"
          defaultValue={searchParams.get('name') ?? ''}
          onBlur={(e) => setParam('name', e.target.value)}
          className="bg-transparent text-sm outline-none w-full"
        />
      </div>
    </div>
  );
}

function FilterField({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Building2;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
      <Icon className="w-4 h-4 text-gray-400 shrink-0" />
      <div className="flex flex-col leading-none">
        <span className="text-[10px] uppercase tracking-wide text-gray-400">{label}</span>
        {children}
      </div>
    </div>
  );
}
