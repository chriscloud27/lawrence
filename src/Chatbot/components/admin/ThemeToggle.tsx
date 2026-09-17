"use client";

// Replaces src/Admin/src/context/ThemeContext.tsx. One mechanism, not two:
// globals.css wires the `dark` variant to [data-theme="dark"] on <html>, and
// [data-theme="auto"] to prefers-color-scheme — so setting that one attribute
// is the whole implementation.

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export type Theme = "light" | "dark" | "auto";

export const THEME_STORAGE_KEY = "lw-admin-theme";

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "auto", icon: Monitor, label: "System" },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");

  // Applied on mount, not before paint: React 19 does not render an inline
  // <script> from the component tree into the document, so a pre-hydration
  // bootstrap is not available here. The cost is one frame of the default theme
  // on first load; the benefit is no hydration mismatch on <html>.
  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const next: Theme =
      stored === "light" || stored === "dark" || stored === "auto" ? stored : "auto";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }, []);

  const apply = (next: Theme) => {
    setTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <div className="flex gap-lw-xs">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => apply(value)}
          aria-label={label}
          aria-pressed={theme === value}
          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lw max-[767px]:h-12 max-[767px]:w-12 ${
            theme === value
              ? "bg-lw-accent-subtle text-lw-accent"
              : "bg-transparent text-lw-text-muted"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
