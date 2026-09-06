# Step 08 — Form Builder

## Assumes

- Steps 01–07 complete: all other screens functional
- 3 sample IntakeForm records available from `mock-data.ts`

## Task

Replace the Form Builder placeholder with Screen 2.1. This is the agency's
tool for managing intake forms. It has two sub-views: list view (default) and
edit view (when a form is clicked).

### List View (default)

Section header: "Intake Forms" — Inter 700 22px, `--lw-text`. Right-aligned:
"+ New Form" button, secondary style, `Plus` icon.

3 cards stacked vertically, 12px gap. Each card:
- `--lw-bg-card`, 12px radius, padding 20px
- Left: radio-style indicator — filled circle for default form, empty for others
- Form name: Inter 600 16px, `--lw-text`
- Stats line: "{fieldCount} fields · {submissions} submissions ·
  {completionRate}% completion · {status}" — Inter 400 13px, `--lw-text-secondary`
- Status pill: Live = `--lw-success` bg (10% opacity) + text, Draft =
  `--lw-text-muted` bg (10% opacity) + text, A/B Test = `--lw-warning` bg
  (10% opacity) + text. Pill shape (9999px radius), Inter 500 12px.
- "Last edited: {time}" — Inter 400 13px, `--lw-text-muted`
- Hover: `--lw-bg-subtle` background + pointer cursor

Row actions (right side, visible on hover or always on mobile):
- "Edit" — ghost button, `Pencil` icon
- "Duplicate" — ghost button, `Copy` icon
- "Archive" — ghost button, `Archive` icon

Clicking the card or the Edit button opens the edit view for that form.

### Edit View

Replaces the list view (back link at top: "← Back to Forms").

Three-panel layout on desktop (below 1024px: stacks vertically):

**Left panel — Field Palette (200px wide):**
- Header: "Add Field" — Inter 600 14px
- List of draggable field types, each a small card:
  - Text Input (icon: `Type`)
  - Email (icon: `Mail`)
  - Dropdown (icon: `ChevronDown`)
  - Multi-Select Chips (icon: `ToggleLeft`)
  - Tag Input (icon: `Tag`)
  - Textarea (icon: `AlignLeft`)
  - File Upload (icon: `Upload`)
  - Date Picker (icon: `Calendar`)
- Each: `--lw-bg-card`, 8px radius, padding 8px 12px, Inter 400 13px,
  icon 16px `--lw-text-muted`. Cursor: grab.

**Center panel — Form Preview (flex-grow):**
- Header: form name editable (inline text input, Inter 600 18px)
- Below: live preview rendering the form fields in the same style as the
  intake form (step 03). Show 5 sample fields pre-populated for the
  "Standard Intake" form:
  1. Your name (text)
  2. Child's age (dropdown)
  3. Budget range (dropdown)
  4. Why are you looking? (dropdown)
  5. When does your child need to start? (dropdown)

- Each field in the preview is selectable (click to select, shows
  `--lw-accent` left border 3px when selected). Selected field populates
  the right config panel.
- Drag handle (Lucide `GripVertical`) on each field for reorder.
- "Preview as parent" button above the form — secondary style, `Eye` icon.
  Clicking toggles a modal overlay showing the form exactly as the parent
  would see it (reuse intake form component from step 03 in read-only mode).

**Right panel — Field Config (260px wide):**
- Header: "Field Settings" — Inter 600 14px
- Shows when a field is selected in the center panel. Empty state: "Select
  a field to configure" centered in `--lw-text-muted`.

When a field is selected, show:
- Label: text input (current field label)
- Placeholder: text input
- Required: toggle switch (`--lw-accent` when on)
- Help text: text input
- BANT Mapping: dropdown — None / Budget / Authority / Need / Timeline.
  This tells Lawrence which BANT dimension this field contributes to.

All config inputs use the standard input styling from the design system.

**Top action bar (full width above the 3 panels):**
- Left: back link "← Back to Forms"
- Right: "Save as Draft" (secondary) + "Publish" (primary)

### Modal: Preview as Parent

Overlay with `--lw-bg` background at 95% opacity backdrop. Centered card,
max-width 560px, max-height 80vh, overflow scroll. Renders the form from
the center panel in the intake form style. Close button top-right: `X` icon.

## Do Not

- Implement actual drag-and-drop between panels (just visual reorder in center)
- Save any form configuration
- Build A/B test splitting UI
- Make "New Form" create anything — just show a toast or console.log

## Verify

- [ ] List view shows 3 forms with correct stats and status pills
- [ ] Default form has filled radio indicator
- [ ] Hover shows row actions
- [ ] Clicking a form or Edit opens the edit view
- [ ] Edit view shows 3 panels on desktop
- [ ] Left panel shows 8 field types with correct icons
- [ ] Center panel shows 5 pre-populated fields
- [ ] Clicking a field selects it (accent left border)
- [ ] Right panel populates with field config when selected
- [ ] BANT Mapping dropdown shows 5 options
- [ ] "Preview as parent" opens modal with form preview
- [ ] Back link returns to list view
- [ ] Below 1024px: panels stack vertically
- [ ] All styling uses design tokens — no invented colors
