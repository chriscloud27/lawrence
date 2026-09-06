import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface TagInputProps {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}

export function TagInput({ values, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const addTag = () => {
    const trimmed = draft.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setDraft('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div className="lw-tag-input-wrap">
      {values.map((tag) => (
        <span key={tag} className="lw-tag">
          {tag}
          <button
            type="button"
            className="lw-tag-remove"
            onClick={() => onChange(values.filter((v) => v !== tag))}
            aria-label={`Remove ${tag}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        className="lw-tag-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={values.length === 0 ? placeholder : ''}
      />
    </div>
  )
}
