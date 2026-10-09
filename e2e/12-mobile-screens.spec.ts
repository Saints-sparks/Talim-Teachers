import fs from "node:fs";
import { test, expect } from "./support/fixtures";
import { TEACHER_PAGES } from "./support/pages";
import { authFile } from "./support/creds";
import { dismissGuide } from "./support/ui";

/**
 * Every sidebar page on a phone (390×844, light), screenshotted into
 * e2e/screenshots/mobile/ (gitignored), with My tickets (Settings → Help).
 * A page must load its content and must not scroll sideways.
 */
const THEME_KEY = "talim_teacher_theme";
const slug = (route: string): string => route.replace(/^\//, "").replace(/[/?=&]/g, "_");

test.use({ storageState: authFile("teacher"), viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("every page on a phone", async ({ page }) => {
  test.setTimeout(600_000);
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, "light"] as const);
  fs.mkdirSync("e2e/screenshots/mobile", { recursive: true });
  const problems: string[] = [];
  for (const spec of [...TEACHER_PAGES, { path: "/settings?tab=help", content: /My tickets/ }]) {
    await page.goto(spec.path);
    await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText(spec.content).filter({ visible: true }).first()).toBeAttached();
    await dismissGuide(page, 2_000);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) problems.push(`${spec.path} scrolls sideways by ${overflow}px`);
    await page.screenshot({ path: `e2e/screenshots/mobile/${slug(spec.path)}.png`, fullPage: true });
  }
  expect(problems).toEqual([]);
});
