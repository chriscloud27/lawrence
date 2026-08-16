# Source: Doris School Directory

**Base URL:** `https://www.doris.school/schools/{country}/{school-slug}`  
**Example:** `https://www.doris.school/schools/united-kingdom/st-edwards-school`

## What It Provides

Doris is an international school directory. Each school page contains:

- Core identity: name, slug, founded year, official website
- Location: full address, lat/lng
- Profile: school type, governance, religious affiliation, gender policy, boarding/day
- Academics: curricula, instruction languages, strengths, SEN support
- Fees: tuition by year group, registration fee, enrollment deposit, additional fees
- Admissions: entry points with deadlines and place counts
- Social links: Instagram, LinkedIn, Facebook

## Scraping Notes

- Pages may be JavaScript-rendered. If the HTML body is thin/empty, the LLM extraction will return `{"error": "js_rendered"}` — route these to a headless browser fallback queue.
- Use HTTP `ETag` header for change detection where available; fall back to MD5 of the body (`content_hash`).
- Truncate HTML to ~12,000 characters before passing to the extraction agent (≈3,000 tokens for gpt-4o-mini).
- JSON-LD `dateModified` field, if present, maps to `schools.last_modified_at`.
- **Live automated fetch is blocked (confirmed 2026-08-16).** `doris.school` sits behind a
  Cloudflare bot challenge ("Just a moment..." interstitial) that returns HTTP 403 to both a
  plain HTTP fetch and a patchright/Playwright headless browser — this is active bot detection,
  not the JS-rendering case above, and a headless-browser fallback does not get past it.
- **Manual-import fallback:** save the rendered page as HTML from a real browser (Cmd+S /
  "Webpage, Complete") into `.claude/docs/data/sources/html-saved/`, then extract the
  `<script type="application/ld+json">` block — Doris embeds full structured data there
  (name, address, geo, fees as `makesOffer`, `dateModified`, etc.), which maps directly onto
  the `schools`/`school_fees` schema without needing the rest of the HTML. Compute `content_hash`
  as the MD5 of the saved HTML file. See `.claude/docs/data/sample-records/` for five records
  built this way from real Bangkok school pages.

## Extraction Agent

System prompt: `src/agents/prompts/school-extraction.txt`  
Model: `gpt-4o-mini` · Temperature: `0`  
Output schema: see `db-tables.md` and `schemas/schools-enums.json`  
Sample output: `sample-records/st-edwards-school.json`

## Cost Estimate

- ~3,000–4,000 input tokens + ~600–900 output tokens per school
- ~$0.001–0.002 per school with gpt-4o-mini
- 1,000 schools: ~$1–2 per full scrape run
- Weekly delta (~10–15% changed): ~$0.10–0.30/week
