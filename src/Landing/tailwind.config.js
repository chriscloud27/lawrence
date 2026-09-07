/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Lawrence Design System (.claude/DESIGN.md) ──────────────────
        "lw-bg": "var(--lw-bg)",
        "lw-bg-subtle": "var(--lw-bg-subtle)",
        "lw-bg-card": "var(--lw-bg-card)",
        "lw-bg-elevated": "var(--lw-bg-elevated)",

        "lw-text": "var(--lw-text)",
        "lw-text-secondary": "var(--lw-text-secondary)",
        "lw-text-muted": "var(--lw-text-muted)",
        "lw-text-on-accent": "var(--lw-text-on-accent)",

        "lw-border": "var(--lw-border)",
        "lw-border-subtle": "var(--lw-border-subtle)",

        "lw-accent": "var(--lw-accent)",
        "lw-accent-hover": "var(--lw-accent-hover)",
        "lw-accent-subtle": "var(--lw-accent-subtle)",

        "lw-error": "var(--lw-error)",

        "lw-footer-bg": "var(--lw-footer-bg)",
        "lw-footer-text": "var(--lw-footer-text)",

        // ── shadcn/ui semantic tokens ──────────────────────────────────
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },

      maxWidth: {
        content: "1440px", // full-width section cap
        text: "680px", // prose / body copy
        lead: "720px", // lead paragraphs
        site: "1100px", // legacy container width
      },

      spacing: {
        "lw-xs": "4px",
        "lw-sm": "8px",
        "lw-md": "12px",
        "lw-base": "16px",
        "lw-lg": "24px",
        "lw-xl": "32px",
        "lw-2xl": "48px",
        "lw-section": "64px",
      },

      borderRadius: {
        tag: "4px", // tags, chips (legacy, still referenced by ui/badge.tsx variants)
        btn: "8px", // buttons (legacy)
        card: "12px", // standard cards (legacy)
        feature: "16px", // feature/highlight cards (legacy)
        "lw-sm": "6px",
        lw: "8px",
        "lw-lg": "12px",
        "lw-xl": "16px",
      },

      boxShadow: {
        "lw-sm": "var(--lw-shadow-sm)",
        "lw-md": "var(--lw-shadow-md)",
        "lw-lg": "var(--lw-shadow-lg)",
        "lw-focus": "var(--lw-shadow-focus)",
      },
    },
  },
  plugins: [],
};
