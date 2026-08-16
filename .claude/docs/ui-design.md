# UI Design Notes

## Device split in education

Parents researching schools skew mobile-first, evening usage (60–75% mobile for enquiry-stage traffic in this vertical). They arrive from Instagram/WhatsApp/Google, one-handed, often distracted, sometimes bilingual. Counsellors and agency staff are desktop-first, working hours, multi-tab, keyboard-driven.

That means two very different surfaces.

### Parent-facing (chatbot widget + landing)

- Mobile-first, thumb-reachable CTAs, bottom-anchored input
- Fast first paint (parents bounce in <3s on 4G)
- Minimal typing — tap-to-answer chips for BANT questions wherever possible
- Trust cues above the fold: school logo, accreditation, "your data stays private"
- Light mode default (parents don't expect dark on a school site); respect `prefers-color-scheme`
- Legible at arm's length: 16px+ base, high contrast, generous line-height
- Language toggle visible (EN/DE/ZH depending on client)

### Counsellor-facing (v2 dashboard)

- Desktop-first, information-dense, keyboard shortcuts
- Dark mode genuinely useful here (long sessions, evening triage)
- Fast filtering, sortable lead list, bulk actions
- Score visualization that's scannable in <1 second per row

## Recommendation: split the reference

Don't force one design language across both. Use Cal.com for parent-facing, Ashby for counsellor dashboard.

**Cal.com for the chatbot + landing surface** — their booking flow is the closest analog to what a parent does with Lawrence: a stranger, on mobile, being guided through 3–5 questions toward a scheduled conversation. Cal nails the calm progression, the "one question at a time" rhythm, generous tap targets, and a light default with a proper system-aware theme switch. Their color system (soft neutrals + one restrained accent per tenant) is also genuinely white-label-friendly — each school swaps the accent token and it just works.

**Ashby for the v2 dashboard** — their pipeline UI is structurally what you're building: scored candidates flowing through stages toward a human decision. Steal the lead-row density, the score pill, the side-panel detail view, and the stage progression. Ashby's dark mode is one of the better ones in SaaS — quiet, not OLED-black, easy on eyes for 8-hour use.

## On the theme switch

Three-way toggle (light / dark / auto) is table stakes now, but placement matters:

- **Parent widget:** auto only, no visible toggle (reduces cognitive load, respects OS)
- **Landing page:** toggle in footer, auto default
- **Dashboard:** toggle in top-right user menu, remembered per user

Use CSS custom properties + `prefers-color-scheme` with a `[data-theme]` override on `<html>`. Don't use pure black (`#000`) for dark mode — Ashby uses roughly `#0d0d0f` / `#18181b`, which is what you want. Pure black creates halation on OLED and looks cheap.
