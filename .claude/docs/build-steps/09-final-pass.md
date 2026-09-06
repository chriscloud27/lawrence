# Step 09 — Final Pass

## Assumes

- Steps 01–08 complete: all 6 screens and shared infra built

## Task

Audit the entire prototype against the design system and fix violations.
This is a QA step — no new features.

### 1. Color Audit

Scan every component for:
- [ ] No `#000000` or `black` anywhere. Darkest allowed: `#0f0f11`
- [ ] No hardcoded colors — everything via `var(--lw-*)` or the Tailwind
      `lw.*` tokens
- [ ] No gradients (background, text, or border)
- [ ] `--lw-accent` used only on interactive elements (buttons, links,
      focus rings, selected states). Never as section backgrounds
- [ ] Score-band colors used only on score pills and distribution chart.
      Never on buttons or CTAs
- [ ] Dark mode: verify every screen renders correctly with `data-theme="dark"`

### 2. Typography Audit

- [ ] All text uses Inter. No fallback to system fonts visible
- [ ] All score numbers use JetBrains Mono — check: KPI cards, score pills,
      BANT breakdown cards, parent table score column
- [ ] No font weight above 700
- [ ] All-caps only on caption-sized labels (13px): metric card titles,
      BANT dimension labels, table headers. Never on body or headings
- [ ] Body copy minimum 14px everywhere

### 3. Spacing Audit

- [ ] Consistent card padding: 20–24px (not mixed within the same screen)
- [ ] Section gaps: 24–32px between major sections
- [ ] Card gaps: 12px between stacked cards
- [ ] No cramped areas (padding < 8px on interactive elements)

### 4. Responsive Audit (test at 375px, 768px, 1024px, 1440px)

**375px (mobile):**
- [ ] Sidebar becomes horizontal tab bar
- [ ] All cards full width, no horizontal scroll
- [ ] Buttons stack vertically, full width
- [ ] Parent table scrolls horizontally if needed (or cards replace rows)
- [ ] Touch targets minimum 48px
- [ ] Intake form: name/email stack, not side-by-side
- [ ] BANT breakdown: 2×2 grid

**768px (tablet):**
- [ ] Sidebar visible as vertical panel
- [ ] Cards may be 2-column where appropriate

**1024px+ (desktop):**
- [ ] Dashboard: main content + trending sidebar side-by-side
- [ ] Form Builder: 3-panel layout active
- [ ] Parent Detail: header two-column (info + score)

### 5. Component Consistency

- [ ] Score pill component renders identically across: Dashboard table,
      Parent Detail header, Search Profile summary
- [ ] Theme toggle works on every screen (not just the first one loaded)
- [ ] Navigation state persists: switching portals remembers the last active
      screen within each portal
- [ ] "Powered by Lawrence" footer visible on all parent-facing screens

### 6. Interaction Audit

- [ ] Intake form: validation fires on blur, submit disabled until valid
- [ ] Document upload: processing animation sequence plays correctly
- [ ] Search Profile: criteria edit expand/collapse works
- [ ] Dashboard: table sort works on at least the Score column
- [ ] Dashboard: clicking a row navigates to Parent Detail
- [ ] Parent Detail: back link returns to Dashboard
- [ ] Form Builder: list → edit → list navigation works

### Fix Protocol

For each violation found:
1. Name the file and line
2. State what's wrong (e.g. "hardcoded #333 instead of var(--lw-text)")
3. Fix it
4. Confirm the fix doesn't break adjacent components

Report all fixes as a numbered list when complete.

## Do Not

- Add new features or screens
- Refactor file structure
- Install new dependencies
- Change any design token values
