# Step 02 — Layout Shell

## Assumes

- Step 01 complete: types, mock data, helpers all in place
- Design tokens in `src/styles/design-tokens.css`
- No UI components exist yet

## Task

Build the application shell: top nav, tab switcher, sidebar navigation, theme
toggle, and routing. After this step, clicking any nav item should render a
placeholder `<div>` with the screen name — no real content yet.

### 1. Theme Context — `src/context/ThemeContext.tsx`

React context providing `theme` and `setTheme`. Three states: `"light"`,
`"dark"`, `"auto"`. On mount, default to `"auto"`. When theme changes, set
`data-theme` attribute on `document.documentElement`. For `"auto"`, listen
to `window.matchMedia("(prefers-color-scheme: dark)")` and set `data-theme`
accordingly.

Store in React state only — no localStorage.

### 2. Top Nav — `src/components/layout/TopNav.tsx`

Single horizontal bar, full width, `--lw-bg` background, bottom border
`--lw-border`.

Contents (left to right):
- **Logo mark:** 32×32px square, `--lw-accent` background, white "L" in
  Inter 600 16px, border-radius 8px. Next to it: "Lawrence" in Inter 600
  18px, `--lw-text`.
- **Tab switcher (center):** Two tabs — "Parent Portal" and "Agency Dashboard".
  Active tab: `--lw-accent` text + 2px bottom border in `--lw-accent`.
  Inactive: `--lw-text-muted`, no border. Tabs switch the active portal.
  Gap between tabs: 32px. Font: Inter 500 14px.
- **Right side:** Theme toggle (3 buttons: sun icon / moon icon / monitor
  icon for Light/Dark/Auto, using Lucide `Sun`, `Moon`, `Monitor`). Active
  state: `--lw-accent-subtle` background + `--lw-accent` icon color.
  Then a 32px circle avatar placeholder in `--lw-bg-card`.

Height: 56px. Padding: 0 24px.

### 3. Sidebar — `src/components/layout/Sidebar.tsx`

Vertical sidebar, 220px wide, left side, below top nav. `--lw-bg` background,
right border `--lw-border`.

Accepts a `items` prop: array of `{ id, label, icon }`. Renders each as a
row with Lucide icon (20px) + label (Inter 400 14px). Active item:
`--lw-accent-subtle` background, `--lw-accent` text. Inactive:
`--lw-text-secondary`.

**Parent Portal sidebar items:**
- Intake Form (icon: `ClipboardList`)
- Document Upload (icon: `Upload`)
- My Search Profile (icon: `User`)

**Agency Dashboard sidebar items:**
- Dashboard (icon: `LayoutDashboard`)
- Parent Detail (icon: `UserCheck`)
- Form Builder (icon: `Settings`)

Responsive: below 768px, sidebar becomes a horizontal scrolling tab bar
below the top nav. Items render as horizontal pills.

### 4. Main Layout — `src/components/layout/MainLayout.tsx`

Combines TopNav + Sidebar + content area. Content area fills remaining space
(flexbox). Each sidebar item maps to a placeholder `<div>` showing the screen
name in `--lw-text-muted`, centered.

### 5. App Entry — `src/App.tsx`

Wrap in `ThemeProvider`. Render `MainLayout`. State tracks active portal
(`"parent"` | `"agency"`) and active screen within each portal. Default:
Parent Portal → Intake Form.

Use React state for routing — no react-router needed for a prototype.

## Do Not

- Build any screen content — only placeholders
- Add page transitions or animations
- Use react-router or any routing library
- Create components that belong to specific screens
- Use localStorage for theme

## Verify

- [ ] Top nav renders with logo, tabs, theme toggle, avatar
- [ ] Clicking "Parent Portal" / "Agency Dashboard" switches sidebar items
- [ ] Clicking sidebar items updates the content area placeholder
- [ ] Theme toggle cycles through light/dark/auto correctly
- [ ] `data-theme` attribute updates on `<html>` element
- [ ] Auto theme respects OS preference
- [ ] Below 768px: sidebar collapses to horizontal tabs
- [ ] No real screen content rendered — only placeholder divs
- [ ] All text uses Inter, all colors from `--lw-*` vars
