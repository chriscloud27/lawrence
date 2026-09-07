# BANT Qualification Scoring

**Framework:** Budget, Authority, Need, Timeline  
**Scale:** 0–100 points (two stages)  
**Purpose:** Route parents to the right tier (standard resources, AI consulting path, or booking link + agent escalation)

**Intake-method-agnostic (ADR-0010):** This scoring engine operates on a `leads` row regardless
of whether it originated from the chatbot or the v2 structured intake form with document upload.
Signals from uploaded documents (voice notes, PDFs) feed the same Budget/Authority/Need/Timeline
dimensions below via profile extraction — do not build chatbot-conversation-only assumptions
(e.g. "the AI agent's follow-up turn") into scoring logic that must also run on form-sourced
profiles with no conversational turns at all.

---

## Stage 1: Pre-Qualification (0–75 pts via JavaScript)

Three lightweight pre-qual questions scored via keyword matching in JavaScript Code node.

### Dimensions (0–25 pts each)

| Dimension | 0–5 pts | 6–12 pts | 13–19 pts | 20–25 pts |
|-----------|---------|----------|-----------|-----------|
| **Timeline** | No mention / indefinite | 3+ months / exploring | 1–3 months | Urgent / 1 month / specific date |
| **Budget** | No context / budget-constrained | Public school only | Considering private school | Premium private or international |
| **Authority** | Not decision-maker | Consulting family | Joint decision (spouse/partner) | Lead decision-maker |

### Scoring Keywords

**Timeline scoring:**
- **20–25:** "next month", "urgent", "soon", "week", "semester starts", "September", "January"
- **13–19:** "few months", "spring", "next term", "end of year", "before next year"
- **6–12:** "exploring", "sometime", "eventually", "not sure"
- **0–5:** No mention, "just researching", "just looking"

**Budget scoring:**
- **20–25:** "premium", "private", "international school", "boarding", "selective", "top-tier"
- **13–19:** "considering private", "looking at both", "open to options"
- **6–12:** "public school", "state school", "cost-conscious", "budget matters"
- **0–5:** No mention, "very budget-limited", "cannot afford premium"

**Authority scoring:**
- **20–25:** "I decide", "I'm looking for", "I want", "my decision", "I lead"
- **13–19:** "we decide together", "with my spouse", "partner and I", "family consensus"
- **6–12:** "consulting with", "discussing with family", "getting input from"
- **0–5:** "spouse decides", "partner is leading", "not my decision"

### Routing Tiers (Post-Score)

| Tier | Score | Routing | Action |
|------|-------|---------|--------|
| Low-fit | < 50 | Standard resources tier | Send information article + resource links; no agent contact |
| Medium-fit | 50–75 | AI consulting path | Trigger AI Agent node for 2–3 BANT follow-ups; re-score to 0–100 |
| High-fit | > 75 | Hot lead + escalation | Booking link + notify admissions team via Gmail |

---

## Stage 2: Refined Scoring (0–100 pts via AI Agent)

**Trigger:** Only for 50–75 pre-qual band.

**Process:** AI Agent asks 2–3 conversational follow-ups targeting BANT gaps. JavaScript re-scoring node evaluates AI response and accumulates refined score.

### Refined Dimensions (Updated Scoring)

| Dimension | Base (Pre-qual) | AI Refinement | Total |
|-----------|---|---|---|
| **Timeline** | 0–25 | +5–10 bonus | 0–25 |
| **Budget** | 0–25 | +5–10 bonus | 0–25 |
| **Authority** | 0–25 | +5–10 bonus | 0–25 |
| **Need** (NEW) | — | 0–25 | 0–25 |

**Need dimension** = clarity on specific challenge (exam prep, admissions, relocation, special needs). Discovered through AI Agent conversation.

### Example Trajectories

| Scenario | Pre-qual | AI Adds | Refined | Route |
|----------|----------|---------|---------|-------|
| Relocating to HK, premium school, urgent | 72 | +10 | 82 | Hot lead |
| Exploring IGCSE, no timeline, budget unclear | 28 | — | 28 | Standard resources |
| A-level tuition, 6-week timeline, good budget, joint decision | 60 | +18 | 78 | Hot lead |
| Spouse leads, weak budget signal, exploratory | 47 | — | 47 | Standard resources |
| UK boarding school, premium budget, urgent | 68 | +22 | 90 | Hot lead |

### Re-Scoring Logic (JavaScript)

```javascript
// Input: aiAgentResponse (text) + originalBreakdown (scores from pre-qual)
// Output: refinedScore (0–100), breakdown (updated scores), escalated (boolean)

const refinedBreakdown = { ...originalBreakdown };

// Boost each dimension based on AI signals
if (aiAgentResponse.includes("premium") || aiAgentResponse.includes("invest")) {
  refinedBreakdown.budget = Math.min(25, originalBreakdown.budget + 8);
}

if (aiAgentResponse.includes("September") || aiAgentResponse.includes("IGCSE")) {
  refinedBreakdown.timeline = Math.min(25, originalBreakdown.timeline + 10);
}

if (aiAgentResponse.includes("i decide") || aiAgentResponse.includes("my decision")) {
  refinedBreakdown.authority = Math.min(25, originalBreakdown.authority + 8);
}

// New dimension: Need (exam, entrance, admissions clarity)
let needScore = 0;
if (aiAgentResponse.includes("exam") || aiAgentResponse.includes("entrance") || aiAgentResponse.includes("admissions")) {
  needScore = 20;
} else if (aiAgentResponse.includes("help") || aiAgentResponse.includes("support")) {
  needScore = 12;
} else {
  needScore = 5;
}

const refinedScore = Object.values(refinedBreakdown).reduce((a, b) => a + b, 0) + needScore;

return {
  score: Math.min(100, refinedScore),
  breakdown: { ...refinedBreakdown, need: needScore },
  escalated: refinedScore > 75
};
```

---

## Final Routing (Post-Refined Score)

| Score | Route | Action |
|-------|-------|--------|
| < 50 | Standard resources | Send information + resource links; no escalation |
| 50–75 | Booking link | Offer calendar booking + email option (AI Agent already engaged) |
| > 75 | Hot lead + escalation | Booking link + Gmail to admissions team |

---

## Example Pre-Qual Conversation

```
User: "Hi, we're thinking about boarding school for our daughter."
System Score: Timeline=8, Budget=20, Authority=0 (no authority signal) → Tier=Low (28)

AI: "That's wonderful. Boarding school is such an important decision. 
     Are you leading the school search, or are you and your partner exploring together?"

User: "My wife and I are looking together. She's probably more involved, but we'll decide together."
System Score: Timeline=8, Budget=20, Authority=18 (joint signal) → Tier=Medium (46)

AI: "That's great — having both perspectives usually leads to better decisions. 
    When are you hoping to make a move to boarding school?"

User: "Probably next September for the new term. She's currently in Year 6."
System Score: Timeline=23, Budget=20, Authority=18 → Tier=Medium (61)
→ Route: AI Agent (50–75 pre-qual band, further-qualification)

Response: "That's a clear timeline — gives you about 8 months. Tell me a bit more about what you're hoping she'll get out of the move..."
```

---

See `.claude/docs/implementation-plan-bant-v1.md` for phase-by-phase n8n node configuration and test cases.
