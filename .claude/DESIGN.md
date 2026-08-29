# DESIGN.md — Lawrence Design System

**Product:** White-label AI admissions chatbot for premium education agencies  
**Audience:** Parents seeking school/uni placements (primary) · Agency counsellors (secondary, v2)  
**North star:** Cal.com (parent-facing), Ashby (counsellor dashboard, v2)  
**Accent rationale:** Deep indigo-navy (#1e3a5f) — institutional trust, Oxbridge/boarding-school register. Not SaaS blue. White-label override via 3 tokens.  
**Version:** 1.0 · August 2026

---

## 1. Colors

**All colors map to Tailwind CSS's default palette.** No custom hex values; swapping brands = changing which Tailwind color family feeds the accent role. Computed using Euclidean RGB distance to ensure color fidelity vs. stock shades.

### Light Mode

```
Token                       → Tailwind Color    Role
───────────────────────────────────────────────────────────────────────
--lw-bg                     → white             Canvas
--lw-bg-subtle              → zinc-50           Section alternation, chat area
--lw-bg-card                → zinc-100          Cards, input groups, chips
--lw-bg-elevated            → white             Elevated cards with shadow

--lw-text                   → zinc-900          Primary text
--lw-text-secondary         → zinc-600          Body copy, descriptions
--lw-text-muted             → zinc-400          Placeholders, timestamps, captions
--lw-text-on-accent         → white             Text on accent buttons

--lw-border                 → zinc-200          Borders, dividers
--lw-border-subtle          → zinc-100          Faint section separators

--lw-accent (swappable)     → blue-900          Primary CTA, links, active states
--lw-accent-hover (swappable) → blue-950        Hover/press
--lw-accent-subtle (swappable) → blue-50        Tinted bg for selections, focus rings

--lw-success                → green-600         Confirmed booking, qualified
--lw-warning                → amber-500         Mid-band score, pending action
--lw-error                  → red-500           Validation errors
--lw-hot                    → orange-500        Hot lead badge

--lw-score-cold-bg          → zinc-100          Score band (cold), background
--lw-score-cold-text        → zinc-500          Score band (cold), text
--lw-score-warm-bg          → amber-100         Score band (warm), background
--lw-score-warm-text        → amber-800         Score band (warm), text
--lw-score-qualified-bg     → blue-100          Score band (qualified), background
--lw-score-qualified-text   → blue-900          Score band (qualified), text
--lw-score-hot-bg           → orange-100        Score band (hot), background
--lw-score-hot-text         → orange-800        Score band (hot), text
```

### Dark Mode (no pure black)

```
Token                       → Tailwind Color                    Role
───────────────────────────────────────────────────────────────────────────────
--lw-bg                     → zinc-950                          Near-black canvas
--lw-bg-subtle              → zinc-900                          Elevated sections
--lw-bg-card                → zinc-800                          Cards, panels
--lw-bg-elevated            → zinc-700                          Modals, popovers

--lw-text                   → zinc-100                          Primary text
--lw-text-secondary         → zinc-400                          Body copy
--lw-text-muted             → zinc-500                          Placeholders, captions
--lw-text-on-accent         → white                             Text on accent buttons

--lw-border                 → zinc-800                          Borders
--lw-border-subtle          → zinc-900                          Faint dividers

--lw-accent (swappable)     → blue-400                          Primary CTA, links (lighter for dark)
--lw-accent-hover (swappable) → blue-300                        Hover state
--lw-accent-subtle (swappable) → blue-400 @ 10% (color-mix)     Tinted selection bg

--lw-success                → green-600                         Confirmed booking
--lw-warning                → amber-500                         Mid-band score
--lw-error                  → red-500                           Validation errors
--lw-hot                    → orange-500                        Hot lead badge

--lw-score-cold-bg          → zinc-500 @ 12%                    Score band (cold)
--lw-score-cold-text        → zinc-500                          Score band (cold)
--lw-score-warm-bg          → amber-500 @ 12%                   Score band (warm)
--lw-score-warm-text        → amber-400                         Score band (warm)
--lw-score-qualified-bg     → blue-400 @ 12%                    Score band (qualified)
--lw-score-qualified-text   → blue-400                          Score band (qualified)
--lw-score-hot-bg           → orange-500 @ 12%                  Score band (hot)
--lw-score-hot-text         → orange-400                        Score band (hot)
```

### Score-Band Colors (both themes)

```
Band         Light bg     Light text   Dark bg                      Dark text    Dot
─────────────────────────────────────────────────────────────────────────────────────
< 35 Cold    #f0f0f2      #71717a      rgba(113,113,126,0.12)       #71717a      #91919b
35–50 Warm   #fef3c7      #92400e      rgba(245,158,11,0.12)        #fbbf24      #f59e0b
50–75 Qual   #e0e7f1      #1e3a5f      rgba(91,140,197,0.12)        #7aa3d4      #5b8cc5
75+ Hot      #fff4ed      #9a3412      rgba(249,115,22,0.12)        #fb923c      #f97316
```

---

## 2. Typography

### Font Stack

```
Display + Body:   "Inter", system-ui, -apple-system, sans-serif
Mono (scores):    "JetBrains Mono", ui-monospace, monospace
```

Single font load. Display vs body differentiated by weight (700 vs 400) and negative letter-spacing.

### Load

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
```

### Type Scale

```
Token           Size    Weight  Line-H   Tracking    Use
─────────────────────────────────────────────────────────────────
display-lg      36px    700     1.1      -1.5px      Hero headline
display-md      28px    700     1.2      -0.5px      Section titles
display-sm      22px    700     1.3      -0.3px      Card titles, widget headers
title           18px    600     1.4      0           Sub-headings, chat header name
body            16px    400     1.5      0           Running text, chat messages
body-sm         14px    400     1.5      0           Secondary copy, form labels
caption         13px    500     1.4      0           Timestamps, badges, score labels
button          14px    600     1.0      0           Button labels
mono            14px    400     1.5      0           Score values, lead IDs
```

### Rules

- Display weight is 700. Never 800/900 — confident without shouting.
- Body copy minimum 14px.
- Chat bot bubbles: `body` (16px/400), line-height 1.4.
- Score pills: `mono` for number, `caption` for label.
- All-caps only for `caption`-sized labels (score bands, metric labels). Never on body or titles.

---

## 3. Spacing

### Scale (4px base)

```
Token      Value    Use
────────────────────────────────────────────
xs         4px      Icon-to-text, inline padding
sm         8px      Compact gaps, badge padding
md         12px     Input padding, button icon gaps
base       16px     Card internal padding, stack gaps
lg         24px     Section sub-gaps, card groups
xl         32px     Major section padding (mobile)
2xl        48px     Section padding (desktop)
section    64px     Top-level section separation
```

### Tailwind Extend

```js
spacing: {
  'lw-xs': '4px',
  'lw-sm': '8px',
  'lw-md': '12px',
  'lw-base': '16px',
  'lw-lg': '24px',
  'lw-xl': '32px',
  'lw-2xl': '48px',
  'lw-section': '64px',
}
```

---

## 4. Radii

```
Token      Value      Use                              Tailwind Key
──────────────────────────────────────────────────────────────────
sm         6px        Dropdown items, small buttons     rounded-lw-sm
md         8px        Buttons, inputs                   rounded-lw
lg         12px       Content cards, chat popup         rounded-lw-lg
xl         16px       Hero container (max)              rounded-lw-xl
pill       9999px     Score badges, tags, avatar         rounded-full
```

---

## 5. Shadows

```
Token          Value                                Use
──────────────────────────────────────────────────────────────────────
shadow-sm      0 1px 2px rgba(0,0,0,0.05)           Bot messages, subtle cards
shadow-md      0 2px 8px rgba(0,0,0,0.08)           Elevated cards, dropdowns
shadow-lg      0 8px 24px rgba(0,0,0,0.12)          Chat popup, modals
shadow-focus   0 0 0 3px var(--lw-accent-subtle)     Focus rings on inputs/buttons
```

Dark mode shadows increase alpha: 0.20 / 0.30 / 0.40.

No heavy shadows. No neumorphism. Depth from background-color layering (bg → bg-subtle → bg-card), not stacked shadows.

---

## 6. Components

### Buttons

```css
.btn-primary {
  background: var(--lw-accent);             /* #1e3a5f */
  color: var(--lw-text-on-accent);
  font: 600 14px/1 'Inter', sans-serif;
  padding: 10px 20px;
  height: 40px;
  border-radius: 8px;
  border: none;
}
.btn-primary:hover { background: var(--lw-accent-hover); }
.btn-primary:focus-visible { box-shadow: var(--lw-shadow-focus); }

.btn-secondary {
  background: transparent;
  color: var(--lw-text);
  border: 1px solid var(--lw-border);
  /* same sizing as primary */
}

.btn-ghost {
  background: transparent;
  color: var(--lw-accent);
  border: none;
}
```

### Chat Bubbles

```css
.msg-bot {
  background: var(--lw-bg);
  color: var(--lw-text);
  border-radius: 12px 12px 12px 4px;
  padding: 12px 16px;
  font: 400 16px/1.4 'Inter', sans-serif;
  max-width: 85%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.msg-user {
  background: var(--lw-accent);
  color: var(--lw-text-on-accent);
  border-radius: 12px 12px 4px 12px;
  padding: 12px 16px;
  font: 400 16px/1.4 'Inter', sans-serif;
  max-width: 85%;
}
```

### Score Pill (Ashby-inspired)

```css
.score-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font: 500 13px/1.4 'Inter', sans-serif;
}
.score-pill .dot   { width: 6px; height: 6px; border-radius: 50%; }
.score-pill .value { font: 400 11px/1 'JetBrains Mono', monospace; }
.score-pill .max   { opacity: 0.6; }

/* Apply score-band bg/text colors from section 1 */
```

### Input Field

```css
.input {
  background: var(--lw-bg-subtle);
  color: var(--lw-text);
  border: 1px solid var(--lw-border);
  border-radius: 8px;
  padding: 10px 14px;
  height: 40px;
  font: 400 16px/1.5 'Inter', sans-serif;
}
.input:focus {
  border-color: var(--lw-accent);
  box-shadow: 0 0 0 3px var(--lw-accent-subtle);
}
.input::placeholder { color: var(--lw-text-muted); }
```

### Chat Widget Sizing

```
Desktop popup:    340px wide, max-height 560px
Mobile:           100vw full-width takeover
Header:           56px fixed
Input bar:        48px fixed
```

---

## 7. Theme Implementation

Three-way toggle: **Light** / **Dark** / **Auto** (OS `prefers-color-scheme`).

```css
:root                                    { /* light tokens */ }
[data-theme="dark"]                      { /* dark tokens */ }
@media (prefers-color-scheme: dark) {
  [data-theme="auto"]                    { /* dark tokens */ }
}
```

Set `data-theme` on `<html>`. Store in `localStorage` key `lw-theme`.

---

## 8. White-Label Override

Per-agency customization requires swapping **one Tailwind color family name** in the accent-token block + 1 logo asset. No hex editing.

### Accent-Family Swap (Light & Dark)

In `src/Chatbot/app/globals.css`, find the `WHITE-LABEL BLOCK` comment and replace the family name in all 5 lines. Default (Lawrence) uses `blue`; agencies pick a different Tailwind color family that pairs well with the neutrals (e.g., `emerald`, `indigo`, `purple`).

**Light mode example** (default = blue):
```css
:root {
  --lw-accent:              var(--color-blue-900);    /* swap "blue" to agency family */
  --lw-accent-hover:        var(--color-blue-950);
  --lw-accent-subtle:       var(--color-blue-50);
  --lw-score-qualified-bg:  var(--color-blue-100);
  --lw-score-qualified-text: var(--color-blue-900);
}
```

**To re-brand to Emerald (example):**
```css
:root {
  --lw-accent:              var(--color-emerald-900);
  --lw-accent-hover:        var(--color-emerald-950);
  --lw-accent-subtle:       var(--color-emerald-50);
  --lw-score-qualified-bg:  var(--color-emerald-100);
  --lw-score-qualified-text: var(--color-emerald-900);
}
```

Apply the same change to the `[data-theme="dark"]` block (same line positions, swapped shades: `-400` → agency family, `-300` → lighter, `-400 @ 12%` for subtle).

### Logo Asset

```
--lw-logo-url: url('/assets/agency-logo.svg')   /* Chat header, landing page */
```

Everything else (neutrals, text, status colors, spacing, typography) is constant across deployments. The product disappears behind the agency brand.

---

## 9. Icons

**Lucide** (MIT, tree-shakable, React-ready via `lucide-react`).

```
Icon              Use
──────────────────────────────────────────
MessageSquare     Chat trigger FAB
Send              Chat input submit
X                 Close popup
ArrowRight        CTA arrows, "Learn more"
Calendar          Booking link
Mail              Email option
AlertCircle       Validation error
CheckCircle       Success / confirmed
Flame             Hot lead indicator
Clock             Timeline / urgency signal
User              Parent / authority signal
Wallet            Budget signal
ChevronDown       Dropdowns, expand
```

Size: 20px inline, 24px standalone. Stroke: 1.75px. Color inherits from parent text.

---

## 10. Do / Don't

### Do

- Use `--lw-accent` only for interactive elements: buttons, links, focus rings, chat header. Never as background fills on sections.
- Keep chat bubbles at max 85% width.
- Use mono font for score numbers — the number is the signal.
- Alternate section backgrounds: bg → bg-subtle → bg on landing pages.
- Close every page with a dark footer (#111114 light / #0a0a0c dark).
- Keep the chat header as the single branded surface — accent bg with white text.

### Don't

- Use pure black (#000000) anywhere. Darkest canvas is #0f0f11.
- Use more than 1 accent color per screen. Score-band colors are diagnostic, not interactive.
- Put score-band colors on buttons or CTAs.
- Add gradients to any surface. Flat only.
- Use border-radius above 12px on cards. 16px absolute max on the chat popup outer shell.
- Display Cal Sans or custom display typefaces — Inter at 700 with negative tracking is the voice.
- Show Lawrence branding prominently — the product is invisible. "Powered by Lawrence" in 10px muted text at chat footer is the maximum.

---

## 11. Implementation: Tailwind v4 `globals.css` with Swappable Tokens

This project uses **Tailwind v4 (CSS-first)**, no `tailwind.config.js`. All tokens are wired via `@theme` directive in `src/Chatbot/app/globals.css`.

Runtime CSS custom properties (`--lw-*`) point at Tailwind's own palette variables (`--color-blue-900`, etc.), never literal hex. The `@theme` block then aliases them to generate utility classes (`bg-lw-accent`, `text-lw-text-muted`, `rounded-lw-lg`, etc.).

See the **source file directly** (`src/Chatbot/app/globals.css`) for the complete implementation — it is the canonical reference, kept in sync with this document.

**Key blocks:**
- `:root { --lw-* }` — light-mode tokens, mapping to Tailwind's stock palette
- `[data-theme="dark"]` — dark-mode tokens, same families, lighter shades + `color-mix` for transparent variants
- `WHITE-LABEL BLOCK` comments — mark the accent-family lines you edit per agency (see §8)
- `@theme { --color-lw-* }` — generates all `lw-*` utilities
- `@custom-variant dark` — wires dark mode to `[data-theme="dark"]` attribute instead of OS-only `prefers-color-scheme`

---

## 9. Why Tailwind Colors Only (No Custom Hex)

1. **White-label simplicity** — swapping brands means changing one color *family name* in globals.css, not hunting for 20+ hex literals across components. A single find-replace (e.g., `blue` → `emerald` in the marked block).
2. **Guaranteed contrast & accessibility** — every Tailwind shade pair has WCAG testing + design validation baked in. No risk of inventing a color that fails accessibility or looks wrong in light+dark.
3. **Zero opacity fidelity loss** — dark-mode subtle backgrounds use `color-mix(in oklab, var(--color-xyz-400) 12%, transparent)` and point at Tailwind vars, so theme swaps carry transparency ratios correctly.
4. **Designer friction** — if a new semantic color is needed, it's added to `DESIGN.md` first (with Tailwind mapping documented), forcing a design decision before code. No ad hoc `#abc123` in a random component file.
