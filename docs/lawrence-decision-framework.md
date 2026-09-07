Project Lawrence — Decision Framework
Author: Chris Weber · Date: August 2026 · Status: Internal planning document Version: 1.0 — Pre-MVP


PART 1: TL;DR — Why This Business Model Gets You There (and Why It's Not a Wrapper)
The model in one paragraph
Lawrence is a white-label AI admissions chatbot sold B2B2C to education agencies (ICEF, IECA, BSA, AEGIS, FOBISIA networks). Agencies are the paying customer; parents see the agency's brand, not Lawrence's. Revenue comes from a hybrid of base subscription (€300–800/month per agency) plus a per-hot-lead fee (€15–40 per BANT-qualified lead scoring ≥75). This hybrid mirrors the Sierra/Decagon pattern — Sierra charges ~$1.50/resolved interaction on top of a platform fee — and it does two critical things simultaneously: it gives you predictable recurring revenue (the subscription) and ties your upside to the value you actually deliver (the lead fee), while protecting your margin against OpenAI token costs because every expensive API call generates attributable revenue.
Why this avoids the Jasper trap
Jasper's moat was "nice prompts on top of GPT." When GPT got good enough for direct use, Jasper's revenue fell >50% in a year. Lawrence has three structural defenses that Jasper lacked:

The BANT scoring methodology is proprietary and domain-specific. A two-stage qualification system (0–75 pre-qual on budget/authority/need/timeline, then 0–100 refined scoring) trained on education-agency conversion data cannot be replicated by prompting a general-purpose model. The scoring weights, thresholds, and routing rules are the product — not the LLM call underneath. Every agency that uses Lawrence feeds placement-outcome data back into the scoring model, widening the accuracy gap over time.

The data flywheel compounds. Every parent conversation, every lead score, every conversion/non-conversion outcome becomes training data for better qualification. After 12 months with 30 agencies, Lawrence has a dataset of education-buyer intent signals that no competitor can buy, scrape, or prompt-engineer. This is the same dynamic that makes Harvey defensible in legal AI — the workflow data, not the model, is the moat.

White-label creates structural switching costs. Lawrence sits behind the agency's brand, inside their website, connected to their Google Sheets CRM and Gmail handoff workflows. Ripping it out means reconfiguring their entire lead pipeline. That's a Vanta-style "compliance-as-mandatory-spend" lock-in: once it's wired into daily operations, churn drops below 5% because the cost of switching exceeds the cost of staying.

None of these are true for a generic "AI chatbot for websites." All three are true for a vertical agent with proprietary scoring, outcome feedback, and workflow integration in a specific industry.
Stress-test: does the math work for your 2031 numbers?
The honest answer is: yes, but only on the concentration path — not the portfolio path.

Here's the arithmetic. Your target is €50K/month personal passive income by 31.12.2031. "Passive" means a team runs Lawrence day-to-day. That team costs money. Working backward:

€50K/month personal extraction requires the company to generate roughly €80–100K/month in gross profit (to cover a 3–5 person team at €15–25K/month total payroll plus your extraction).
At 70–75% gross margin (realistic for a vertical SaaS with managed AI costs — above the 50–60% Bessemer AI average because you're pricing the lead fee through, but below the 80–90% traditional SaaS benchmark because GPT-4o tokens are real cost), €80–100K gross profit requires €110–140K/month revenue.
€110–140K/month = €1.3–1.7M/year ARR. At your hybrid pricing, that looks like: 120–180 paying agencies × €500/month base subscription (€60–90K/month) + the same agencies generating ~50 hot leads/month each × €25/lead (€150–225K/month from lead fees). Blended: ~€210–315K/month at scale. The lead fee does the heavy lifting. At 150 agencies generating 50 hot leads/month at €25/lead, that's €187K/month in lead fees alone — more than enough.
150 paying agencies out of ~22,000 globally (per ICEF's count) is 0.7% market penetration. Out of the ~2,500 ICEF-accredited quality tier, it's 6%. In five years, with a product that demonstrably increases enrollment conversion, this is ambitious but structurally plausible.

The $10M net worth target maps if Lawrence is bootstrapped (you own ~100%) and the company reaches €1.5M+ ARR. Vertical SaaS companies trade at 5–10x ARR in private markets. At 7x of €1.5M = €10.5M enterprise value. That's your net-worth target.

Why the portfolio path doesn't get you there: Two micro-SaaS products at €15K MRR each = €30K/month gross. After costs, personal extraction is €15–20K/month — meaningful, but not €50K. And neither product alone would reach the valuation multiple to hit $10M net worth. The portfolio path is a good fallback if Lawrence doesn't find PMF, but it's not the primary plan.

One paragraph on founder psychology, then we move on. The tension in your goals — "passive income" versus "recognized thought leader" versus "$10M net worth" — is not a contradiction, but it's a sequencing problem. You can't get passive income from Lawrence until you've built the team that runs it, and you can't build that team until Lawrence generates enough revenue to fund it. The first 18–24 months are not passive. They're the hardest, most active work. The discipline is in knowing that the active phase is finite and that the architecture you're building (white-label, self-serve onboarding, automated BANT scoring) is specifically designed to make the business less dependent on you over time. "Passive" is the destination, not the journey.


PART 2: Roadmap — September 2026 to December 2031
Phase 0: MVP + First Pilots (Sep 2026 – Mar 2027)
Revenue milestone: €0 → first paying pilot (€200–500/month) Team: Chris solo + contractors (design, copywriting) Product scope: v1 chatbot on agency website (n8n self-hosted + GPT-4o), BANT pre-qualification (0–75 score), Google Sheets CRM output, Gmail notification to counsellor when lead scores ≥60. White-label branding. Single-language (English). MRR / margin: <€1K MRR. Margin irrelevant at this scale — focus is on learning, not profit. Concentration trigger: N/A — too early to measure. Lawrence is one of your portfolio bets. Biggest risk: Product-market fit. Education agencies may not see "AI chatbot qualification" as a problem worth paying for. Many agencies are small operations (sole traders in South Asia, Southeast Asia, Africa) running on WhatsApp and personal relationships. Your real ICP isn't all 22,000 agents — it's the ~2,500 ICEF-accredited ones and the ~500–1,000 who serve premium boarding schools (BSA, AEGIS, FOBISIA) where parents have budget and agencies have enough volume to justify software.

What to validate:

Do agencies actually embed the chatbot? (Activation risk > acquisition risk at this stage.)
Does the BANT scoring match human judgment? Run 100 conversations, have the agency's counsellors independently score, compare.
What's the conversation-to-hot-lead conversion rate? If <5% of conversations produce a ≥75 score, the scoring is too aggressive or the chatbot isn't asking the right questions.

Business model ingredient doing the work: Freeterprise pilot funnel. Give away 2–4 months free to 5–10 agencies from your ICEF/BSA network. The pilot is the sales tool.


Phase 1: Product-Market Fit + First Revenue (Apr 2027 – Dec 2027)
Revenue milestone: €2K–8K MRR (10–20 paying agencies) Team: Chris + 1 part-time ops/CS hire (€2–3K/month) Product scope: Refined BANT scoring with outcome feedback (did the hot lead actually enroll?), basic analytics dashboard for agencies ("you had 340 parent conversations, 47 hot leads, 12 enrollments this month"), multilingual chatbot (English + Mandarin + Arabic cover ~70% of international student parent conversations), n8n workflow library (templates for different agency types). MRR / margin: €5K MRR target by Dec 2027. Gross margin target: 65–70% (GPT-4o costs ~€500–800/month across all agencies at this scale; subscription + lead fees should cover 3x that). Concentration trigger check: At €5K MRR, Lawrence is still in portfolio territory (€5–20K MRR band). Keep the second micro-SaaS idea alive but don't start building it yet — all energy into Lawrence until PMF is proven or disproven.

Biggest risk: Churn. Education is seasonal (enrollment peaks in Jan–Mar for September intake, Jul–Sep for January intake). Agencies may cancel during low seasons. Counter: annual contracts with monthly payment (lock in for 12 months, bill monthly) and a dashboard that shows ROI even in slow months ("your chatbot handled 120 conversations while your office was closed for holidays").

Business model ingredient doing the work: Hybrid pricing kicks in. Base subscription provides floor; per-hot-lead fee starts generating real revenue as agencies see conversion data. The outcome feedback loop (enrollment data flowing back) begins differentiating Lawrence from generic chatbots.


Phase 2: Scale to Multi-Agency + Pricing Power (Jan 2028 – Dec 2028)
Revenue milestone: €15K–30K MRR (40–80 paying agencies) Team: 3 people — Chris (product/sales), 1 full-time ops/CS, 1 part-time engineer Product scope: Self-serve onboarding (agency signs up, pastes embed code, configures branding — no Chris involvement), CRM integrations beyond Google Sheets (HubSpot, Salesforce — the larger agencies use these), refined BANT scoring v2 trained on 12+ months of outcome data, agency-to-agency benchmarking ("your conversion rate is 14%, top-quartile agencies on Lawrence convert at 22% — here's what they do differently"), introduction of tiered pricing:

Tier
Base/month
Included hot leads
Overage per lead
Starter
€300
20
€25
Growth
€600
50
€20
Enterprise
€1,200
150
€15


MRR / margin: €20K MRR target by Dec 2028. Gross margin target: 70–75%. At 60 agencies averaging €333/month in base + €200/month in lead fees = €533/agency = €32K MRR. Token costs ~€3–5K/month at this volume. Gross margin: ~73%. Concentration trigger check: This is the decision point. If Lawrence crosses €20K MRR with <5% monthly churn and >110% NRR (agencies upgrading tiers + lead volume growing), abandon the portfolio approach. Go all-in. If Lawrence is stuck at €10–15K MRR with >8% churn, it's a lifestyle micro-SaaS — run it as one of two portfolio products and start building the second.

Biggest risk: Competition. By 2028, someone else will have noticed that education agencies need AI lead qualification. Your defense: 18+ months of BANT scoring data, 40–80 agency integrations, and outcome-trained models. A new entrant starts at zero data. But if a well-funded horizontal player (Intercom, HubSpot, Drift successor) adds education-specific templates, they have distribution you don't. Counter: go deeper into the vertical (placement matching, school-side tools) faster than they can specialize.

Business model ingredient doing the work: Self-serve onboarding + tiered pricing = PLG growth without proportional sales effort. The benchmarking feature ("your peers convert better — here's how") drives NRR expansion as agencies move to higher tiers.


Phase 3: Platform Foundation + Team Build (Jan 2029 – Dec 2029)
Revenue milestone: €50K–80K MRR (120–200 agencies) Team: 5–6 people — Chris (CEO/product, shifting toward strategic), Head of CS, 2 engineers, 1 sales/partnerships, 1 ops Product scope: School-side tools emerge: schools (the institutions agencies place students into) get a read-only "Lawrence Insights" dashboard showing lead quality and conversion data from agencies that refer to them. This is the first half of the platform play — you now have both sides of the marketplace on your software. Agency referral program (agency invites agency, both get 1 month free). API for agencies with custom tech stacks. GDPR compliance toolkit (data residency controls, consent management, audit logs) — this becomes a procurement requirement for EU agencies and a competitive moat against US-only competitors.

MRR / margin: €60K MRR target by Dec 2029. Gross margin: 72–76%. Team payroll is ~€25K/month. Net profit to Chris: ~€15–20K/month after team costs. Not yet €50K, but the structure is building. Concentration trigger check: At €60K MRR, you're well past the concentration threshold. This is now a concentration play. No second micro-SaaS. All energy here.

Biggest risk: Hiring. You need to find people who can run operations and CS without you. The first non-Chris hire in a customer-facing role is the highest-risk decision in the roadmap. Hire wrong and churn spikes. Counter: hire from within the education agency world — someone who's been an agency counsellor and understands the ICP's daily work.

Business model ingredient doing the work: The platform network effect begins. Schools want to see which agencies send the best-qualified students. Agencies want to show schools their Lawrence-verified lead quality. Both sides pull each other onto the platform. This is the moat that a generic chatbot can never build.


Phase 4: Passive Transition + Platform Flywheel (Jan 2030 – Dec 2030)
Revenue milestone: €100K–140K MRR (250–400 agencies, 50–100 schools on Insights) Team: 7–8 people — Chris steps back to strategic/board role. Head of CS becomes de facto COO. Second engineer becomes tech lead. Product scope: Full platform: agencies list on a Lawrence-powered directory visible to schools and parents. Outcome-verified agency ratings (based on actual placement data flowing through Lawrence). School-side paid tier: schools pay for premium placement in the directory + advanced analytics on which agencies perform best for their institution. Marketplace dynamics begin: agencies pay more because Lawrence has school-side data, schools pay because Lawrence has agency-side performance data.

MRR / margin: €120K MRR target by Dec 2030. Gross margin: 74–78% (platform features are higher-margin than chatbot — no per-conversation token cost on dashboards/analytics). Team payroll ~€35–40K/month. Net to Chris: ~€35–45K/month. Getting close to target. Concentration trigger check: N/A — fully concentrated. The question now is: stay bootstrapped at this margin, or raise a small round (€1–3M) to accelerate to 1,000+ agencies and a €20M+ valuation?

Biggest risk: Platform transition. Moving from "tool that agencies use" to "platform that agencies and schools both depend on" is a product-strategy leap. Many B2B SaaS companies fail here because the second side (schools) has different needs, different sales cycles, and different willingness to pay. Counter: start school-side as free/read-only (Insights dashboard) and only monetize once 50+ schools are actively using it.

Business model ingredient doing the work: Two-sided network effects + school-side revenue. This is the point where Lawrence stops being a chatbot and becomes the operating system for education agency–school relationships. Revenue diversifies: ~60% agency subscriptions + lead fees, ~20% school-side analytics, ~20% marketplace/directory.


Phase 5: Target State — Investor Posture (Jan 2031 – Dec 2031)
Revenue milestone: €150K–200K MRR = €1.8–2.4M ARR (400–600 agencies, 100–200 schools) Team: 8–10 people. Chris is investor-operator: board seat, quarterly strategy, no daily ops. Product scope: Stable platform. Agencies, schools, and parents all interact through Lawrence. AI matching (Lawrence recommends which agency is best for a given parent's needs based on outcome data). White-label marketplace can be deployed for specific networks (e.g., a BSA-branded version, a FOBISIA-branded version).

MRR / margin: €170K MRR. Gross margin: 76–80%. Team payroll: €40–50K/month. Net to Chris: €50–70K/month in distributions/salary. Net worth check: At €2M ARR, bootstrapped, 76–80% gross margin, growing 30–40% YoY → enterprise value 6–10x ARR = €12–20M. Chris owns ~100%. The $10M net worth target is met on paper (enterprise value) and approaching in realized cash (cumulative distributions of €300–500K over 2029–2031 plus current income).

Biggest risk at this stage: Complacency. The business is profitable and you're extracting €50K+/month. The temptation is to coast. But the platform's network effects are either compounding (more agencies → better data → better schools → more agencies) or decaying (agencies leave, data stales, schools lose interest). There's no steady state. Counter: the team you've built must have equity-aligned incentives to keep growing.


Roadmap reality check — three honest flags
Flag 1: The timeline is aggressive but not delusional. Going from zero to €2M ARR in 5 years in vertical SaaS is top-decile performance. Vanta did it (~$300M ARR in ~7 years, but with $200M+ in funding). n8n did it (€7.2M → €40M+ in a year, but open-source viral distribution). Legora did it faster ($1M → $100M in 18 months, but with massive venture backing). Lawrence is bootstrapped, in a smaller TAM, with a solo founder. Expect the real timeline to be 6–7 years to the €2M ARR target, not 5. That means the €50K/month passive income target is more likely mid-2032 than end-2031. This is still an extraordinary outcome.

Flag 2: The 150-agency milestone (Phase 2–3) is the make-or-break. Below 150 paying agencies, the data flywheel doesn't spin fast enough to be a moat, the team can't be funded, and the platform play doesn't have enough liquidity. Above 150, everything compounds. Every decision in Phases 0–2 should be evaluated against: "does this get me to 150 faster or slower?"

Flag 3: The "passive" transition is a 6–12 month process, not a switch. You don't go from founder-operator to investor-operator overnight. The Phase 4 transition (2030) needs to start with documenting every process you do, then hiring someone to shadow you for 3–6 months, then stepping back gradually. Budget for this.


PART 3: Architecture Overview — How Lawrence Is Built, Sold, and Scaled
Stage 1: MVP Architecture (Sep 2026 – Dec 2027)
                    ┌──────────────────┐

                    │  Agency Website   │

                    │  (embed snippet)  │

                    └────────┬─────────┘

                             │ chat widget (iframe/JS)

                             ▼

                    ┌──────────────────┐

                    │   Lawrence Chat   │

                    │   (hosted app)    │

                    │   White-label UI  │

                    └────────┬─────────┘

                             │

                ┌────────────┼────────────┐

                ▼            ▼            ▼

        ┌──────────┐ ┌────────────┐ ┌──────────┐

        │  GPT-4o  │ │  n8n Self- │ │  BANT    │

        │  API     │ │  Hosted    │ │  Scoring │

        │          │ │  Workflows │ │  Engine  │

        └──────────┘ └─────┬──────┘ └──────────┘

                           │

              ┌────────────┼────────────┐

              ▼            ▼            ▼

        ┌──────────┐ ┌──────────┐ ┌──────────┐

        │  Google  │ │  Gmail   │ │  Agency  │

        │  Sheets  │ │  Notif.  │ │  Config  │

        │  CRM     │ │  Handoff │ │  Store   │

        └──────────┘ └──────────┘ └──────────┘

Tech stack: n8n (self-hosted on Hetzner/EU for data sovereignty), GPT-4o via API, simple hosted chat widget (React), Google Sheets API, Gmail API. Total infra cost: ~€50–100/month.

What's the moat at this stage?

Honestly? Almost nothing. At MVP, you're a configured wrapper — the Jasper-trap zone. The moat is nascent: it's the BANT scoring logic (which is just rules and prompts at this point) plus the white-label integration (which creates mild switching cost). This is the most vulnerable stage. Any developer with n8n and GPT-4o access could replicate this in a weekend.

What you're building toward: The moat doesn't exist yet — you're building the instrument to collect the data that becomes the moat. Every conversation is training data. Every lead score vs. outcome comparison is calibration data. The MVP's job isn't to be defensible; it's to generate the data that makes Stage 2 defensible.


Stage 2: Multi-Agency Architecture (Jan 2028 – Dec 2029)
        Agency A        Agency B        Agency C

        Website         Website         Website

           │               │               │

           └───────────────┼───────────────┘

                           │

                    ┌──────┴───────┐

                    │   Lawrence   │

                    │   Platform   │

                    │──────────────│

                    │ Multi-tenant │

                    │ API Gateway  │

                    └──────┬───────┘

                           │

          ┌────────────────┼────────────────┐

          ▼                ▼                ▼

   ┌─────────────┐ ┌─────────────┐ ┌──────────────┐

   │ Conversation │ │    BANT     │ │   Agency     │

   │   Engine     │ │  Scoring    │ │   Dashboard  │

   │  (GPT-4o +  │ │  Engine v2  │ │  Analytics   │

   │   context)  │ │ (ML-trained │ │  + Benchmark │

   │             │ │  on outcome │ │              │

   │             │ │  data)      │ │              │

   └─────────────┘ └─────────────┘ └──────────────┘

          │                │                │

          ▼                ▼                ▼

   ┌─────────────┐ ┌─────────────┐ ┌──────────────┐

   │  Per-Agency  │ │  Outcome    │ │   CRM        │

   │  Data Store  │ │  Feedback   │ │   Integs     │

   │  (isolated)  │ │  Loop DB    │ │  Sheets/Hub/ │

   │              │ │             │ │  Salesforce  │

   └─────────────┘ └─────────────┘ └──────────────┘

Key architectural changes:

Multi-tenant isolation (each agency's data is fully separated — GDPR requirement)
BANT scoring moves from rules-based to ML-trained on 12+ months of outcome data
Self-serve onboarding (API key provisioning, embed code generator, branding config)
Analytics dashboard with cross-agency benchmarking (anonymized)
Webhook-based CRM integrations (not just Google Sheets)

What's the moat at this stage?

The outcome-trained scoring model. After 12–18 months across 40–80 agencies, Lawrence has seen thousands of parent conversations with known enrollment outcomes. The BANT scoring engine now predicts "will this parent actually enroll their child?" with accuracy that improves every month. A new competitor starts with zero outcome data and generic scoring. This is a real, compounding, data-network-effect moat — the same kind that makes Harvey defensible in legal AI.

Secondary moat: workflow integration depth. Each agency has Lawrence wired into their Sheets/HubSpot/Salesforce, their email templates, their counsellor routing rules. Switching means rebuilding all of that. This is Vanta-style operational lock-in.

Infrastructure cost model at this stage:

n8n cloud or self-hosted cluster: €200–500/month
GPT-4o API: €3,000–5,000/month (scaling with conversation volume)
Database (PostgreSQL on Hetzner/EU): €100–200/month
Monitoring, CI/CD, backups: €200/month
Total: ~€4,000–6,000/month against ~€32,000/month revenue = ~80–85% gross margin before lead-fee token costs, ~72–75% blended (lead-fee conversations are token-heavier)


Stage 3: Platform Architecture (Jan 2030 – Dec 2031)
   Parents          Agencies           Schools

      │                 │                  │

      │    ┌────────────┼────────────┐     │

      │    │            │            │     │

      ▼    ▼            ▼            ▼     ▼

   ┌─────────────────────────────────────────┐

   │           Lawrence Platform              │

   │──────────────────────────────────────────│

   │                                          │

   │  ┌──────────┐  ┌───────────┐  ┌───────┐│

   │  │  Chat +  │  │  Agency   │  │ School ││

   │  │  BANT    │  │  Portal   │  │ Insights│

   │  │  Engine  │  │  + CRM    │  │ Portal ││

   │  └──────────┘  └───────────┘  └───────┘│

   │                                          │

   │  ┌──────────┐  ┌───────────┐  ┌───────┐│

   │  │  AI      │  │  Outcome  │  │ Agency ││

   │  │  Match-  │  │  Verified │  │ Direct-││

   │  │  making  │  │  Ratings  │  │ ory    ││

   │  └──────────┘  └───────────┘  └───────┘│

   │                                          │

   │  ┌──────────────────────────────────────┐│

   │  │     Data Layer (EU-hosted)           ││

   │  │  Per-agency isolation + anonymized   ││

   │  │  cross-platform analytics engine     ││

   │  └──────────────────────────────────────┘│

   └──────────────────────────────────────────┘

What's the moat at platform stage?

Two-sided network effects. This is the terminal moat — the thing a wrapper can never build. Lawrence now sits between agencies and schools, with data flowing in both directions:

Agencies get better lead scoring because Lawrence has school-side data (which schools accept which student profiles, what conversion rates look like per school)
Schools get better agency selection because Lawrence has agency-side performance data (which agencies send the best-qualified students, lowest application-rejection rates)
Parents get better matching because Lawrence has both sides

This is a classic platform lock-in: each side's value depends on the other side being there. Replicating the chatbot is easy. Replicating the two-sided data network is a years-long, chicken-and-egg problem.

Revenue model at platform stage (three streams):

Stream
% of Revenue
Source
Agency subscriptions + lead fees
~55–60%
Core B2B2C product
School analytics + premium directory
~20–25%
School-side paid tier
Network services (matching, ratings)
~15–20%
Value-add on top of platform data



Architecture decision log — things to lock in now
EU data residency from day one. Host on Hetzner (Nuremberg/Falkenstein) or OVHcloud (Strasbourg). Never move parent PII through US servers. This becomes a procurement requirement for GDPR-conscious agencies and a competitive advantage against US-hosted competitors. Your Azure/cloud governance expertise makes this a credible, low-effort differentiator.

n8n as the workflow backbone, not a dependency. n8n is excellent for MVP speed and gives you self-hosted EU data control. But plan the migration path: by Stage 2, the BANT scoring engine and conversation routing should be Lawrence's own code (Python/Node microservices), with n8n handling only the CRM integration glue. Don't let your core IP live inside n8n workflow JSON.

Token cost management architecture. Build conversation-level cost tracking from day one. Every GPT-4o call should be logged with: agency ID, conversation ID, tokens used, cost, and the lead score it contributed to. This lets you (a) price accurately, (b) detect token-heavy conversations before they burn margin, and (c) switch models (GPT-4o-mini for low-complexity exchanges, full GPT-4o only for BANT scoring turns) to optimize cost.

Outcome feedback loop as a first-class data pipeline. The single most important architectural decision: make it trivially easy for agencies to report "this lead enrolled" or "this lead dropped off." If the feedback loop is friction-heavy, agencies won't use it, and your data moat never materializes. Options: one-click status update in the dashboard, a weekly email digest with "confirm/reject" buttons, or a Sheets/CRM webhook that detects status changes automatically. All three eventually; start with the simplest.


What stops a collapse?
At every stage, ask: "If OpenAI launches a better model tomorrow, does Lawrence's value decrease?"

Stage
If a better model launches...
Lawrence's response
MVP (Stage 1)
Risk: HIGH. A better model could make the chatbot better for everyone, including competitors. Lawrence's scoring is rules-based and replicable.
Swap in the better model. Your value isn't the model — it's the white-label integration and the agency relationship. But this is thin.
Multi-Agency (Stage 2)
Risk: MEDIUM. A better model improves Lawrence's own scoring. Competitors still lack your 12+ months of outcome data.
Swap in the better model to improve your own product. The data moat absorbs model improvements; it doesn't lose to them.
Platform (Stage 3)
Risk: LOW. The model is one component. Lawrence's value is the two-sided network of agencies, schools, and outcome-verified ratings. A better model makes Lawrence better, not obsolete.
Irrelevant to competitive position. Better models = better Lawrence.


This is the core architecture thesis: Stage 1 is deliberately fragile because you're trading moat for speed. The architecture's job is to move you through the fragile stage as fast as possible and into the data-moat and network-moat stages before competition materializes.



End of document. Next action: validate BANT scoring methodology with 3–5 agency partners before writing code.

