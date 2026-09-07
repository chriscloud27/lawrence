"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem("lw-theme", theme);
}

export default function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") {
      setThemeState(current);
    }
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    applyTheme(next);
  };

  return (
    <div className="flex rounded-full bg-lw-bg-card p-[2px]">
      <button
        type="button"
        aria-label="Light theme"
        onClick={() => setTheme("light")}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] transition-colors ${
          theme === "light"
            ? "bg-lw-accent text-lw-text-on-accent"
            : "text-lw-text-muted"
        }`}
      >
        ☀
      </button>
      <button
        type="button"
        aria-label="Dark theme"
        onClick={() => setTheme("dark")}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] transition-colors ${
          theme === "dark"
            ? "bg-lw-accent text-lw-text-on-accent"
            : "text-lw-text-muted"
        }`}
      >
        ☾
      </button>
    </div>
  );
}
