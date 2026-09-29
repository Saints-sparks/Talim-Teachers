import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import type { Browser, Page } from "@playwright/test";
import { test, expect, type Allowed } from "./support/fixtures";
import { ACCOUNTS, authFile } from "./support/creds";
import { apiCall, apiLogin } from "./support/api";
import { seed } from "./support/backend";
import { dismissGuide } from "./support/ui";

/**
 * The redesigned Today (`/dashboard`, `GET /teachers/today`) and Timetable
 * (`/timetable`, `GET /timetable/me`) against the seeded week: every weekday
 * has lessons with rooms, the period the school clock is in holds a lesson,
 * and the current week has scheme-of-work topics (backend `e2e/seed.js`).
 * The seed places the periods around the time it ran; if the suite runs long
 * after, or at a weekend, the Now-card assertions fall back to what the API
 * says is on.
 */
const ALLOW: readonly Allowed[] = [
  { kind: "external", match: /fonts\.googleapis\.com|fonts\.gstatic\.com/, reason: "Google Fonts; blocked by the harness" },
  { kind: "http", match: /GET \/curriculum\?teacherId=[a-f0-9]+ -> 404/, reason: "known backend bug, see 02-smoke.spec.ts" },
];

const THEME_KEY = "talim_teacher_theme";

interface TodayLesson {
  id: string;
  date: string;
  course: { id: string; title: string };
  class: { id: string; name: string };
  room: string | null;
  topic: { week: number; taughtAt: string | null } | null;
  state: "done" | "now" | "later";
}
interface TodayBody {
  schoolDay: { isSchoolDay: boolean };
  lessons: TodayLesson[];
  nowLessonId: string | null;
  nextLessonId: string | null;
  registers: { classId: string; className: string; isClassTeacher: boolean; submittedAt: string | null }[];
  attention: { title: string }[];
}
interface WeekBody {
  week: { number: number | null; start: string; prevStart: string; nextStart: string };
  lessons: TodayLesson[];
}

const titleOf = (l: Pick<TodayLesson, "course" | "class">) => `${l.course.title} · ${l.class.name}`;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let token = "";
const today = () => apiCall<TodayBody>(token, "GET", "/teachers/today");
const myWeek = (weekStart?: string) => apiCall<WeekBody>(token, "GET", `/timetable/me${weekStart ? `?weekStart=${weekStart}` : ""}`);

test.use({ storageState: authFile("teacher") });
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  seed("--reset"); // no attendance and no registers: today's register is open
  token = await apiLogin(ACCOUNTS.teacher);
});

/** Opens a page of the app and waits for its data. */
async function open(page: Page, path: "/dashboard" | "/timetable"): Promise<void> {
  const loaded = page.waitForResponse((r) => r.url().includes(path === "/dashboard" ? "/teachers/today" : "/timetable/me") && r.ok());
  await page.goto(path);
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
}

test("Today shows the greeting, the lesson on now, the day with rooms and what needs attention", async ({ page, monitor }) => {
  const data = await today();
  monitor.clear();
  await open(page, "/dashboard");

  await expect(page.getByRole("heading", { level: 1, name: /Good (morning|afternoon|evening), Tolu/ })).toBeVisible();

  const now = data.lessons.find((l) => l.id === data.nowLessonId);
  const next = data.lessons.find((l) => l.id === data.nextLessonId);
  if (now) {
    const card = page.getByRole("region", { name: "The lesson on now" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("heading", { name: titleOf(now) })).toBeVisible();
    await expect(card.getByRole("progressbar", { name: "Lesson progress" })).toBeVisible();
  } else if (next) {
    test.info().annotations.push({ type: "note", description: "No lesson on now (outside the seeded periods); checked the next-lesson card" });
    await expect(page.getByRole("region", { name: "Your next lesson" })).toBeVisible();
  } else {
    test.info().annotations.push({ type: "note", description: `No lesson now or next (school day: ${data.schoolDay.isSchoolDay})` });
  }

  const day = page.getByRole("region", { name: "Your day" });
  await expect(day).toBeVisible();
  if (data.lessons.length) {
    await expect(day.getByRole("button", { name: /Open lesson details|·/ }).first()).toBeVisible();
    const withRoom = data.lessons.find((l) => l.room);
    if (withRoom) await expect(day.getByText(withRoom.room!).first()).toBeVisible();
    if (now) await expect(day.locator('[aria-current="time"]')).toContainText(titleOf(now));
  }

  const attention = page.getByRole("region", { name: "Needs your attention" });
  await expect(attention).toBeVisible();
  expect(data.attention.length).toBeGreaterThan(0);
  await expect(attention.getByText(data.attention[0].title)).toBeVisible();

  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

test("Take register opens the attendance page for the class", async ({ page }) => {
  const data = await today();
  const open5A = data.registers.find((r) => r.isClassTeacher && r.className === "Grade 5A" && !r.submittedAt);
  test.skip(!data.schoolDay.isSchoolDay || !open5A, "no open register today (weekend, holiday or no term)");
  await open(page, "/dashboard");
  await page.getByRole("link", { name: "Take register" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/attendance/class/${open5A!.classId}`));
  await dismissGuide(page);
  await expect(page.getByText("Ada Student").first()).toBeVisible();
});

/** The Mark taught / Undo button inside the open lesson sheet. */
const taughtButton = (page: Page) => page.getByRole("dialog").getByRole("button", { name: /^(Mark taught|Undo)$/ });

async function toggleTaught(page: Page): Promise<string> {
  const button = taughtButton(page);
  const before = (await button.textContent())?.trim() ?? "";
  const posted = page.waitForResponse((r) => /\/scheme-of-work\/course\/[^/]+\/weeks\/\d+\/taught$/.test(r.url()) && r.request().method() === "POST");
  await button.click();
  const res = await posted;
  expect(res.status()).toBe(200);
  const after = before === "Mark taught" ? "Undo" : "Mark taught";
  await expect(taughtButton(page)).toHaveText(after);
  return after;
}

test("the lesson sheet opens from Today, and Mark taught toggles and survives a reload", async ({ page }) => {
  const data = await today();
  const lesson = data.lessons.find((l) => l.id === data.nowLessonId && l.topic) ?? data.lessons.find((l) => l.topic);
  test.skip(!lesson, "no lesson with a scheme-of-work topic today");
  await open(page, "/dashboard");

  const row = page.getByRole("region", { name: "Your day" }).getByRole("button", { name: new RegExp(escape(titleOf(lesson!))) }).first();
  await row.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: titleOf(lesson!) })).toBeVisible();
  await expect(sheet.getByText(`Week ${lesson!.topic!.week} topic`)).toBeVisible();
  if (lesson!.room) await expect(sheet.getByText(`Room: ${lesson!.room}`)).toBeVisible();

  const state = await toggleTaught(page);
  await page.reload();
  await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
  await dismissGuide(page, 2_000);
  await page.getByRole("region", { name: "Your day" }).getByRole("button", { name: new RegExp(escape(titleOf(lesson!))) }).first().click();
  await expect(taughtButton(page)).toHaveText(state);

  // Put it back the way the seed left it.
  await toggleTaught(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the lesson sheet opens from the timetable grid", async ({ page }) => {
  const week = await myWeek();
  test.skip(week.lessons.length === 0, "no lessons this week");
  await open(page, "/timetable");
  const first = week.lessons[0];
  await page.getByRole("button", { name: new RegExp(`^${escape(titleOf(first))}, `) }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: titleOf(first) })).toBeVisible();
  await expect(sheet.getByText("Scheme of work", { exact: true })).toBeVisible();
  await expect(taughtButton(page)).toBeVisible();

  // The scheme of work now lives on Subjects: the lesson's course, the plan, its week.
  const scheme = sheet.locator('a[href^="/subjects?"]');
  await expect(scheme).toHaveText("Open");
  const href = new URL((await scheme.getAttribute("href"))!, "http://x");
  expect(href.searchParams.get("courseId")).toBe(first.course.id);
  expect(href.searchParams.get("tab")).toBe("plan");
  if (first.topic) expect(href.searchParams.get("week")).toBe(String(first.topic.week));
  const cards = page.waitForResponse((r) => /\/scheme-of-work\/me(\?|$)/.test(r.url()) && r.ok());
  await scheme.click();
  await cards;
  await expect(page).toHaveURL(new RegExp(`/subjects\\?.*courseId=${first.course.id}`));
  await expect(page.getByRole("heading", { level: 2, name: titleOf(first) })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Scheme of work" })).toHaveAttribute("aria-selected", "true");
});

test("the timetable moves to the next and previous week and back to this week", async ({ page }) => {
  const week = await myWeek();
  const next = await myWeek(week.week.nextStart);
  const prev = await myWeek(week.week.prevStart);
  const label = (w: WeekBody) => (w.week.number ? `Week ${w.week.number}` : "Outside term");
  await open(page, "/timetable");
  const line = page.locator("h1", { hasText: "Timetable" }).locator("xpath=following-sibling::p");
  const thisWeek = page.getByRole("button", { name: "This week" });
  await expect(line).toContainText(label(week));
  await expect(thisWeek).toBeDisabled();

  const go = async (name: "Next week" | "Previous week", start: string) => {
    const res = page.waitForResponse((r) => r.url().includes(`/timetable/me?weekStart=${start}`) && r.ok());
    await page.getByRole("button", { name }).click();
    await res;
  };
  await go("Next week", week.week.nextStart);
  await expect(line).toContainText(label(next));
  await expect(thisWeek).toBeEnabled();

  await go("Previous week", week.week.start);
  await expect(line).toContainText(label(week));
  await go("Previous week", week.week.prevStart);
  await expect(line).toContainText(label(prev));

  await thisWeek.click();
  await expect(line).toContainText(label(week));
  await expect(thisWeek).toBeDisabled();
});

/** A signed-in teacher page at phone size, with the theme forced. */
async function phonePage(browser: Browser, baseURL: string | undefined, theme: "light" | "dark" = "light") {
  const context = await browser.newContext({
    baseURL,
    storageState: authFile("teacher"),
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, theme] as const);
  return { context, page };
}

/**
 * How far anything sticks out sideways: the document's own overflow, and any
 * card (`section`) that is wider than the viewport or clips its content (the
 * shell's `overflow-hidden` would otherwise hide a too-wide card from the
 * document check).
 */
const horizontalOverflow = (page: Page) =>
  page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    let worst = document.documentElement.scrollWidth - width;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("section"))) {
      if (!el.offsetParent) continue;
      worst = Math.max(worst, Math.ceil(el.getBoundingClientRect().right) - width, el.scrollWidth - el.clientWidth - 1);
    }
    return worst;
  });

test("at phone size the timetable shows day tabs and neither page scrolls sideways", async ({ browser, baseURL }) => {
  const { context, page } = await phonePage(browser, baseURL);
  try {
    await open(page, "/timetable");
    const tabs = page.getByRole("tablist", { name: "Day" });
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole("tab")).toHaveCount(5);
    await expect(page.getByRole("tabpanel")).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await open(page, "/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: /Good (morning|afternoon|evening), Tolu/ })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  } finally {
    await context.close();
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`axe finds nothing serious or critical on Today and Timetable (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, theme] as const);
    for (const path of ["/dashboard", "/timetable"] as const) {
      await open(page, path);
      await page.waitForTimeout(600); // transitions settle before colours are judged
      expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(theme === "dark");
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
      const bad = result.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 5) }));
      expect(bad, `${path} (${theme})`).toEqual([]);
    }
  });
}

/**
 * The shell scrolls its main column, not the document, so a full-page
 * screenshot stops at the viewport. Grows the viewport by what the tallest
 * scrolling element hides, takes the shot, and restores the size.
 */
async function shootWhole(page: Page, file: string): Promise<void> {
  const size = page.viewportSize()!;
  const hidden = await page.evaluate(() => {
    let most = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const overflow = getComputedStyle(el).overflowY;
      if ((overflow === "auto" || overflow === "scroll") && el.clientHeight > 200) most = Math.max(most, el.scrollHeight - el.clientHeight);
    }
    return most;
  });
  if (hidden > 0) {
    await page.setViewportSize({ width: size.width, height: size.height + hidden });
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: file, fullPage: true });
  if (hidden > 0) await page.setViewportSize(size);
}

test("screenshots of Today and Timetable: desktop light and dark, phone", async ({ browser, baseURL }) => {
  test.setTimeout(240_000);
  fs.mkdirSync("e2e/screenshots", { recursive: true });
  for (const theme of ["light", "dark"] as const) {
    const context = await browser.newContext({
      baseURL,
      storageState: authFile("teacher"),
      viewport: { width: 1440, height: 900 },
      colorScheme: theme,
    });
    const page = await context.newPage();
    await page.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
    await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, theme] as const);
    for (const [path, name] of [["/dashboard", "today"], ["/timetable", "timetable"]] as const) {
      await open(page, path);
      await page.waitForTimeout(800);
      await shootWhole(page, `e2e/screenshots/redesign-${name}-desktop-${theme}.png`);
    }
    await context.close();
  }
  const { context, page } = await phonePage(browser, baseURL);
  for (const [path, name] of [["/dashboard", "today"], ["/timetable", "timetable"]] as const) {
    await open(page, path);
    await page.waitForTimeout(800);
    await shootWhole(page, `e2e/screenshots/redesign-${name}-mobile-light.png`);
  }
  await context.close();
});
