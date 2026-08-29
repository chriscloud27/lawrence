# Design System & Tailwind Token Rules

## Source of Truth

`.claude/DESIGN.md` is the canonical Lawrence Design System (colors, typography, spacing, radii, shadows, components, dark mode, white-label). Read it before styling any UI.

**Implementation note:** All color tokens in DESIGN.md map to Tailwind CSS's default palette (e.g., `--lw-accent` → `blue-900`). The mapping is wired into Tailwind v4 via `@theme` in `src/Chatbot/app/globals.css` — that file is generated from DESIGN.md §1, §8, §11, do not hand-diverge the two.

## Token Usage Rules (Mandatory)

### Core Constraint: Never Custom Hex

- **Never** use raw hex values (`#rrggbb`), `rgb()`/`rgba()`, or Tailwind default palette colors (`blue-600`, `gray-100`, `slate-500`, etc.) in any component, CSS file, or inline style.
- Every color must resolve through:
  1. **Preferred:** an `lw-*` Tailwind utility (`bg-lw-accent`, `text-lw-text-muted`, `border-lw-border`, `rounded-lw-lg`, `shadow-lw-md`).
  2. **Fallback (new roles only):** a direct `var(--color-{tailwind-name}-{shade})` reference if the semantic isn't tokenized yet — but this must go to `.claude/DESIGN.md` as a proposed addition first.
  3. **Exception only:** Third-party brand marks (e.g., Trustpilot's `#00b67a`) with an explicit comment explaining why (external brand, do not drift with app retheming).

### Accent Colors: Interactive Elements Only

- `--lw-accent` (and `--lw-accent-hover`, `--lw-accent-subtle`) are for interactive surfaces only:
  - Button backgrounds
  - Links
  - Focus rings
  - Chat header background
  - Input active border
- **Never** use `--lw-accent` as a section/card background fill.

### Score-Band & Status Colors: Diagnostic, Not Interactive

- Score-band colors (`--lw-score-cold`, `--lw-score-warm`, `--lw-score-qualified`, `--lw-score-hot`) are for **displaying qualification signals to internal users** (admin dashboard, advisor views), not end-user CTAs.
- Status colors (`--lw-success`, `--lw-warning`, `--lw-error`, `--lw-hot`) are similarly diagnostic.
- **Never** apply these colors to buttons or interactive CTAs — violates the "accent reserved for interactive" rule and conflates app state with agency branding.

### Layout & Structure

- **No gradients** on any surface (flat colors only, DESIGN.md §10).
- **No pure black** (`#000000`) anywhere. Darkest canvas is `--lw-bg` in dark mode (`zinc-950` / `black`).
- **Border radius max:**
  - Cards, inputs, general content: `rounded-lw-lg` (12px)
  - Chat popup outer shell only: `rounded-lw-xl` (16px absolute maximum)
- **Chat bubbles** follow DESIGN.md §6 exactly:
  - Bot: `rounded-lw-lg rounded-tl-[4px]` (12px except 4px top-left), `bg-lw-bg text-lw-text`, subtle border + shadow
  - User: `rounded-lw-lg rounded-tr-[4px]` (12px except 4px top-right), `bg-lw-accent text-lw-text-on-accent`
  - Max-width: 85%

### Typography

- Display weight is **700 only** (never 800/900 — confident without shouting).
- Minimum body-copy size: **14px**.
- **Score numbers:** `font-mono` (`--font-mono` → JetBrains Mono) for all numeric score values.
- **All other text:** `font-sans` (Inter).

## Process for New Tokens

If a genuinely new semantic color/spacing/radius is needed:

1. Propose it in `.claude/DESIGN.md` first (as a comment or temporary entry).
2. Map it to the nearest Tailwind color family + shade — never invent a custom hex.
3. Wire it into `src/Chatbot/app/globals.css`'s `@theme` block.
4. Document the usage site in the token's role column.
5. Do not add it to a component-local CSS file or inline style — it goes into the global system.

## White-Label Agency Re-Skinning

The **accent family** is the only swappable element per DESIGN.md §8. To re-brand for a new agency:

1. Open `src/Chatbot/app/globals.css`.
2. Find the two `WHITE-LABEL BLOCK` comment sections (light mode and dark mode).
3. Replace the color family name in all ~8 marked lines (default = `blue`, swap to `emerald`, `indigo`, `purple`, etc. — any Tailwind family).
   - Light: `-900` (primary), `-950` (hover), `-50` (subtle), `-100` (bg), `-900` (text)
   - Dark: `-400` (primary), `-300` (hover), `-400 @ 10%` (subtle), `-400 @ 12%` (bg), `-400` (text)
4. Verify the new family's contrast against neutrals (your design tool or WCAG checker).
5. Keep all other tokens (text, border, status colors) unchanged — they are constant per DESIGN.md §8.

## Don't

- Don't hardcode Tailwind default color utilities in any component.
- Don't introduce a new local CSS variable palette in a `.module.css` file unless it points at `var(--lw-*)` or `var(--color-{tailwind}-{shade})` tokens (see `marketing.module.css` Tier 1).
- Don't display prominent Lawrence branding — the product is white-label. "Powered by Lawrence" at 10px muted text in the chat footer is the maximum (DESIGN.md §10).
- Don't add a one-off color to a component file and call it done. System-first thinking.
- Don't use `dark:` variant utilities without understanding it's wired to `[data-theme="dark"]`, not OS-only dark mode (DESIGN.md §7, globals.css `@custom-variant dark`).
