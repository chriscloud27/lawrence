# Step 05 — My Search Profile

## Assumes

- Steps 01–04 complete: navigation works, document upload can route here
- Sarah Mitchell's full mock data available from `mock-data.ts`

## Task

Replace the Search Profile placeholder with Screen 1.3. This is the parent's
"value moment" — their scattered research structured and editable.

### Layout

Full content area width. No max-width constraint on the outer container.
Content max-width: 800px with 32px horizontal padding.

### Summary Card

Top of the page. `--lw-bg-card` background, 12px radius, padding 24px.

```
Sarah Mitchell
Parent of James Mitchell (Age 13, Year 8)

Looking for: Boarding school
Regions: UK (South East), Switzerland
Timeline: September 2027
Profile completeness: ████████░░ 78%

BANT Score: 72/100  [Qualified ●]
Last updated: 2 hours ago
```

- Name: Inter 700 22px, `--lw-text`
- Child line: Inter 400 14px, `--lw-text-secondary`
- Key facts: Inter 400 14px, labels in `--lw-text-muted`, values in
  `--lw-text`
- Progress bar: 200px wide, 6px tall, `--lw-border` track, `--lw-accent`
  fill, rounded ends. "78%" label right-aligned above.
- BANT score: number in JetBrains Mono 400 14px. Score pill component with
  "Qualified" label + colored dot. Use `getScoreBand` + `getBandColor`.
- "Last updated" in Inter 400 13px, `--lw-text-muted`
- Edit button top-right: Lucide `Pencil`, ghost button style

### Search Criteria Cards

Section header: "Search Criteria" — Inter 600 18px, `--lw-text`. 32px top
margin.

4 cards from Sarah's `criteria` array, stacked vertically with 12px gap:

Each card:
- `--lw-bg-card` background, 12px radius, padding 20px
- Label: Inter 600 14px, `--lw-text` (e.g. "Budget")
- Value: Inter 400 16px, `--lw-text` (e.g. "We're comfortable with
  £30,000–£45,000 per year including boarding fees.")
- Source: Inter 400 13px, `--lw-text-muted`, italic
  (e.g. "Extracted from: voice-note-what-we-want.m4a")
- Edit button: right side, Lucide `Pencil`, ghost style, `--lw-accent`

Edit behavior (prototype): clicking Edit expands the card — value becomes a
textarea, source stays visible, Save + Cancel buttons appear below. Save
collapses back. No persistence — just UI state toggle.

"+ Add a criterion" link below the last card — Inter 500 14px, `--lw-accent`,
`Plus` icon.

### School Preferences

Section header: "What Matters Most" — Inter 600 18px. 32px top margin.

Ranked list of 5 items from Sarah's `preferences` array:

```
1. Academic results and university placement record
2. Pastoral care and wellbeing support
3. Proximity to London (weekend visits)
4. Sports facilities and competitive teams
5. Music programme
```

Each item:
- Row: rank number (Inter 600 14px, `--lw-text-muted`) | drag handle
  (Lucide `GripVertical`, `--lw-text-muted`) | text (Inter 400 14px)
- Background: `--lw-bg-card`, 8px radius, padding 12px 16px
- Gap between items: 6px

Drag-to-reorder: implement with mouse/touch handlers. Items swap position
on drag. Keep it simple — no library needed for 5 items.

"+ Add preference" link at bottom.

### Documents

Section header: "Uploaded Documents" — Inter 600 18px. 32px top margin.

Table-style list from Sarah's `documents` array:

```
Filename                        Status      Criteria    Actions
school-brochure-harrow.pdf      Processed   3 extracted [View] [Remove]
voice-note-what-we-want.m4a     Processed   5 extracted [View transcript] [Remove]
email-from-consultant.eml       Processed   2 extracted [View] [Remove]
```

Each row: `--lw-bg-card`, 8px radius, padding 12px 16px, 6px gap.
"Processed" status in `--lw-success`. Action links in `--lw-accent`.

"Upload more" button — secondary style.

## Do Not

- Persist any edits — all state resets on navigation
- Use a drag-and-drop library (react-beautiful-dnd, dnd-kit)
- Build settings or GDPR sections (these are real features, not prototype)
- Add sidebar navigation within this screen

## Verify

- [ ] Summary card shows all Sarah Mitchell data correctly
- [ ] BANT score displays in JetBrains Mono with correct band pill color
- [ ] Progress bar renders at 78%
- [ ] 4 criteria cards display with values and source attribution
- [ ] Edit expands card to textarea, Save/Cancel collapse it
- [ ] 5 preferences render with rank numbers and drag handles
- [ ] Drag-to-reorder works (items swap position)
- [ ] 3 documents render with correct status and extraction counts
- [ ] All section headers use Inter 600 18px
- [ ] Mobile: cards full width, no horizontal overflow
