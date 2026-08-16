'use client';

interface SuggestionChipsProps {
  chips: string[];
  onSelect: (chip: string) => void;
  disabled?: boolean;
}

export default function SuggestionChips({ chips, onSelect, disabled }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {chips.map(chip => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          disabled={disabled}
          className="px-3 py-1.5 text-sm rounded-full border border-[#993C1D] text-[#712B13] bg-[#FAECE7] hover:bg-[#f5d5cb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
