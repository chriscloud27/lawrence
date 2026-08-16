const MOCK_SCHOOLS = [
  {
    id: 1,
    slug: 'bangkok-patana',
    name: 'Bangkok Patana School',
    city: 'Bangkok',
    country: 'Thailand',
    website: 'https://www.bangkokpatana.ac.th',
    curricula: ['British', 'IB'],
    ageFrom: 3,
    ageTo: 18,
    feesMinUsd: 18000,
    feesMaxUsd: 28000,
    boarding: false,
    day: true,
    description: "One of Bangkok's most established British international schools with over 50 years of history. Renowned for academic rigour and a strong pastoral care programme.",
    heroImageUrl: null,
  },
  {
    id: 2,
    slug: 'nist-international',
    name: 'NIST International School',
    city: 'Bangkok',
    country: 'Thailand',
    website: 'https://www.nist.ac.th',
    curricula: ['IB'],
    ageFrom: 3,
    ageTo: 18,
    feesMinUsd: 20000,
    feesMaxUsd: 32000,
    boarding: false,
    day: true,
    description: 'A leading IB World School in Bangkok known for its inquiry-based learning and a diverse international community of 65+ nationalities.',
    heroImageUrl: null,
  },
  {
    id: 3,
    slug: 'shrewsbury-bangkok',
    name: 'Shrewsbury International School',
    city: 'Bangkok',
    country: 'Thailand',
    website: 'https://www.shrewsbury.ac.th',
    curricula: ['British'],
    ageFrom: 3,
    ageTo: 18,
    feesMinUsd: 22000,
    feesMaxUsd: 35000,
    boarding: false,
    day: true,
    description: 'The Bangkok campus of the prestigious UK Shrewsbury School, offering a British curriculum with exceptional sports and arts facilities.',
    heroImageUrl: null,
  },
  {
    id: 4,
    slug: 'harrow-bangkok',
    name: 'Harrow International School Bangkok',
    city: 'Bangkok',
    country: 'Thailand',
    website: 'https://www.harrowschool.ac.th',
    curricula: ['British'],
    ageFrom: 11,
    ageTo: 18,
    feesMinUsd: 24000,
    feesMaxUsd: 38000,
    boarding: true,
    day: true,
    description: 'Part of the globally renowned Harrow family of schools, offering a premium British education with boarding options and exceptional co-curricular activities.',
    heroImageUrl: null,
  },
  {
    id: 5,
    slug: 'ruamrudee-international',
    name: 'Ruamrudee International School',
    city: 'Bangkok',
    country: 'Thailand',
    website: 'https://www.rism.ac.th',
    curricula: ['American'],
    ageFrom: 3,
    ageTo: 18,
    feesMinUsd: 15000,
    feesMaxUsd: 24000,
    boarding: false,
    day: true,
    description: 'A long-established American curriculum school in Bangkok with a strong community feel, popular with North American expat families and Thai students alike.',
    heroImageUrl: null,
  },
  {
    id: 6,
    slug: 'prem-tinsulanonda',
    name: 'Prem Tinsulanonda International School',
    city: 'Chiang Mai',
    country: 'Thailand',
    website: 'https://www.ptis.ac.th',
    curricula: ['IB'],
    ageFrom: 11,
    ageTo: 18,
    feesMinUsd: 19000,
    feesMaxUsd: 30000,
    boarding: true,
    day: true,
    description: 'A beautiful IB boarding school set on a forested campus near Chiang Mai, known for its outdoor education programme and tight-knit international community.',
    heroImageUrl: null,
  },
  {
    id: 7,
    slug: 'garden-international-bangkok',
    name: 'Garden International School',
    city: 'Bangkok',
    country: 'Thailand',
    website: 'https://www.gardenbankok.com',
    curricula: ['British'],
    ageFrom: 3,
    ageTo: 16,
    feesMinUsd: 16000,
    feesMaxUsd: 26000,
    boarding: false,
    day: true,
    description: 'A well-regarded British school in Bangkok with a nurturing environment, strong emphasis on pastoral care, and a reputation for developing well-rounded students.',
    heroImageUrl: null,
  },
  {
    id: 8,
    slug: 'kis-international',
    name: 'KIS International School',
    city: 'Bangkok',
    country: 'Thailand',
    website: 'https://www.kis.ac.th',
    curricula: ['IB'],
    ageFrom: 3,
    ageTo: 18,
    feesMinUsd: 17000,
    feesMaxUsd: 27000,
    boarding: false,
    day: true,
    description: 'A boutique IB school in central Bangkok known for small class sizes, individualised attention, and a strong arts and music programme.',
    heroImageUrl: null,
  },
];

// School info for "tell me more about X" responses
const SCHOOL_DETAILS: Record<string, string> = {
  'bangkok patana': `Bangkok Patana is one of the oldest and most respected British schools in Bangkok. It runs IGCSE at secondary and offers the IB Diploma alongside A-Levels at Sixth Form. The campus is large and well-resourced, with strong sport, performing arts, and a very active parent community. Class sizes average around 20–22. Fees run roughly $18,000–$28,000/year depending on year group. It tends to attract a broad mix of British expats, Thai families, and other nationalities.`,
  'nist': `NIST is a fully IB school from PYP through to Diploma, so if the IB pathway matters to you it's a very coherent choice. It has a genuine inquiry-based culture and a diverse student body — over 65 nationalities. The school is well located in central Bangkok. Fees are on the higher end at $20,000–$32,000/year. It's popular with families who want a rigorous academic environment with a genuinely international feel.`,
  'shrewsbury': `Shrewsbury International School is part of the Shrewsbury School brand from the UK, which carries a lot of weight if UK university applications are on the horizon. Strong British curriculum, excellent facilities, and a reputation for high academic outcomes. There are two Bangkok campuses — City and Riverside — each with a slightly different feel. Fees range from $22,000–$35,000/year. It tends to be a strong fit for British families or those targeting UK universities.`,
  'harrow': `Harrow Bangkok is part of the global Harrow network and carries the full Harrow reputation — strong academics, boarding available, and a premium co-curricular offering including polo and equestrian. It's secondary-only (ages 11–18) so not a primary option. Fees are among the highest in Bangkok at $24,000–$38,000/year. It's particularly popular with families who want the Harrow name on the transcript and may be considering UK boarding schools later.`,
  'ruamrudee': `Ruamrudee International School (RIS) is one of Bangkok's longest-established American curriculum schools. It has a strong community feel and is popular with North American families. The campus is spacious and the fees are more accessible than some of the premium British schools — $15,000–$24,000/year. Good for families who want a US-style education and a warm, inclusive environment.`,
  'prem': `Prem is quite unique — it's an IB boarding school set on a forested campus outside Chiang Mai. If you're open to boarding or your child is secondary age, it's worth serious consideration. The outdoor education and adventure programme is exceptional and the community is very tight-knit. Fees including boarding are $19,000–$30,000/year. It tends to attract families who want something different from the typical Bangkok school experience.`,
  'garden': `Garden International School has a strong reputation for pastoral care and a nurturing environment — it's often recommended for children who need a gentler transition. British curriculum, primary-focused (up to Year 11). Fees are $16,000–$26,000/year, making it a bit more accessible than some peers. Popular with British and European families in Bangkok.`,
  'kis': `KIS is a boutique IB school with small class sizes — usually 15–18 students — which means a lot of individual attention. It's in a great central Bangkok location and has a strong arts and music programme. Fees are $17,000–$27,000/year. It's a good fit if your child thrives in a smaller, more personal environment rather than a large campus school.`,
};

interface MockMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedContext {
  location: string | null;
  timeline: string | null;
  hasForcingFunction: boolean;
  forcingFunctionType: string | null;
  childAge: string | null;
  curriculum: string | null;
  hasBudget: boolean;
  isVague: boolean;
  turnCount: number;
  score: number;
  classification: 'hot' | 'warm' | 'cold';
}

function parseContext(messages: MockMessage[]): ParsedContext {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
  const turnCount = userMessages.length;
  const allText = userMessages.join(' ');

  const locationMatch = allText.match(/\b(singapore|bangkok|hong kong|thailand|malaysia|vietnam|china|japan|korea|indonesia|india|dubai|shanghai|beijing|kuala lumpur|phuket|chiang mai)\b/);
  const location = locationMatch
    ? locationMatch[1].replace(/\b\w/g, c => c.toUpperCase())
    : null;

  let timeline: string | null = null;
  if (/within 6 months|next few months|soon|this year|january|february|march|april|may|june/.test(allText)) timeline = 'within 6 months';
  else if (/next year|6.{1,5}18 months|6 to 18|mid.next/.test(allText)) timeline = '6–18 months';
  else if (/18 months|couple of years|2 years|planning/.test(allText)) timeline = '18+ months';
  else if (/not sure|unsure|don.t know|exploring|just looking/.test(allText)) timeline = 'not sure';

  const forcingFunctionMatch = allText.match(/\b(moving|relocation|relocating|job|transfer|visa|divorce|leaving|expat|assignment|posted)\b/);
  const hasForcingFunction = !!forcingFunctionMatch;
  const forcingFunctionType = forcingFunctionMatch ? forcingFunctionMatch[1] : null;

  const ageMatch = allText.match(/(\d{1,2})\s*(?:year|yr|years|yo|y\/o)/);
  const childAge = ageMatch ? `${ageMatch[1]} years old` : null;

  let curriculum: string | null = null;
  if (/\bib\b|international baccalaureate/.test(allText)) curriculum = 'IB';
  else if (/british|uk curriculum|igcse|a.levels/.test(allText)) curriculum = 'British';
  else if (/american|us curriculum/.test(allText)) curriculum = 'American';
  else if (/boarding/.test(allText)) curriculum = 'Boarding';
  else if (/open to|any|doesn.t matter|no preference/.test(allText)) curriculum = 'Open';

  const hasBudget = /budget|\$|usd|baht|thb|sgd|\d+k|\d{4,}|scholarship|bursary/.test(allText);
  const isVague = !location && !timeline && !hasForcingFunction && !childAge && turnCount <= 3;

  let score = 0;
  if (location) score += 20;
  if (timeline === 'within 6 months') score += 30;
  else if (timeline === '6–18 months') score += 20;
  else if (timeline === '18+ months') score += 10;
  if (hasForcingFunction) score += 25;
  if (hasBudget) score += 10;
  if (childAge) score += 5;

  const classification = score >= 70 ? 'hot' : score >= 35 ? 'warm' : 'cold';
  return { location, timeline, hasForcingFunction, forcingFunctionType, childAge, curriculum, hasBudget, isVague, turnCount, score, classification };
}

function detectSchoolMention(text: string): string | null {
  const lower = text.toLowerCase();
  const schoolKeys = Object.keys(SCHOOL_DETAILS);
  return schoolKeys.find(key => lower.includes(key)) || null;
}

function wantsMoreSchools(text: string): boolean {
  return /more school|other school|see more|what else|any other|different school|show me more|other option|other choices|anything else/.test(text.toLowerCase());
}

function wantsToTalkToAgent(text: string): boolean {
  return /speak|talk to|call|chat with|sarah|agent|consultant|advisor|someone|in person|book|appointment/.test(text.toLowerCase());
}

function askRefiningQuestion(ctx: ParsedContext): string {
  if (!ctx.curriculum) {
    return `To help narrow it down — do you have a preference on curriculum? British, IB, and American schools each have a quite different feel and pathway to university.`;
  }
  if (!ctx.childAge) {
    return `How old is your child? The right fit can vary quite a bit depending on age — some schools are much stronger at primary level, others really shine at secondary.`;
  }
  if (!ctx.hasBudget) {
    return `Do you have a rough budget in mind, or are you open to exploring scholarships and bursaries? Fees across these schools vary from about $15,000 to $38,000 a year, so it helps to know the range.`;
  }
  if (!ctx.location) {
    return `Which part of the city will you be based in? Commute matters a lot in Bangkok — some schools are much better positioned depending on where you're living.`;
  }
  return `Any other priorities — things like class size, sports, arts, language programmes, or a particular nationality mix? That can really help me point you to the best fit.`;
}

export function buildMockResponse(messages: MockMessage[]): {
  text: string;
  schools?: typeof MOCK_SCHOOLS;
  calendlyUrl?: string;
  score: number;
  classification: 'hot' | 'warm' | 'cold';
} {
  const ctx = parseContext(messages);
  const lastUser = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  const lastLower = lastUser.toLowerCase();
  const alreadyShownSchools = messages.some(m => m.role === 'assistant' && (m.content.includes('show you') || m.content.includes('worth knowing about') || m.content.includes('worth exploring')));
  const calendarAlreadyOffered = messages.some(m => m.role === 'assistant' && m.content.includes('calendar'));

  // 1. Parent wants to talk to an agent
  if (wantsToTalkToAgent(lastUser)) {
    return {
      text: `Of course — Sarah, our admissions agent, would love to have a quick chat. She can look at your child's specific situation, talk through which schools are the best fit, and guide you through the admissions process step by step. Most conversations take around 20 minutes and there's no obligation at all. Here's her calendar:`,
      calendlyUrl: process.env.CALENDLY_URL || '',
      score: ctx.score,
      classification: ctx.classification,
    };
  }

  // 2. Parent asks about a specific school by name
  const mentionedSchool = detectSchoolMention(lastUser);
  if (mentionedSchool && SCHOOL_DETAILS[mentionedSchool]) {
    const detail = SCHOOL_DETAILS[mentionedSchool];
    const schoolName = mentionedSchool.replace(/\b\w/g, c => c.toUpperCase());
    return {
      text: `${detail}\n\nIf you'd like to take it further — visit the campus, understand the application timeline, or get a feel for whether it's the right fit for your child specifically — Sarah can help with all of that. She works directly with admissions at these schools and can often speed things up.`,
      score: ctx.score,
      classification: ctx.classification,
    };
  }

  // 3. Parent wants to see more schools
  if (wantsMoreSchools(lastUser) && alreadyShownSchools) {
    const refiningQuestion = askRefiningQuestion(ctx);
    const extraSchools = MOCK_SCHOOLS.slice(4);

    if (extraSchools.length > 0) {
      return {
        text: `Here are a few more worth considering. ${refiningQuestion}`,
        schools: extraSchools,
        score: ctx.score,
        classification: ctx.classification,
      };
    }
    return {
      text: `${refiningQuestion}`,
      score: ctx.score,
      classification: ctx.classification,
    };
  }

  // 4. Post-school follow-up questions
  if (alreadyShownSchools) {
    if (/fee|cost|expensive|afford|price/.test(lastLower)) {
      return {
        text: `Fees across Bangkok's top international schools range from about $15,000–$38,000 USD per year depending on the school and year group. Most also have a one-time registration or capital levy on top. Some schools offer need-based bursaries — Bangkok Patana and NIST in particular have support for families who need it. Do you want me to focus on schools in a particular fee range?`,
        score: ctx.score,
        classification: ctx.classification,
      };
    }
    if (/compare|difference|which is better|vs|versus/.test(lastLower)) {
      return {
        text: `The main differences come down to curriculum and culture. British schools (Bangkok Patana, Shrewsbury, Harrow) follow IGCSE/A-Level — very structured, strong for UK university entry. IB schools (NIST, KIS, Prem) suit students who like breadth and independent thinking, and the qualification is recognised globally. American curriculum (Ruamrudee) is great if you're thinking US universities. In terms of feel — Harrow is the most formal, KIS is the most personal, NIST and Bangkok Patana are strong all-rounders. What matters most to your family?`,
        score: ctx.score,
        classification: ctx.classification,
      };
    }
    if (/admission|apply|application|enrol|enroll|waitlist/.test(lastLower)) {
      return {
        text: `Most schools have rolling admissions but year groups can fill up — especially at key entry points like Year 7 or Year 9. The typical process is: submit an enquiry → assessment day (English, maths, sometimes an interview) → offer → enrolment. Timelines are usually 2–6 weeks. Some schools, particularly Harrow and Shrewsbury, have waitlists for popular year groups. If your timeline is tight, Sarah can contact schools on your behalf and often move things along faster than going direct.`,
        score: ctx.score,
        classification: ctx.classification,
      };
    }
    if (/visit|tour|open day|see the school/.test(lastLower)) {
      return {
        text: `Visiting is one of the best things you can do — it gives you a real feel for the culture and atmosphere that no website can convey. Most Bangkok schools offer individual campus tours, and some have open days. Sarah can arrange tours at multiple schools in a single trip if you're visiting Bangkok, which families often find really efficient. Want me to flag which schools are easiest to arrange a visit at short notice?`,
        score: ctx.score,
        classification: ctx.classification,
      };
    }
    if (/boarding/.test(lastLower)) {
      return {
        text: `Of the schools I've shown you, Harrow and Prem Tinsulanonda both offer boarding. Harrow is in Bangkok itself and takes secondary students from age 11. Prem is up in Chiang Mai — a very different environment, more outdoor and adventurous. Both have excellent pastoral care. Are you looking for full boarding or would weekly boarding work?`,
        score: ctx.score,
        classification: ctx.classification,
      };
    }
    // Generic follow-up — offer refining question or agent
    const mentionCall = !calendarAlreadyOffered;
    return {
      text: `Good question. Each of these schools has a slightly different character — it really depends on what matters most to your family. ${mentionCall ? `If it would help to talk it through with someone who knows these schools well, Sarah is happy to have a quick call — she can give you a much more personalised view than I can here.` : `Feel free to ask me anything specific about any of them.`}`,
      score: ctx.score,
      classification: ctx.classification,
    };
  }

  // --- Qualification flow (no schools shown yet) ---

  // Turn 1
  if (ctx.turnCount === 1) {
    if (ctx.hasForcingFunction && ctx.location && ctx.timeline) {
      return {
        text: `That's really helpful — ${ctx.location} is a great market and ${ctx.forcingFunctionType ? `a ${ctx.forcingFunctionType}` : 'that kind of move'} does tend to focus the mind. Tell me a bit about your child — how old are they, and what's their current school set up?`,
        score: ctx.score,
        classification: ctx.classification,
      };
    }
    if (ctx.location) {
      return {
        text: `${ctx.location} is a great choice — there's a really strong international school market there. And when would you be looking at starting — do you have a rough timeframe in mind?`,
        score: ctx.score,
        classification: ctx.classification,
      };
    }
    if (ctx.isVague) {
      return {
        text: `Happy to help with that. To point you in the right direction — do you have a particular city or country in mind, or are you still weighing up options?`,
        score: ctx.score,
        classification: ctx.classification,
      };
    }
    return {
      text: `That's helpful context. And when are you thinking in terms of timing — is this fairly imminent or more of a longer-term plan?`,
      score: ctx.score,
      classification: ctx.classification,
    };
  }

  // Turn 2
  if (ctx.turnCount === 2) {
    if (ctx.childAge) {
      return {
        text: `${ctx.childAge} is actually a really good age to make a move like this — kids adapt quickly at that stage. Any leanings on the type of school? Some families come in with a strong view on British vs IB, others are completely open.`,
        score: ctx.score,
        classification: ctx.classification,
      };
    }
    const timelineAck = ctx.timeline === 'within 6 months'
      ? `Good to know — that's a fairly tight window so it's worth moving quickly on applications.`
      : ctx.timeline === '6–18 months'
      ? `That's a reasonable runway — enough time to be thoughtful about it.`
      : `That makes sense, no rush.`;
    return {
      text: `${timelineAck} Tell me a bit about your child — how old are they, and what's their current school situation?`,
      score: ctx.score,
      classification: ctx.classification,
    };
  }

  // Turn 3
  if (ctx.turnCount === 3) {
    if (ctx.curriculum) {
      return {
        text: `${ctx.curriculum === 'IB' ? 'IB is a great choice — very well regarded globally and it suits students who like a broad, inquiry-based approach.' : ctx.curriculum === 'British' ? 'British curriculum schools tend to be very structured and are particularly strong if university in the UK is on the radar.' : 'Good to have a steer on that.'} Last thing — do you have a rough budget in mind, or is that still being figured out?`,
        score: ctx.score,
        classification: ctx.classification,
      };
    }
    const ageAck = ctx.childAge ? `${ctx.childAge} is a solid age for this kind of transition.` : `Good context, thanks.`;
    return {
      text: `${ageAck} Any preferences on the style of school — British curriculum, IB, American, or are you fairly open at this point?`,
      score: ctx.score,
      classification: ctx.classification,
    };
  }

  // Turn 4+ — show initial school recommendations
  const introText = ctx.classification === 'cold'
    ? `Still plenty of time to explore — let me show you a few schools that tend to work well for families in your situation.`
    : ctx.curriculum === 'IB'
    ? `Based on what you've told me, here are some IB schools that stand out — each a bit different in terms of feel and fee range.`
    : ctx.curriculum === 'British'
    ? `Here are a few British curriculum schools worth knowing about — all well established with strong track records.`
    : `Here are a few schools that look like a good fit based on what you've shared.`;

  const softCallMention = ctx.classification !== 'cold'
    ? ` If you want to go deeper on any of them, just ask — or if you'd like Sarah to walk you through the admissions process directly, just say the word.`
    : ` Feel free to ask me anything about any of them, or say "show me more" if you'd like to see other options.`;

  return {
    text: introText + softCallMention,
    schools: MOCK_SCHOOLS.slice(0, 4),
    score: ctx.score,
    classification: ctx.classification,
  };
}

export { MOCK_SCHOOLS };
