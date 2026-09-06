# Step 01 — Shared Infrastructure

## Assumes

- React scaffold exists (Vite + React or Next.js)
- Design tokens applied in `src/styles/design-tokens.css` (all `--lw-*` vars)
- Inter + JetBrains Mono loaded via Google Fonts
- `lucide-react` installed

## Task

Create the data layer and shared utilities that every screen depends on.
Do not create any UI components yet — this step is types, data, and helpers only.

### 1. TypeScript Interfaces — `src/types/lawrence.ts`

```typescript
export type ScoreBand = "cold" | "warm" | "qualified" | "hot";
export type ParentStatus = "new" | "contacted" | "in-progress" | "auto-nurture";
export type FormStatus = "live" | "draft" | "ab-test";
export type DocStatus = "uploaded" | "processing" | "processed";

export interface BANTScore {
  budget: number;     // 0-25
  authority: number;  // 0-25
  need: number;       // 0-25
  timeline: number;   // 0-25
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  childName: string;
  childAge: number;
  yearGroup: string;
  timeline: string;
  budgetRange: string;
  impetus: string;
  currentCurriculum: string;
  boardingPreference: string;
  nationality: string[];
  preferredRegions: string[];
  learningDifferences: string;
  bant: BANTScore;
  totalScore: number;
  band: ScoreBand;
  status: ParentStatus;
  documents: Document[];
  criteria: Criterion[];
  preferences: string[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  filename: string;
  size: string;
  type: string;
  status: DocStatus;
  criteriaExtracted: number;
}

export interface Criterion {
  id: string;
  label: string;
  value: string;
  source: string;
  editable: boolean;
}

export interface Activity {
  id: string;
  timestamp: string;
  description: string;
}

export interface IntakeForm {
  id: string;
  name: string;
  fieldCount: number;
  submissions: number;
  completionRate: number;
  status: FormStatus;
  lastEdited: string;
  isDefault: boolean;
}
```

### 2. Mock Data — `src/data/mock-data.ts`

Create 6 sample parents spanning all 4 bands:

| Name | Child | Score | Band |
|------|-------|-------|------|
| Sarah Mitchell | James, 13 | 72 | qualified |
| Ahmed Al-Rashid | Layla, 16 | 84 | hot |
| Priya Sharma | Dev, 11 | 41 | warm |
| Tom Henderson | Olivia, 14 | 23 | cold |
| Maria Santos | Sofia, 9 | 67 | qualified |
| Chen Wei | Lucas, 15 | 38 | warm |

Sarah Mitchell is the "hero" parent — give her full data:
- 3 documents (PDF uploaded, audio processing, email uploaded)
- 4 criteria (Budget, Academic Focus, Special Requirements, Extracurriculars)
- 5 preferences ranked
- 4 activity entries
- BANT: budget 18, authority 22, need 15, timeline 17

All other parents need: name, email, child info, score, band, status,
timeline, updatedAt. No full criteria/documents needed.

Create 3 sample IntakeForms:
- "Standard Intake" — live, default, 8 fields, 847 submissions, 64%
- "Short Form — Boarding Only" — live, 5 fields, 123 submissions, 78%
- "University Pathway" — draft, 10 fields, 0 submissions

### 3. Score Helpers — `src/utils/score.ts`

```typescript
export function getScoreBand(score: number): ScoreBand
// <35 cold, 35-50 warm, 50-75 qualified, 75+ hot

export function getBandColor(band: ScoreBand): { dot: string; bg: string; text: string }
// Returns the correct hex values for current theme
// Light: cold #91919b/#f0f0f2, warm #f59e0b/#fef3c7,
//        qualified #1e3a5f/#e0e7f1, hot #f97316/#fff4ed
// Dark:  cold #71717a/rgba(113,113,126,0.12), warm #fbbf24/rgba(245,158,11,0.12),
//        qualified #7aa3d4/rgba(91,140,197,0.12), hot #fb923c/rgba(249,115,22,0.12)

export function getBandLabel(band: ScoreBand): string
// cold → "Cold", warm → "Warm", qualified → "Qualified", hot → "Hot"
```

### 4. Dropdown Options — `src/data/form-options.ts`

Export arrays for every dropdown in the intake form:
- `ageOptions`: ages 3–18 + "University entry"
- `timelineOptions`: This term / Next academic year / 2+ years away / Exploring options
- `budgetOptions`: Under £15K / £15–25K / £25–35K / £35–50K / £50K+ / Need financial aid / Prefer not to say
- `impetusOptions`: Relocation / Academic fit / Behavioural concerns / Special needs / Boarding readiness / International move / Other
- `curriculumOptions`: UK National / IB / IGCSE / US Curriculum / French / German / Other / Home-schooled / Not yet in school
- `boardingOptions`: Day / Boarding / Flexible / Not sure
- `learningOptions`: No / Yes — mild / Yes — significant / Prefer to discuss

## Do Not

- Create any React components
- Import or reference any UI library beyond lucide-react
- Add any CSS beyond what's in design-tokens.css
- Use localStorage

## Verify

- [ ] `lawrence.ts` exports all interfaces and types
- [ ] `mock-data.ts` exports `sampleParents` (array of 6) and `sampleForms` (array of 3)
- [ ] Sarah Mitchell has full data (documents, criteria, preferences, activities, BANT breakdown)
- [ ] `getScoreBand(72)` returns `"qualified"`, `getScoreBand(84)` returns `"hot"`
- [ ] `form-options.ts` exports 7 option arrays with correct values
- [ ] No React components exist yet
- [ ] Project compiles with `npm run build` (no type errors)
