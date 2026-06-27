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
