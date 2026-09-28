import { test, expect } from "./support/fixtures";
import { ACCOUNTS, authFile } from "./support/creds";
import { apiCall, apiLogin } from "./support/api";
import { dismissGuide } from "./support/ui";

/**
 * Runs after the School Admin suite's 05-school-day-calendar.spec.ts, which
 * replaces the bell schedule (Morning Period 1 … Lunch … Afternoon Period)
 * and places a Mathematics 5A lesson in Morning Period 1 with room "Lab 2".
 * The teacher's Timetable must show the admin's period names and that room.
 * Set E2E_ADMIN_BELLS=1 to run it; `node e2e/seed.js` in the backend puts
 * the seeded schedule back afterwards.
 */
test.skip(process.env.E2E_ADMIN_BELLS !== "1", "run after the School Admin bell-schedule spec with E2E_ADMIN_BELLS=1");
test.use({ storageState: authFile("teacher") });

interface WeekBody {
  periods: { key: string; label: string; startTime: string; isBreak: boolean }[];
  lessons: { day: string; startTime: string; room: string | null; periodKey: string | null; course: { title: string }; class: { name: string } }[];
}

test("the teacher's Timetable shows the admin's period names and the new lesson's room", async ({ page }) => {
  const token = await apiLogin(ACCOUNTS.teacher);
  const week = await apiCall<WeekBody>(token, "GET", "/timetable/me");
  const lesson = week.lessons.find((l) => l.room === "Lab 2");
  expect(lesson, "the lesson the admin placed is on the teacher's week").toBeTruthy();
  const period = week.periods.find((p) => p.key === lesson!.periodKey);
  expect(period?.label).toBe("Morning Period 1");
  expect(week.periods.map((p) => p.label)).toEqual(["Morning Period 1", "Morning Period 2", "Short Break", "Morning Period 3", "Lunch", "Afternoon Period"]);

  const loaded = page.waitForResponse((r) => r.url().includes("/timetable/me") && r.ok());
  await page.goto("/timetable");
  await loaded;
  await dismissGuide(page, 2_000);
  const grid = page.getByRole("table");
  for (const label of ["Morning Period 1", "Morning Period 2", "Short Break", "Lunch", "Afternoon Period"]) {
    await expect(grid.getByText(label, { exact: true }).first()).toBeVisible();
  }
  const card = page.getByRole("button", { name: new RegExp(`^${lesson!.course.title} · ${lesson!.class.name}, ${lesson!.day} .*, Lab 2`) });
  await expect(card).toBeVisible();
  await expect(card.getByText(/Lab 2/)).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/redesign-timetable-admin-bells-desktop-light.png", fullPage: true });
});
