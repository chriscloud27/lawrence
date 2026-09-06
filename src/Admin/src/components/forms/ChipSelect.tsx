interface ChipSelectProps {
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function ChipSelect({ options, value, onChange }: ChipSelectProps) {
  return (
    <div className="lw-chip-group">
      {options.map((option) => {
        const isSelected = option === value
        return (
          <button
            key={option}
            type="button"
            className={`lw-chip${isSelected ? ' selected' : ''}`}
            onClick={() => onChange(isSelected ? '' : option)}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
