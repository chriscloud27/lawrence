// Driver for the browser-automation skill (`node <that-skill>/browser.mjs <url> --script driver.mjs`).
// Drives the one flow that proves the app works end-to-end: open the
// floating ChatWidget, start the BANT pre-qualification flow, answer the
// first question, and screenshot the result.
//
// `page` is a Playwright/patchright Page, `ui` is the browser-automation
// ref helper (see that skill's SKILL.md for the full API).

const SCREENSHOT_PATH = process.env.CHATBOT_SCREENSHOT || "/tmp/chatbot-smoke.png";

export default async function run(page, ui) {
  const before = await ui.snapshot();
  const openChat = before.match(/@(e\d+) button "Open chat"/);
  if (!openChat) {
    return { ok: false, step: "open-chat-button-not-found", snapshot: before };
  }

  await ui.click(`@${openChat[1]}`);
  await page.waitForTimeout(400);

  const afterOpen = await ui.snapshot();
  const startBtn = afterOpen.match(/@(e\d+) button "Start"/);
  if (!startBtn) {
    return { ok: false, step: "start-button-not-found", snapshot: afterOpen };
  }

  await ui.click(`@${startBtn[1]}`);
  await page.waitForTimeout(400);

  const afterStart = await ui.snapshot();
  const hasPrequalOption = /Urgent|Few months|exploring|No specific timeline/.test(afterStart);

  await page.screenshot({ path: SCREENSHOT_PATH });

  return {
    ok: hasPrequalOption,
    step: "prequal-question-1",
    screenshot: SCREENSHOT_PATH,
    snapshot: afterStart,
  };
}
