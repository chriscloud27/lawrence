# Step 07 — Parent Detail

## Assumes

- Steps 01–06 complete: clicking a table row in Dashboard navigates here
- Sarah Mitchell's full data (BANT breakdown, criteria, documents, activities)
  available from `mock-data.ts`
- Score pill component exists from step 06

## Task

Replace the Parent Detail placeholder with Screen 2.3. This is the
counsellor's pre-built briefing that replaces the discovery call.

### Layout

Full content area width. Content max-width: 900px, 32px horizontal padding.
Vertical stack of sections.

### Back Link

Top of page: "← Back to Parents" — Inter 500 14px, `--lw-accent`, with
`ArrowLeft` icon. Clicking navigates back to Dashboard.

### Header Card

`--lw-bg-card`, 12px radius, padding 24px. Two-column on desktop (info left,
score right). Single column on mobile.

**Left:**
- Name: Inter 700 22px, `--lw-text`
- Email: Inter 400 14px, `--lw-text-secondary`, with `Mail` icon
- Child line: "Parent of James Mitchell (Age 13, Year 8)" — Inter 400 14px
- Key facts row: Timeline, Boarding/Day, Regions, Budget — each as a
  label:value pair. Label in `--lw-text-muted`, value in `--lw-text`.
  Inter 400 14px. Separated by `·` on desktop, stacked on mobile.

**Right (or below on mobile):**
- BANT score: JetBrains Mono 400 36px + "/100" in `--lw-text-muted`
- Score pill: "Qualified ●" using band colors
- Aligned right on desktop, left on mobile

**Action buttons row** below the header content (inside the card):
- "Send Email" — secondary button, `Mail` icon
- "Book Call" — secondary button, `Calendar` icon
- "Add Note" — secondary button, `Pencil` icon
- 12px gap between buttons. On mobile, full width, stacked.

### BANT Breakdown

4 cards in a row (2×2 grid on mobile), 12px gap. Each card:
- `--lw-bg-card`, 12px radius, padding 16px
- Dimension label: Inter 600 13px, `--lw-text-muted`, uppercase
- Value summary: Inter 400 14px, `--lw-text`
  (Budget: "£30–45K/yr", Authority: "Primary decision-maker",
   Need: "Boarding + learning support", Timeline: "Sep 2027")
- Score: JetBrains Mono 400 14px — "18/25" format. The /25 in `--lw-text-muted`.
- Low scores (<18) get a subtle highlight: `--lw-warning` left border (3px).

### AI-Generated Summary

Section label: "AI Summary" — Inter 600 16px, 32px top margin.

Paragraph block with `--lw-bg-subtle` background, 12px radius, padding 20px,
left border 3px `--lw-accent`:

> "Sarah is looking for a co-ed boarding school with strong sciences and
> learning support for her son James (13, mild dyslexia). She and her husband
> are aligned on budget (£30–45K) and want James placed by September 2027.
> She has already researched Harrow, Wellington, and two Swiss schools. Her
> main concern is pastoral care quality — she's mentioned this in both her
> voice note and email. This is a well-researched, high-intent enquiry."

Inter 400 16px, `--lw-text`, line-height 1.6.

### Extracted Criteria — Tabbed View

3 tabs: "From Documents" / "From Form" / "From Conversation"

Tab bar: Inter 500 14px. Active tab: `--lw-accent` text + 2px bottom border.
Inactive: `--lw-text-muted`.

Under "From Documents" (default active), show a table:

| Criterion | Value | Source |
|-----------|-------|--------|
| Budget | £30,000–£45,000/yr | voice note + form |
| Impetus | Academic fit — wants stronger sciences | form + voice note |
| Current Curriculum | UK National (Year 8) | form |
| Academic Focus | Sciences, engineering | email |
| Special Requirements | Mild dyslexia, SEN needed | brochure + voice note |
| Nationality | British / Swiss dual | form |
| Boarding Preference | Full boarding | form |
| Extracurriculars | Rugby, swimming, cello | parent-edited |
| Regions | UK South East, Switzerland | form |

Table styling: no outer border, `--lw-border-subtle` row separators,
padding 12px, alternating `--lw-bg` / `--lw-bg-subtle` rows. Source column
in `--lw-text-muted`.

"From Form" and "From Conversation" tabs show a simple "No additional data"
empty state.

### Activity Timeline

Section label: "Activity" — Inter 600 16px, 32px top margin.

Vertical timeline, 4 entries from Sarah's `activities` array. Left: time
dot (8px circle, `--lw-border`) + vertical line (1px, `--lw-border`). Right:
timestamp (Inter 400 13px, `--lw-text-muted`) + description (Inter 400 14px,
`--lw-text`).

### Counsellor Notes

Section label: "Notes" — Inter 600 16px, 32px top margin.

Empty state card: `--lw-bg-card`, 12px radius, padding 24px, centered text:
"No notes yet. Add your first note after speaking with this parent."
Inter 400 14px, `--lw-text-muted`. "Add" button secondary style, centered.

### Suggested Actions

Section label: "Suggested Actions" — Inter 600 16px, 32px top margin.

3 items, each a row with `ArrowRight` icon in `--lw-accent`:
1. Send information pack for Wellington College and Aiglon College
2. Highlight learning support programmes in your call
3. Ask about husband's involvement — authority signal is strong but from
   one parent only

Each: Inter 400 14px, `--lw-text`. Background `--lw-accent-subtle`, 8px
radius, padding 12px 16px, 8px gap between items.

## Do Not

- Make action buttons functional (Send Email, Book Call, Add Note)
- Build a note editor
- Implement tab switching beyond showing/hiding content
- Add any data not in mock-data.ts

## Verify

- [ ] Back link navigates to Dashboard
- [ ] Header shows Sarah's full info with correct BANT score in JetBrains Mono
- [ ] Score pill uses correct band color for 72 (qualified)
- [ ] 4 BANT mini-cards render with correct scores, low scores highlighted
- [ ] AI summary paragraph displays in accented block
- [ ] Tab bar renders 3 tabs, "From Documents" active by default
- [ ] Criteria table shows 9 rows with source attribution
- [ ] Activity timeline shows 4 entries in vertical layout
- [ ] Notes section shows empty state
- [ ] 3 suggested actions render with arrow icons
- [ ] Mobile: header stacks, BANT cards go 2×2, buttons stack
