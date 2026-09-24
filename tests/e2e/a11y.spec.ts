import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { expectPhoneFriendly, sessionFor, signIn } from "./helpers";

const BOMBAY = "/restaurants/d819c69d-5616-460e-a26b-934211322ae2";
async function firstDishPath(page: Page) {
  await page.goto(BOMBAY);
  return (await page.locator(".dish").first().getAttribute("href"))!;
}
async function scan(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return violations.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

// Q2: automated WCAG 2.1 AA scan of every page type, signed out and signed in; 320 px layout.
test("pages have no automatically detectable accessibility violations", async ({ page, context }, info) => {
  test.setTimeout(240_000); // first run compiles every route in dev
  const dish = await firstDishPath(page);
  const signedOut = ["/", "/?q=zzz", BOMBAY, `${BOMBAY}?q=zzz`, dish, "/login", "/auth/confirm?token_hash=aaaaaaaaaaaaaaaaaaaa&type=email", "/auth/confirm", "/restaurants/nope"];
  const found: string[] = [];
  for (const path of signedOut) found.push(...await scan(page, path));
  await signIn(context, sessionFor(info));
  found.push(...await scan(page, dish));
  expect(found).toEqual([]);
});

test("320 px layouts stay usable", async ({ page }, info) => {
  test.skip(info.project.name !== "phone");
  await page.setViewportSize({ width: 320, height: 700 });
  const dish = await firstDishPath(page);
  for (const path of ["/", BOMBAY, dish, "/login"]) { await page.goto(path); await page.waitForLoadState("networkidle"); await expectPhoneFriendly(page); }
});

// Q2: the core loop works by keyboard alone with a visible focus indicator.
test("keyboard-only search to rating control", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop");
  await signIn(context, sessionFor(info));
  await page.goto("/");
  const focusVisible = () => page.evaluate(() => { const el = document.activeElement as HTMLElement; const s = getComputedStyle(el); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0; });
  await page.keyboard.press("Tab"); // skip link
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  expect(await focusVisible()).toBe(true);
  await page.locator("#q").focus();
  await page.keyboard.type("bombay"); await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=bombay/);
  const card = page.getByRole("link", { name: /Bombay House/ });
  await card.focus(); expect(await focusVisible()).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bombay House");
  const row = page.locator(".dish").first();
  await row.focus(); expect(await focusVisible()).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator("#rate-slider")).toBeVisible();
  await page.locator("#rate-slider").focus();
  const before = await page.getByLabel("Score (1.0 to 10.0)").inputValue();
  await page.keyboard.press("ArrowRight");
  expect(await page.getByLabel("Score (1.0 to 10.0)").inputValue()).not.toBe(before);
  expect(await focusVisible()).toBe(true);
});
