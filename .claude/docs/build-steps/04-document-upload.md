# Step 04 — Document Upload

## Assumes

- Steps 01–03 complete: intake form navigates to this screen on submit
- Sidebar "Document Upload" is the active item when this screen shows

## Task

Replace the Document Upload placeholder with Screen 1.2. This is the
parent's second step after the intake form.

### Layout

Same centered column as the intake form: max-width 560px, card wrapper,
32px padding.

### Progress Indicator

Same component as Step 03 but now circle 2 is filled `--lw-accent`,
circle 1 shows a checkmark icon (Lucide `Check`) in `--lw-success`.

### Header Copy

"You've probably already done a lot of research. Share it with us — we'll
use it to build your personalised school search profile."

Font: Inter 400 16px, `--lw-text-secondary`. Margin-bottom: 24px.

### Upload Zone

Large dashed-border area:
- Min height: 200px
- Border: 2px dashed `--lw-border`, 12px radius
- Background: `--lw-bg-subtle`
- Hover/drag-over: border color changes to `--lw-accent`, background to
  `--lw-accent-subtle`

Centered content (vertically + horizontally):
- Lucide `Upload` icon, 32px, `--lw-text-muted`
- "Drag files here or tap to browse" — Inter 500 16px, `--lw-text`
- "PDFs, Word docs, images, voice notes, emails — anything you've collected"
  — Inter 400 13px, `--lw-text-muted`

Clicking the zone opens a file picker (hidden `<input type="file" multiple>`).
This is a prototype — file selection doesn't actually process files.

### Pre-Populated File List

Show 3 sample files below the upload zone (simulating already-uploaded files):

```
[FileText]  school-brochure-harrow.pdf     2.4 MB    [✓ Uploaded]   [× Remove]
[Mic]       voice-note-what-we-want.m4a    1.1 MB    [⟳ Processing] 
[Mail]      email-from-consultant.eml      340 KB    [✓ Uploaded]   [× Remove]
```

Each file card:
- Row layout: icon (20px, mapped by type) | filename (Inter 400 14px) |
  size (Inter 400 13px, `--lw-text-muted`) | status pill | remove button
- Background: `--lw-bg-card`, 8px radius, padding 12px 16px
- Status pill: "Uploaded" = `--lw-success` dot + text; "Processing" = 
  `--lw-warning` dot + text with subtle pulse animation on the dot
- Remove button: Lucide `X`, 16px, `--lw-text-muted`, ghost style
- Processing files don't show remove button
- Gap between file cards: 8px

"Add more files" link below the list — Inter 500 14px, `--lw-accent`, with
`Plus` icon.

### Action Buttons

Two buttons below the file list, 24px gap above:
- Primary: "Build my profile" — full width, accent style
- Secondary: "Skip for now" — full width, secondary style (transparent bg,
  border)

### Processing State

When "Build my profile" is clicked, replace the entire card content with a
processing view:

- Centered spinner (CSS only, accent color, 32px)
- "We're reading through your documents and building your profile. This
  usually takes 1–2 minutes." — Inter 400 14px, `--lw-text-secondary`
- Three status lines that animate in sequence (1s delay between each):
  1. "Reading your documents..." → after 1.5s: "Documents processed ✓"
  2. "Identifying your preferences..." → after 1.5s: "Preferences extracted ✓"
  3. "Building your search profile..." → after 1.5s: "Profile ready ✓"
- Pending: `--lw-text-muted`, active: `--lw-text`, complete: `--lw-success`
  with `CheckCircle` icon
- After all three complete (4.5s total), auto-navigate to My Search Profile

"Skip for now" navigates directly to My Search Profile without the
processing animation.

## Do Not

- Actually upload or process files
- Use any file processing libraries
- Store file data in state beyond the sample list
- Add drag-and-drop functionality (dashed border + hover state is enough)

## Verify

- [ ] Progress indicator shows Step 2 active, Step 1 complete
- [ ] Upload zone renders with dashed border, icon, and copy
- [ ] Upload zone hover changes border + background color
- [ ] 3 sample files display with correct icons, sizes, status
- [ ] Processing file shows animated dot, no remove button
- [ ] "Build my profile" triggers processing animation sequence
- [ ] Status lines animate in correct order with correct timing
- [ ] Auto-navigates to Search Profile after animation completes
- [ ] "Skip for now" navigates immediately without animation
- [ ] All styling uses design tokens
- [ ] Mobile: file cards stack naturally, buttons full width
