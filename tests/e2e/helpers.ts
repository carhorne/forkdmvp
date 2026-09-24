import { readFileSync } from "node:fs";
import { expect, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { SESSIONS_FILE, type Session } from "./dev-harness";

export const BASE = "http://localhost:3000";

export function sessionFor(info: TestInfo): Session {
  return JSON.parse(readFileSync(SESSIONS_FILE, "utf8"))[info.project.name];
}
export async function signIn(context: BrowserContext, session: Session) {
  await context.addCookies(session.cookies.map((c) => ({ ...c, url: BASE })));
}
// Records native-share calls instead of opening a system sheet.
export async function stubShare(context: BrowserContext) {
  await context.addInitScript(() => {
    (window as unknown as { __shared: ShareData[] }).__shared = [];
    navigator.share = async (data?: ShareData) => { (window as unknown as { __shared: ShareData[] }).__shared.push(data ?? {}); };
  });
}
export const lastShare = (page: Page) => page.evaluate(() => (window as unknown as { __shared: ShareData[] }).__shared.at(-1));

export function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) errors.push(m.text()); });
  return errors;
}
export async function expectPhoneFriendly(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), "no horizontal scroll").toBeLessThanOrEqual(0);
  const small = await page.evaluate(() => [...document.querySelectorAll("a, button, input, select")]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 44 && !e.closest("footer, .provenance, .skip-link, .address, h1, .muted"); })
    .map((e) => (e.id || e.textContent || e.tagName).trim().slice(0, 40)));
  expect(small, "primary tap targets ≥ 44px").toEqual([]);
}
