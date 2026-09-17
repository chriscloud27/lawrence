// The email an admissions team receives when a lead crosses the hot threshold.
//
// Worth stating plainly: before ADR-0018 this email did not exist and its n8n
// predecessor never fired — the Gmail node hung off a `Switch` branch that
// arithmetic proved unreachable (ADR-0017). This is the first time the
// escalation the two-stage design exists to produce actually reaches a person.
//
// Plain inline styles rather than the lw-* design tokens: email clients do not
// load stylesheets or resolve CSS custom properties, so the token layer cannot
// reach here. This is the one surface in the product where a literal colour is
// correct — the values below are the same Tailwind palette entries the tokens
// map to (.claude/rules/design.md § Exception), not invented hex.

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface HotLeadEmailProps {
  leadId: string;
  score: number;
  breakdown: {
    timeline: number;
    budget: number;
    authority: number;
    need?: number;
  };
  explanation?: string;
  profile: {
    location: string | null;
    timeline: string | null;
    forcing_function: string | null;
    child_age: number | null;
    current_school: string | null;
    curriculum: string | null;
    budget_range_usd: string | null;
  };
  /** Last few parent turns, so the counsellor opens the call already informed. */
  recentParentTurns: string[];
  adminUrl: string;
}

const text = {
  color: "#27272a",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 8px",
};
const label = { ...text, color: "#71717a", fontSize: "12px", margin: "0" };

export function HotLeadEmail({
  leadId,
  score,
  breakdown,
  explanation,
  profile,
  recentParentTurns,
  adminUrl,
}: HotLeadEmailProps) {
  const rows: [string, string][] = [
    ["Location", profile.location ?? "—"],
    ["Timeline", profile.timeline ?? "—"],
    ["What's driving it", profile.forcing_function ?? "—"],
    [
      "Child's age",
      profile.child_age != null ? String(profile.child_age) : "—",
    ],
    ["Current school", profile.current_school ?? "—"],
    ["Curriculum", profile.curriculum ?? "—"],
    ["Budget", profile.budget_range_usd ?? "—"],
  ];

  return (
    <Html>
      <Head />
      <Preview>{`New enquiry worth a call — ${profile.location ?? "location not given"}`}</Preview>
      <Body
        style={{
          backgroundColor: "#fafafa",
          fontFamily: "Inter, Arial, sans-serif",
          margin: 0,
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e4e4e7",
            borderRadius: "12px",
            margin: "24px auto",
            maxWidth: "560px",
            padding: "32px",
          }}
        >
          <Heading
            style={{
              color: "#18181b",
              fontSize: "20px",
              fontWeight: 700,
              margin: "0 0 4px",
            }}
          >
            An enquiry worth a call
          </Heading>
          <Text style={{ ...label, marginBottom: "24px" }}>
            {/* Monospace for a numeric score, per the design system's rule for
                score values — the one token convention that survives email. */}
            Score{" "}
            <span
              style={{ fontFamily: "'JetBrains Mono', Consolas, monospace" }}
            >
              {score}
            </span>
            {" · "}
            timeline {breakdown.timeline} · budget {breakdown.budget} ·
            authority {breakdown.authority}
            {breakdown.need != null ? ` · need ${breakdown.need}` : ""}
          </Text>

          {explanation ? (
            <Text
              style={{
                ...text,
                backgroundColor: "#f4f4f5",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "24px",
              }}
            >
              {explanation}
            </Text>
          ) : null}

          <Section>
            {rows.map(([k, v]) => (
              <div key={k} style={{ marginBottom: "12px" }}>
                <Text style={label}>{k}</Text>
                <Text style={text}>{v}</Text>
              </div>
            ))}
          </Section>

          {recentParentTurns.length > 0 ? (
            <>
              <Hr style={{ borderColor: "#e4e4e7", margin: "24px 0" }} />
              <Text style={{ ...label, marginBottom: "8px" }}>
                In their own words
              </Text>
              {recentParentTurns.map((turn, i) => (
                <Text
                  key={i}
                  style={{
                    ...text,
                    borderLeft: "2px solid #e4e4e7",
                    paddingLeft: "12px",
                  }}
                >
                  {turn}
                </Text>
              ))}
            </>
          ) : null}

          <Hr style={{ borderColor: "#e4e4e7", margin: "24px 0" }} />
          <Link
            href={adminUrl}
            style={{
              backgroundColor: "#1e3a8a",
              borderRadius: "8px",
              color: "#ffffff",
              display: "inline-block",
              fontSize: "14px",
              fontWeight: 600,
              padding: "10px 18px",
              textDecoration: "none",
            }}
          >
            Open the full conversation
          </Link>
          <Text style={{ ...label, marginTop: "16px" }}>Lead {leadId}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default HotLeadEmail;
