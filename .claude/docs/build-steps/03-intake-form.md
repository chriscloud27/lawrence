# Step 03 — Intake Form

## Assumes

- Steps 01–02 complete: data layer, layout shell, routing all working
- Sidebar "Intake Form" click currently shows a placeholder div

## Task

Replace the Intake Form placeholder with the full parent intake form.
This is Screen 1.1 — the parent's first interaction.

### Layout

Single column, max-width 560px, centered in the content area. Top padding
48px. Card wrapper with `--lw-bg` background, 12px border-radius,
`--lw-border` border, padding 32px.

### Progress Indicator

Top of the card: "Step 1 of 2" — two circles connected by a line. Circle 1
filled `--lw-accent`, circle 2 outlined `--lw-border`. Label below each:
"Your details" / "Upload research". Font: Inter 500 13px, `--lw-text-muted`.

### Form Sections

**Section 1: "About You" (contact fields, required)**

Three fields in this order:
- Your name — text input
- Your email — email input
- Child's first name — text input

On desktop (>560px), name + email side by side. On mobile, stacked.

**Section 2: "About Your Search" (Big 5, required)**

Section header: Inter 600 18px, `--lw-text`. Subtle divider above
(`--lw-border-subtle`).

Five fields, each full width, stacked:
1. Child's age or year group — dropdown (from `ageOptions`)
2. When does your child need to start? — dropdown (from `timelineOptions`)
3. What is your budget range per year? — dropdown (from `budgetOptions`)
4. Why are you looking for a new school? — dropdown (from `impetusOptions`)
   + conditional textarea ("Tell us more" placeholder) when "Other" selected
5. Current school type or curriculum — dropdown (from `curriculumOptions`)

**Section 3: "Optional Details" (supplementary, collapsible)**

Collapsed by default. Toggle link: "Add more details (optional)" with
`ChevronDown` icon that rotates on open. Inside:

- Boarding or day? — chip select (from `boardingOptions`). Chips: pill shape,
  `--lw-bg-card` default, `--lw-accent-subtle` bg + `--lw-accent` text
  when selected.
- Nationality / passports held — tag input. Type + Enter to add. Tags render
  as pills with × remove button.
- Preferred regions or countries — tag input (same pattern).
- Learning differences or special needs? — chip select (from `learningOptions`).
- Anything else we should know? — textarea, 3 rows.

### Shared Input Styling

All inputs use the design system input styles:
- Height: 40px (inputs/dropdowns), auto (textarea)
- Background: `--lw-bg-subtle`
- Border: 1px solid `--lw-border`, 8px radius
- Focus: `--lw-accent` border + `--lw-shadow-focus`
- Label: Inter 500 14px, `--lw-text`, 6px margin-bottom
- Required indicator: red asterisk after label
- Error state: `--lw-error` border + error message below in Inter 400 13px

### Validation

Inline on blur, not on submit:
- Name: required, min 2 chars
- Email: required, valid email format
- Child's name: required
- All Big 5 dropdowns: required (must select non-placeholder)
- Supplementary fields: no validation (all optional)

### Submit Button

Full width below the form. Label: "Continue to upload your research →"
(with ArrowRight icon). Primary button style: `--lw-accent` bg, white text,
Inter 600 14px, 40px height, 8px radius. Disabled until all required fields
pass validation. Disabled state: 50% opacity, no pointer events.

On click: navigate to Document Upload screen (update sidebar active state).

### Footer

Below the button, centered: "Powered by Lawrence" in Inter 400 10px,
`--lw-text-muted`.

## Do Not

- Submit data anywhere — form state is local React state only
- Add animations beyond focus transitions
- Use a form library (react-hook-form, formik) — keep it simple with useState
- Build the Document Upload screen — just navigate to it

## Verify

- [ ] Form renders centered, single column, all 3 sections visible
- [ ] Progress indicator shows Step 1 active
- [ ] All 8 required fields render with correct input types
- [ ] Dropdowns populate from `form-options.ts` arrays
- [ ] "Other" impetus shows conditional textarea
- [ ] Optional section collapses/expands
- [ ] Chip selects toggle correctly (single select, visual feedback)
- [ ] Tag inputs accept typed entries with Enter, show removable pills
- [ ] Validation fires on blur with red border + message
- [ ] Submit button disabled until all required fields valid
- [ ] Click submit navigates to Document Upload
- [ ] All styling matches design tokens — no invented colors
- [ ] Mobile: stacks to single column, 48px touch targets
