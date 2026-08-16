'use client';

interface LeadFilterProps {
  active: string;
  onChange: (filter: string) => void;
  counts: { all: number; hot: number; warm: number; cold: number };
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'hot', label: 'Hot', style: { color: '#712B13', bg: '#FAECE7', border: '#993C1D' } },
  { key: 'warm', label: 'Warm', style: { color: '#633806', bg: '#FAEEDA', border: '#854F0B' } },
  { key: 'cold', label: 'Cold', style: { color: '#085041', bg: '#E1F5EE', border: '#0F6E56' } },
];

export default function LeadFilter({ active, onChange, counts }: LeadFilterProps) {
  return (
    <div className="flex gap-2">
      {FILTERS.map(f => {
        const count = counts[f.key as keyof typeof counts];
        const isActive = active === f.key;

        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              isActive && !f.style
                ? 'bg-gray-900 text-white border-gray-900'
                : !isActive && !f.style
                ? 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                : ''
            }`}
            style={
              f.style
                ? isActive
                  ? { background: f.style.bg, color: f.style.color, borderColor: f.style.border }
                  : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }
                : {}
            }
          >
            {f.label}
            <span className={`ml-1.5 text-xs ${isActive && !f.style ? 'text-gray-300' : 'text-gray-400'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
