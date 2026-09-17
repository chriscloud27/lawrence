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

## Stage 1: Pre-Qualification (0–67 achievable, TypeScript)

> **Nominal maximum is 75 — three dimensions at 25 — but the scorer's keyword constants cap
> timeline at 23, budget at 22 and authority at 22, so the achievable ceiling is 67.** This is not a
> detail: a Stage-1 gate set above 67 can never fire. See [ADR-0017](../docs/adr/0017-bant-routing-thresholds.md).

Keyword matching over the parent's latest message, no model call. Lives in
`src/Chatbot/lib/bant/keywords.ts` (`scoreStage1`) since [ADR-0018](../docs/adr/0018-chat-agent-in-typescript.md)
— it was a Code node in `bant-prequalify.json`, which is deleted.

**Negations are checked first in every chain, and patterns are anchored on word boundaries.** The
n8n version ordered each chain strongest-match-first over raw substrings, so `"my decision"` matched
inside `"not my decision"` and a parent disqualifying themselves scored 22 of 25 on authority.
`keywords.test.ts` is what stops that coming back — run `npm test` in `src/Chatbot`.

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

**One gate, not two** ([ADR-0017](../docs/adr/0017-bant-routing-thresholds.md)). Stage 1 decides
only whether the AI conversation continues. It never escalates to a human, because **Need** — a
quarter of the final score — is not measured until Stage 2, and a lead escalated without it reaches
a counsellor who does not know what the call is about.

| Tier | Score | Routing | Action |
|------|-------|---------|--------|
| Low-fit | < 25 | Standard resources tier | Send information article + resource links; no agent contact |
| Qualifying | ≥ 25 | AI consulting path | Trigger AI Agent node for 2–3 BANT follow-ups; re-score to 0–100 |

Scores accumulate across turns (`Math.max` against `previousBreakdown`), so `< 25` is a "not yet",
not a verdict — a later turn can lift the same parent into the qualifying tier.

`BANT_LOW_THRESHOLD = 25` is the only threshold Stage 1 reads. `BANT_MEDIUM_THRESHOLD` and
`BANT_HOT_THRESHOLD` belong to Stage 2 below.

---

## Stage 2: Refined Scoring (0–100 pts via AI Agent)

**Trigger:** Any lead scoring ≥ 25 at Stage 1. This is where every routing decision that costs a
human anything is made, because it is the only score with all four dimensions.

**Process:** a model rates all four dimensions **absolutely** over the conversation so far, using
`src/agents/prompts/bant-delta.txt` — the same file `promptfooconfig.yaml` grades. In the 50–75
band the same prompt runs again on `modelFor("bant_refine")` (Sonnet), because that is the band
where the decision costs a person real time and is genuinely close.

> **It scores the PARENT's words, and only those.** The n8n `re-scoreJS` node opened with
> `const aiReply = $json.reply.toLowerCase()` and matched every bonus against **the advisor's own
> reply** — so a warm turn mentioning September and entrance exams awarded the parent timeline +10
> and need 20 for saying nothing at all. `lib/bant/delta.ts` filters to `role === "user"` before
> the model sees anything. See ADR-0018, finding 3.

The delta also carries the lead profile — location, timeline, forcing function, child age, current
school, curriculum, budget — so one call produces both the score and what the counsellor needs to
open the conversation. Validated with Zod; malformed JSON logs the raw response and throws.

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

### Re-Scoring Logic

> **Historical.** The block below is the n8n `re-scoreJS` node, kept because it documents the
> additive-bonus model the rubric table above describes. It is **not** what runs: ADR-0018 replaced
> it with absolute model scoring in `lib/bant/`, and note that `aiAgentResponse` in this code is the
> *advisor's* reply, which is the bug.

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

The only thresholds applied to a complete four-dimension score, and the only ones that spend
counsellor time. Unchanged by ADR-0017 — `evals/assert-tier.js` asserts on exactly these.

| Score | Route | Action |
|-------|-------|--------|
| < 50 | Standard resources | Send information + resource links; no escalation |
| 50–75 | Booking link | Offer calendar booking + email option (AI Agent already engaged) |
| > 75 | Hot lead + escalation | Booking link + Gmail to admissions team |

---

## Example Pre-Qual Conversation

```
User: "Hi, we're thinking about boarding school for our daughter."
System Score: Timeline=8, Budget=20, Authority=0 (no authority signal) → Tier=Qualifying (28)

AI: "That's wonderful. Boarding school is such an important decision. 
     Are you leading the school search, or are you and your partner exploring together?"

User: "My wife and I are looking together. She's probably more involved, but we'll decide together."
System Score: Timeline=8, Budget=20, Authority=18 (joint signal) → Tier=Qualifying (46)

AI: "That's great — having both perspectives usually leads to better decisions. 
    When are you hoping to make a move to boarding school?"

User: "Probably next September for the new term. She's currently in Year 6."
System Score: Timeline=23, Budget=20, Authority=18 → Tier=Qualifying (61)
→ Route: AI Agent (≥ 25 pre-qual, further-qualification)

Response: "That's a clear timeline — gives you about 8 months. Tell me a bit more about what you're hoping she'll get out of the move..."
```

---

Routing tiers come from `agent_config.bant_thresholds`, not from a constant: a counsellor changes
them in Admin without a deploy (ADR-0018). `tierFor()` in `lib/bant/index.ts` applies them, and
`evals/assert-tier.js` asserts the same boundaries.

See `.claude/docs/implementation-plan-bant-v1.md` for the original n8n node configuration — historical
after ADR-0018.
