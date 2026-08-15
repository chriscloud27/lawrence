# Implementation Plan: Two-Stage BANT Qualification (v1)

**Status:** v1 pre-qualification system + AI agent routing  
**Owner:** Chris Weber  
**Timeline:** 3 weeks to pilot deployment  
**Scope:** JavaScript pre-qual scoring (0–75 pts) + n8n Switch routing + AI agent for 35–50 band

---

## 1. Overview

Convert n8n workflow into **two-stage qualification**:

| Stage | Input | Scoring | Output |
|-------|-------|---------|--------|
| **Pre-qual** | 3 quick Qs | JS logic: 0–75 pts | Route by tier |
| **Further-qual** | Conversational probes | AI Agent + JS re-score | 0–100 pts → Lead action |

**Routing Tiers (Post-Scoring):**
- `< 35 pts` → Standard info (no counsellor contact)
- `35–50 pts` → AI consulting path (further-qualification)
- `50–75 pts` → Booking link + email option
- `75+ pts` → Hot lead flag + agent notification

---

## 2. Flow Diagram

```
User Message (Webhook)
        ↓
   [Pre-Qualification Stage]
        ↓
   Q1: Timeline/Urgency     → 0–25 pts
   Q2: Budget Signal        → 0–25 pts
   Q3: Authority/Need       → 0–25 pts
        ↓
   [Subtotal: 0–75 pts via JavaScript]
        ↓
    ╔═══════════════════════════════════════╗
    ║ TIER 1 SWITCH: Score-based Routing    ║
    ╚═══════════════════════════════════════╝
        ↓
    ├─ < 35? ──────→ [send-standard-info] ──→ End
    ├─ 35–50? ─────→ [AI Agent] ──────────→ Further-qualification
    ├─ 50–75? ─────→ [send-booking-link] ──→ End (with email option)
    └─ 75+? ───────→ [send-booking-link] ──→ [inform-agent] ──→ End
        
    [AI Agent Path: 35–50 only]
        ↓
    Conversational BANT follow-ups (2–3 Qs)
        ↓
    [JavaScript: Re-score to 0–100]
        ↓
    ╔═══════════════════════════════════════╗
    ║ TIER 2 SWITCH: Refined Score Routing  ║
    ╚═══════════════════════════════════════╝
        ↓
    ├─ < 50? ──────→ [send-standard-info] ──→ End
    ├─ 50–75? ─────→ [send-booking-link] ──→ End
    └─ 75+? ───────→ [send-booking-link] ──→ [inform-agent] ──→ End
```

---

## 3. n8n Node Architecture

### Current State
`chatbot-webhook` → `pre-qualify` (Code) → `store customer` (Sheet) → `Switch` (Rules mode)

### Target State (Phase 1 + 2)

```
chatbot-webhook
    ↓
[init-secrets] ← SET node: all credentials/config
    ↓
[pre-qualifyJS] ← NEW: JavaScript node
    ↓
[Switch1-tier1] ← NEW: Switch on score band
    ├─ output1 (<35): send-standard-info
    ├─ output2 (35–50): AI Agent node
    ├─ output3 (50–75): offer-booking-link
    └─ output4 (75+): offer-booking-link + [inform-agent]
    
[AI Agent] ← EXISTING, repurposed
    ↓
[re-scoreJS] ← NEW: JavaScript refinement (0–100)
    ↓
[Switch2-tier2] ← NEW: Final routing on refined score
    ├─ output1 (<50): send-standard-info
    ├─ output2 (50–75): offer-booking-link
    └─ output3 (75+): offer-booking-link + [inform-agent]
    
[send-standard-info] ← MODIFIED: setOutput with tier <50 message
[offer-booking-link] ← NEW: setOutput with booking CTA
[inform-agent] ← EXISTING: Gmail node
 
[store-customer-data] ← EXISTING: Append score to Sheet
```

---

## 4. Implementation Phases

### Phase 1: Pre-Qualification JavaScript (Week 1)

**Node:** `pre-qualifyJS` (Code node, JavaScript)

**Input:** `data.input.messages` (conversation array from chatbot)

**Output:** `{ score: 0-75, breakdown: {timeline, budget, authority}, tier: string }`

**Logic Template:**

```javascript
const userMessages = data.input.messages;

const scores = {
  timeline: 0,
  budget: 0,
  authority: 0
};

// Q1: Timeline
if (userMessages.some(m => m.toLowerCase().includes("next month") || m.toLowerCase().includes("urgent"))) {
  scores.timeline = 23;
} else if (userMessages.some(m => m.toLowerCase().includes("few months"))) {
  scores.timeline = 15;
} else if (userMessages.some(m => m.toLowerCase().includes("exploring"))) {
  scores.timeline = 8;
} else {
  scores.timeline = 2;
}

// Q2: Budget
if (userMessages.some(m => m.toLowerCase().includes("private") || m.toLowerCase().includes("premium"))) {
  scores.budget = 22;
} else if (userMessages.some(m => m.toLowerCase().includes("considering"))) {
  scores.budget = 12;
} else {
  scores.budget = 4;
}

// Q3: Authority
if (userMessages.some(m => m.toLowerCase().includes("i decide") || m.toLowerCase().includes("i'm looking"))) {
  scores.authority = 22;
} else if (userMessages.some(m => m.toLowerCase().includes("partner") || m.toLowerCase().includes("together"))) {
  scores.authority = 14;
} else if (userMessages.some(m => m.toLowerCase().includes("family") || m.toLowerCase().includes("consult"))) {
  scores.authority = 7;
} else {
  scores.authority = 2;
}

const prequalScore = scores.timeline + scores.budget + scores.authority;

return {
  score: prequalScore,
  breakdown: scores,
  tier: prequalScore < 35 ? "low" : prequalScore <= 50 ? "medium" : "medium_high"
};
```

---

### Phase 1b: Tier 1 Switch Node (Week 1)

**Node:** `Switch1-tier1` (Switch node, Rules mode)

**Input:** `score` from `pre-qualifyJS`

**Rules:**

| Condition | Output | Destination |
|-----------|--------|-------------|
| `score < 35` | output1 | `send-standard-info` |
| `score >= 35 AND score <= 50` | output2 | `AI Agent` |
| `score > 50 AND score < 75` | output3 | `offer-booking-link` |
| `score >= 75` | output4 | `offer-booking-link` + `inform-agent` |

---

### Phase 2: AI Agent Path (Week 2)

**Node:** `AI Agent` (@n8n/n8n-nodes-langchain.agent, typeVersion 3.1)

**Sub-node:** OpenAI Chat Model (via `ai_languageModel` connection type)

**Trigger:** Only when `Switch1-tier1` outputs output2 (score 35–50)

**System Message:**

```
You are a warm, experienced education advisor for Project Lawrence.

This lead scored 35–50 on initial qualification. 
Ask 2–3 focused BANT follow-up questions to clarify:
- Budget: "What's your budget for tutoring services?" (link context if helpful)
- Need: "What specific challenge are you trying to solve?" (IGCSE, admissions, relocation, etc.)
- Timeline: "Is there a specific deadline we're working toward?"

Be conversational, not interrogative. One question per turn.
After 2–3 exchanges, provide a brief summary of refined signals.

Keep it under 3 turns; handoff decision to JavaScript re-scoring.
```

---

### Phase 2b: Re-Score JavaScript (Week 2)

**Node:** `re-scoreJS` (Code node, JavaScript)

**Input:** `{ aiResponse, originalBreakdown, originalScore }` from AI Agent node

**Output:** `{ score: 0-100, breakdown: {timeline, budget, authority, need}, escalated: boolean }`

**Logic Template:**

```javascript
const aiResponse = data.input.aiResponse;
const originalBreakdown = data.input.originalBreakdown;

const refinedBreakdown = { ...originalBreakdown };

// Boost scores based on AI signals
if (aiResponse.toLowerCase().includes("premium") || aiResponse.toLowerCase().includes("invest")) {
  refinedBreakdown.budget = Math.min(25, originalBreakdown.budget + 8);
}

if (aiResponse.toLowerCase().includes("september") || aiResponse.toLowerCase().includes("exam")) {
  refinedBreakdown.timeline = Math.min(25, originalBreakdown.timeline + 10);
}

if (aiResponse.toLowerCase().includes("i decide") || aiResponse.toLowerCase().includes("my decision")) {
  refinedBreakdown.authority = Math.min(25, originalBreakdown.authority + 8);
}

// New dimension: Need
let needScore = 0;
if (aiResponse.toLowerCase().includes("exam") || aiResponse.toLowerCase().includes("entrance")) {
  needScore = 20;
} else if (aiResponse.toLowerCase().includes("help") || aiResponse.toLowerCase().includes("support")) {
  needScore = 12;
} else {
  needScore = 5;
}

const refinedScore = Object.values(refinedBreakdown).reduce((a, b) => a + b, 0) + needScore;

return {
  score: Math.min(100, refinedScore),
  breakdown: { ...refinedBreakdown, need: needScore },
  escalated: refinedScore >= 75
};
```

---

### Phase 2c: Tier 2 Switch (Week 2)

**Node:** `Switch2-tier2` (Switch node, Rules mode)

**Input:** `score` from `re-scoreJS`

**Rules:**

| Condition | Output | Destination |
|-----------|--------|-------------|
| `score < 50` | output1 | `send-standard-info` |
| `score >= 50 AND score < 75` | output2 | `offer-booking-link` |
| `score >= 75` | output3 | `offer-booking-link` + `inform-agent` |

---

### Phase 3: Output Nodes (Week 2–3)

#### send-standard-info (setOutput Node)

```
Response: "Thanks for reaching out! Here are some resources to explore:
- School Search Database: [link]
- Article Library: [link]
- Free Consultation Offer: [link]

Feel free to come back if you'd like to discuss further."
```

**Connection:** From `Switch1-tier1` (output1) and `Switch2-tier2` (output1)

---

#### offer-booking-link (setOutput Node)

```
Response: "Based on your needs, I'd recommend connecting with one of our advisors.

📅 Book a 30-min consultation: [booking-link]

Or, I can send you an email with recommended packages — would you like that? (Yes/No)"

If Yes → trigger [inform-agent] with lead data + booking preference
```

**Connection:** From `Switch1-tier1` (output3, output4) and `Switch2-tier2` (output2, output3)

---

#### inform-agent (Gmail Node)

```
To: admissions@lawrence-project.com
Subject: 🔥 Hot Lead: Score {{score}} — {{parentName}}

Body:
Lead Name: {{parentName}}
Score: {{score}} / 100
Breakdown:
- Timeline: {{breakdown.timeline}} / 25
- Budget: {{breakdown.budget}} / 25
- Authority: {{breakdown.authority}} / 25
- Need: {{breakdown.need}} / 25

Conversation Summary:
{{aiAgentNotes}}

Booking Status: {{bookingPreference}}

Next Action: Assign to counsellor within 2 hours
```

**Connection:** From `Switch1-tier1` (output4) and `Switch2-tier2` (output3)

---

### Phase 3b: Store Lead Data (Week 3)

**Update existing Google Sheet append:**

Add columns:
```
| parentName | score | breakdown_json | stage | timestamp | booking_link_clicked | email_sent |
```

**Connection:** After each final output (send-standard-info, offer-booking-link, inform-agent)

---

## 5. Testing & Acceptance Criteria

### Test Cases (10 sample conversations)

| Scenario | Expected Pre-Qual | Expected Refined | Expected Route |
|----------|----------|-----------|----------|
| Parent relocating to HK, premium school, urgent | 72 | 82 | Hot lead → agent |
| Exploring IGCSE, no timeline, budget unclear | 28 | 35 | Standard info |
| A-level tuition in 6 weeks, good budget, joint decision | 42 | 58 | Booking link |
| Spouse leads decision, weak budget signal, exploratory | 35 | 44 | AI agent → standard |
| UK boarding school, premium budget, urgent | 68 | 88 | Hot lead → agent |
| Uncertain about private vs public, 2+ years | 24 | 32 | Standard info |
| Premium school, joint decision, timeline unclear | 50 | 62 | Booking link |
| Urgent need but budget-constrained | 38 | 48 | AI agent → standard |
| Clear premium + urgent + authority, needs exam help | 78 | 92 | Hot lead → agent |
| Just researching, exploring options | 12 | 20 | Standard info |

### Acceptance Criteria

- [ ] All 10 test conversations route correctly
- [ ] Score breakdowns match rubric (see `.claude/rules/bant-scoring.md`)
- [ ] Email notifications send to admissions@
- [ ] Booking links in outbound messages are clickable
- [ ] Google Sheet captures all lead data
- [ ] AI agent only triggers for 35–50 pre-qual band
- [ ] No duplicate messages sent
- [ ] Pre-qual score distribution: not all high, not all low

---

## 6. Deployment & Rollout

### Pre-Deployment
- [ ] Deploy workflow to n8n sandbox
- [ ] Test with 5 pilot conversations
- [ ] Review email outputs and formatting
- [ ] Confirm booking link routing

### Pilot Phase 1 (Single Agency, 5 days)
- [ ] Deploy to production with 1 partner agency
- [ ] Monitor: 20+ conversations
- [ ] Collect feedback on score accuracy
- [ ] Adjust system instructions if needed

### Pilot Phase 2 (Expanded, 2 weeks)
- [ ] Roll out to 2–3 agencies
- [ ] Monitor conversion: booking link clicks → calls booked
- [ ] Track "hot lead" accuracy: 75+ score → actual enrollment rate
- [ ] Iterate on scoring thresholds

### Full Deployment
- [ ] Document scaling strategy
- [ ] Create ops runbook for admissions team
- [ ] Plan v2 dashboard

---

## 7. Success Metrics

### v1 Acceptance
- Workflow processes messages without error
- Scores distribute across all 4 tiers
- AI agent triggers only for 35–50 band
- Email notifications land correctly
- Avg time-to-score: <2 sec per message

### Pilot Validation
- 75+ leads convert at >60% rate (booking → call scheduled)
- <35 leads rarely return (acceptable churn)
- 35–50 leads benefit from AI probe (per feedback)

### Operational Health
- No workflow crashes or hangs
- Email delivery >98%
- Booking link redirect working

---

## 8. Files to Update/Create

### New Nodes to Create
- [ ] `pre-qualifyJS` (Code)
- [ ] `Switch1-tier1` (Switch, Rules mode)
- [ ] `re-scoreJS` (Code)
- [ ] `Switch2-tier2` (Switch, Rules mode)
- [ ] `send-standard-info` (setOutput)
- [ ] `offer-booking-link` (setOutput)

### Nodes to Repurpose
- [ ] `AI Agent` — modify system message
- [ ] `inform-agent` (Gmail) — add to Switch2 output3
- [ ] `store-customer-data` (Sheet) — update schema with score columns

### Nodes to Archive
- [ ] `pre-qualify` (old Code node) — replace with `pre-qualifyJS`

---

## 9. Reference Documentation

- **BANT Rubric:** `.claude/rules/bant-scoring.md`
- **AI Persona & Conversation Flow:** `.claude/rules/chatbot.md`
- **n8n Configuration:** `.claude/rules/n8n-workflows.md`
- **Secrets Management:** `.claude/rules/n8n-workflows.md` (SET node pattern)
- **Known Constraints:** `.claude/projects/.../memory/n8n-stack-decisions.md`

---

## 10. Known Constraints & v2 Deferrals

**v1 Scope:**
- 3 static pre-qual questions
- Binary keyword matching (no NLP)
- Single n8n instance
- Email-based handoff only
- No retry logic or error recovery

**Deferred to v2:**
- Conversational question sequencing (adaptive Q flow)
- Sentiment analysis
- Multi-channel handoff (Slack, WhatsApp, Calendly)
- Lead scoring dashboard
- Admin audit trail
- A/B testing different score thresholds

---

**Document Version:** 1.0  
**Last Updated:** 15 Aug 2026  
**Next Review:** End of Week 2 (pilot feedback)
