"use client";

export function ChipSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-lw-sm">
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? "" : option)}
            className={`cursor-pointer rounded-full px-lw-base py-lw-sm text-sm max-[560px]:py-[14px] ${
              selected
                ? "bg-lw-accent-subtle text-lw-accent"
                : "bg-lw-bg-card text-lw-text-secondary"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
