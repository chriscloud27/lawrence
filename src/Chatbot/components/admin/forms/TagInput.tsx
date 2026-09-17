"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

export function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    } else if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-[6px] rounded-lw border border-lw-border bg-lw-bg-subtle px-lw-sm py-[6px] focus-within:border-lw-accent focus-within:shadow-lw-focus">
      {values.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-lw-xs rounded-full bg-lw-accent-subtle px-lw-sm py-lw-xs text-[13px] whitespace-nowrap text-lw-accent"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(values.filter((v) => v !== tag))}
            aria-label={`Remove ${tag}`}
            className="-my-lw-sm -mr-lw-xs flex cursor-pointer items-center justify-center p-lw-sm text-current"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        className="min-w-[120px] flex-1 border-none bg-transparent text-sm text-lw-text outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={values.length === 0 ? placeholder : ""}
      />
    </div>
  );
}
