# Step 06 — Agency Dashboard

## Assumes

- Steps 01–05 complete: parent portal fully functional
- Clicking "Agency Dashboard" tab shows sidebar with Dashboard / Parent
  Detail / Form Builder
- 6 sample parents available from `mock-data.ts`
- Score helpers available from `score.ts`

## Task

Replace the Dashboard placeholder with Screen 2.2. This is the agency
counsellor's daily operating view.

### Layout

Full content area. Two-column layout on desktop: main area (flex-grow) +
right sidebar (280px). Below 1024px, sidebar stacks below main content.

### KPI Row — 4 Metric Cards

Horizontal row of 4 cards, equal width, 12px gap.

Each card: `--lw-bg-card`, 12px radius, padding 20px.

| Card | Value | Trend |
|------|-------|-------|
| New Parents | 47 | ↑ 12% vs last week |
| Hot Leads | 8 | ↑ 3 this week |
| Avg Score | 61/100 | ↑ from 54 last month |
| Response Time | < 4 hrs | ↓ from 9h last month |

- Card title: Inter 500 13px, `--lw-text-muted`, uppercase
- Value: JetBrains Mono 400 28px, `--lw-text`
- Trend: Inter 400 13px. Positive trend: `--lw-success` with `TrendingUp`
  icon. Negative: `--lw-error` with `TrendingDown`. "Response Time" decrease
  is positive (show green).

Cards are clickable (pointer cursor + hover: `--lw-accent-subtle` bg) but
don't navigate anywhere in the prototype.

### Score Distribution

Below KPI row, 24px margin. Section label: "Score Distribution" — Inter 600
16px.

Horizontal stacked bar, full width, 24px height, 8px radius:

```
Cold 38% | Warm 21% | Qualified 30% | Hot 11%
```

- Each segment uses its band bg color (light theme values)
- Below the bar: legend row with colored dots + band label + count
  ("Cold: 18", "Warm: 10", etc.) in Inter 400 13px

### Parent Table

Below distribution, 24px margin.

**Filter bar above the table:**
- Dropdown filters: Score Band (All / Cold / Warm / Qualified / Hot),
  Timeline (All / This term / Next year / 2+ years), Status (All / New /
  Contacted / In Progress / Auto-nurture)
- Search input: placeholder "Search by name or email", Lucide `Search` icon
- Filters use secondary dropdown style, 140px width

**Table:**

| Column | Width | Content |
|--------|-------|---------|
| Name | flex | Inter 500 14px, `--lw-text` |
| Child | 120px | "{name}, {age}" — Inter 400 14px, `--lw-text-secondary` |
| Score | 80px | JetBrains Mono 400 14px + colored dot (6px) |
| Band | 100px | Score pill component |
| Timeline | 120px | Inter 400 14px |
| Status | 120px | Inter 400 13px, `--lw-text-muted` |
| Last Activity | 120px | Relative time, Inter 400 13px, `--lw-text-muted` |

- Table header: Inter 600 13px, `--lw-text-muted`, uppercase, sticky
- Row: `--lw-bg` background, bottom border `--lw-border-subtle`, padding 12px
- Row hover: `--lw-bg-subtle`
- Row click: navigate to Parent Detail (sidebar active item changes)
- Default sort: Score descending. Clicking any column header sorts by that
  column (toggle asc/desc). Active sort column: `--lw-accent` text +
  `ChevronUp`/`ChevronDown` icon.
- Render all 6 sample parents

### Trending Patterns Sidebar

Right sidebar panel. Header: "Trending Patterns" — Inter 600 16px.
Subhead: "Last 30 Days" — Inter 400 13px, `--lw-text-muted`.

5 items, stacked:

```
1. "IB curriculum" — 23 parents (↑ 40%)
2. "Boarding in Switzerland" — 18 parents (↑ 25%)
3. "Learning support / SEN" — 15 parents (steady)
4. "Under £25k per year" — 12 parents (↑ 60%)
5. "Co-ed sixth form" — 9 parents (new)
```

Each item:
- Rank: Inter 600 13px, `--lw-text-muted`
- Pattern: Inter 500 14px, `--lw-text`
- Count + trend: Inter 400 13px, `--lw-text-muted`. "new" in `--lw-accent`
  pill, trend arrows in `--lw-success`

Divider between items: `--lw-border-subtle`.

"Export as CSV" link at bottom — Inter 500 13px, `--lw-accent`, `Download`
icon.

## Do Not

- Implement real filtering logic beyond showing/hiding table rows
- Add pagination to the table (6 rows don't need it)
- Make KPI cards navigate anywhere
- Build charts with a charting library — the stacked bar is pure CSS/divs

## Verify

- [ ] 4 KPI cards render with correct values in JetBrains Mono
- [ ] Trend arrows show correct color (green for positive, even "Response Time ↓")
- [ ] Score distribution bar shows 4 segments with correct band colors
- [ ] Legend below bar shows colored dots + counts
- [ ] Table renders 6 parents sorted by score descending
- [ ] Score column uses JetBrains Mono + colored dot
- [ ] Band column uses score pill component
- [ ] Column header click sorts (at least score column works)
- [ ] Row hover highlights, row click navigates to Parent Detail
- [ ] Trending sidebar shows 5 items with trends
- [ ] Below 1024px: sidebar stacks below table
- [ ] Filter dropdowns render (functional filtering is nice-to-have)
