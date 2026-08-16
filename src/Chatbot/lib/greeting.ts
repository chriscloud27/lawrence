import type { LeadRecap } from "./lead-history";

export function composeWelcomeBackMessage(recap: LeadRecap): string {
  const parts: string[] = [];

  // Opening
  const greeting = recap.capturedName ? `Welcome back, ${recap.capturedName}!` : "Welcome back!";
  parts.push(greeting);

  // Context sentence — what we know about their search
  const contextParts: string[] = [];
  if (recap.curriculum) {
    contextParts.push(`${recap.curriculum} schools`);
  } else {
    contextParts.push("schools");
  }

  if (recap.timeline) {
    contextParts.push(`for a ${recap.timeline} start`);
  }

  if (recap.budgetRangeUsd) {
    contextParts.push(`budget around ${recap.budgetRangeUsd}`);
  }

  if (contextParts.length > 0) {
    parts.push(`Last time we talked, you were looking at ${contextParts.join(", ")}.`);
  }

  // Status & next steps
  if (recap.classification === "hot") {
    parts.push("You're ready to book a consultation — want the link again?");
  } else {
    parts.push("Want to pick up where we left off, or ask something new?");
  }

  return parts.join(" ");
}
