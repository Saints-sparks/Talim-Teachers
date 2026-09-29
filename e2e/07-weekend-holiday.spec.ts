import type { Page } from "@playwright/test";
import { test, expect } from "./support/fixtures";
import { ACCOUNTS, authFile } from "./support/creds";
import { apiCall, apiLogin } from "./support/api";
import { dismissGuide } from "./support/ui";

/**
 * Days the school is closed, on Today and the Timetable.
 *
 * - Holiday: the school admin creates a holiday for the school's "today"
 *   through the real `POST /calendar-events`, and deletes it afterwards.
 * - Weekend: needs the API started on a Saturday with the test-only clock
 *   (`E2E_MODE=true E2E_CLOCK_NOW=2026-10-03T09:00:00+01:00`, see the
 *   backend's e2e/README.md) and `E2E_WEEKEND=1` here; skipped otherwise.
 */
interface TodayBody {
  date: string;
  schoolDay: { isSchoolDay: boolean; reason: string | null };
}
interface WeekBody {
  week: { start: string; isCurrent: boolean; number: number | null };
  days: { date: string; isToday: boolean; holiday: { title: string } | null }[];
  lessons: { date: string; startTime: string; endTime: string; course: { id: string }; class: { id: string }; cancelled: { reason: string } | null }[];
}

const WEEKEND = process.env.E2E_WEEKEND === "1";

test.use({ storageState: authFile("teacher") });
test.describe.configure({ mode: "serial" });

async function open(page: Page, path: "/dashboard" | "/timetable"): Promise<void> {
  const loaded = page.waitForResponse((r) => r.url().includes(path === "/dashboard" ? "/teachers/today" : "/timetable/me") && r.ok());
  await page.goto(path);
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
}

test.describe("a holiday today", () => {
  test.skip(WEEKEND, "the holiday checks need a school day");
  const title = "E2E Founders Day";
  let admin = "";
  let eventId = "";

  test.beforeAll(async () => {
    const teacher = await apiLogin(ACCOUNTS.teacher);
    const today = await apiCall<TodayBody>(teacher, "GET", "/teachers/today");
    admin = await apiLogin(ACCOUNTS.schoolAdmin);
    const created = await apiCall<{ id?: string; _id?: string }>(admin, "POST", "/calendar-events", { type: "holiday", startDate: today.date, title });
    eventId = (created.id ?? created._id)!;
    expect(eventId).toBeTruthy();
  });

  test.afterAll(async () => {
    if (eventId) await apiCall(admin, "DELETE", `/calendar-events/${eventId}`);
  });

  test("Today says the school is closed, and the Timetable strikes through today's lessons", async ({ page }) => {
    await open(page, "/dashboard");
    await expect(page.getByText(`${title}: the school is closed, so there are no lessons today.`)).toBeVisible();

    const week = page.waitForResponse((r) => r.url().includes("/timetable/me") && r.ok());
    await page.goto("/timetable");
    const body = (await (await week).json()) as WeekBody | { data: WeekBody };
    const data = "data" in body ? body.data : body;
    await dismissGuide(page, 2_000);
    const today = data.days.find((d) => d.isToday)!;
    expect(today.holiday?.title).toBe(title);
    const cancelled = data.lessons.filter((l) => l.date === today.date);
    expect(cancelled.length).toBeGreaterThan(0);
    expect(cancelled.every((l) => l.cancelled)).toBe(true);

    await expect(page.getByRole("columnheader", { name: /Monday|Tuesday|Wednesday|Thursday|Friday/ }).filter({ hasText: `Holiday: ${title}` })).toBeVisible();
    // The grid draws back-to-back lessons of the same course and class as one double-period cell.
    const sorted = [...cancelled].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const cells = sorted.filter((l, i) => {
      const prev = sorted[i - 1];
      return !(prev && prev.endTime === l.startTime && prev.course.id === l.course.id && prev.class.id === l.class.id);
    }).length;
    const struck = page.getByRole("button", { name: /, cancelled: / });
    await expect(struck).toHaveCount(cells);
    await expect(struck.first().locator(".line-through")).toBeVisible();
    await expect(struck.first().locator(".line-through")).toHaveCSS("text-decoration-line", "line-through");
  });
});

test.describe("a Saturday", () => {
  test.skip(!WEEKEND, "start the API with E2E_MODE=true E2E_CLOCK_NOW=<a Saturday in term> and set E2E_WEEKEND=1");

  test("Today shows the weekend, and the Timetable opens on next week", async ({ page }) => {
    const token = await apiLogin(ACCOUNTS.teacher);
    const today = await apiCall<TodayBody>(token, "GET", "/teachers/today");
    expect(today.schoolDay).toMatchObject({ isSchoolDay: false, reason: "weekend" });
    expect(new Date(`${today.date}T12:00:00Z`).getUTCDay()).toBe(6);

    await open(page, "/dashboard");
    await expect(page.getByText("It is the weekend, so there are no lessons today.")).toBeVisible();

    const week = page.waitForResponse((r) => r.url().includes("/timetable/me") && r.ok());
    await page.goto("/timetable");
    const body = (await (await week).json()) as WeekBody | { data: WeekBody };
    const data = "data" in body ? body.data : body;
    await dismissGuide(page, 2_000);
    const monday = new Date(`${today.date}T12:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() + 2);
    expect(data.week.start).toBe(monday.toISOString().slice(0, 10));
    expect(data.week.isCurrent).toBe(true);
    const line = page.locator("h1", { hasText: "Timetable" }).locator("xpath=following-sibling::p");
    await expect(line).toContainText(`${monday.getUTCDate()} `);
    if (data.week.number) await expect(line).toContainText(`Week ${data.week.number}`);
    await expect(page.getByRole("button", { name: "This week" })).toBeDisabled();
    console.log(`[weekend] today ${today.date}; timetable opened on ${data.week.start} (week ${data.week.number})`);
  });
});
