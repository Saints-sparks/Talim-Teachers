import type { Page } from "@playwright/test";
import { test, expect, type Allowed } from "./support/fixtures";
import { authFile } from "./support/creds";
import { seed } from "./support/backend";
import { dismissGuide } from "./support/ui";

/**
 * A real write flow through the UI, against the real API: the teacher marks a
 * student present, the mark survives a reload, and a second mark for the same
 * student shows the recorded state rather than an error.
 */
const ALLOW: readonly Allowed[] = [
  { kind: "external", match: /fonts\.googleapis\.com|fonts\.gstatic\.com/, reason: "Google Fonts; blocked by the harness" },
  { kind: "http", match: /GET \/curriculum\?teacherId=[a-f0-9]+ -> 404/, reason: "known backend bug, see 02-smoke.spec.ts" },
];

test.use({ storageState: authFile("teacher") });
test.describe.configure({ mode: "serial" });
test.beforeAll(() => seed("--reset")); // no attendance marks: today's register is empty

const card = (page: Page, student: string) =>
  page.locator('[data-guide="attendance-student-cards"] > *').filter({ hasText: student });

async function openGrade5A(page: Page): Promise<void> {
  await page.goto("/attendance");
  await dismissGuide(page);
  await page.locator("[data-guide='attendance-class-grid'] > *").filter({ hasText: "Grade 5A" }).getByText(/View Students/).click();
  await expect(page).toHaveURL(/\/attendance\/class\//);
  await dismissGuide(page);
  await expect(page.getByText("Ada Student").first()).toBeVisible();
}

test("marking a student present is stored, survives a reload, and the duplicate shows the record", async ({ page, monitor }) => {
  await openGrade5A(page);
  monitor.clear();

  // 1. Mark Ada present.
  const ada = card(page, "Ada Student");
  await ada.getByRole("button", { name: "Present" }).click();
  const posted = page.waitForResponse((r) => r.url().endsWith("/attendance") && r.request().method() === "POST");
  await ada.getByRole("button", { name: /Submit Attendance/ }).click();
  const res = await posted;
  expect(res.status()).toBe(201);
  const body = res.request().postDataJSON() as Record<string, unknown>;
  expect(body).toMatchObject({ status: "Present" });
  expect(Object.keys(body).sort()).toEqual(["classId", "date", "status", "studentId", "termId"]);
  await expect(ada.getByText("Present").first()).toBeVisible();
  await expect(ada.getByText(/Marked at/)).toBeVisible();

  // 2. Reload: the mark is still there, the other student is still open.
  await page.reload();
  await dismissGuide(page);
  await expect(card(page, "Ada Student").getByText(/Marked at/)).toBeVisible();
  await expect(card(page, "Ada Student").getByRole("button", { name: /Submit Attendance/ })).toHaveCount(0);
  await expect(card(page, "Ben Student").getByRole("button", { name: /Submit Attendance/ })).toBeVisible();

  // 3. A duplicate: someone else already recorded Ben. The server refuses the second mark;
  //    the teacher must be told the list is up to date, not shown an error.
  await page.route(
    (url) => url.pathname.endsWith("/attendance"),
    async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fetch(); // the first mark lands ...
      const duplicate = await route.fetch(); // ... so this one is the duplicate
      return route.fulfill({ response: duplicate });
    },
  );
  const ben = card(page, "Ben Student");
  await ben.getByRole("button", { name: "Present" }).click();
  monitor.clear();
  await ben.getByRole("button", { name: /Submit Attendance/ }).click();

  await expect(page.getByText(/Ben Student was already marked/)).toBeVisible();
  await expect(ben.getByText(/Marked at/)).toBeVisible();
  await expect(page.getByText(/marks? didn't send/i)).toHaveCount(0);
  // The refused duplicate is the only allowed failure on the wire.
  expect(
    monitor.unexpected([
      ...ALLOW,
      { kind: "http", match: /POST \/attendance -> 409/, reason: "the duplicate mark is refused with 409 CONFLICT by the API, which is the point of the step" },
      { kind: "console.error", match: /Submitting a mark failed[\s\S]*already recorded/, reason: "the app logs the refused duplicate before it reconciles with the roster" },
    ]),
  ).toEqual([]);
});
