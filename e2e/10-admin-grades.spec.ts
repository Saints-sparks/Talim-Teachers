import { test, expect } from "./support/fixtures";
import { ACCOUNTS, authFile } from "./support/creds";
import { apiCall, apiLogin } from "./support/api";
import { dismissGuide } from "./support/ui";

/**
 * Runs after the School Admin suite's 06-grading-results.spec.ts, which saves
 * a WAEC-style grade scale (A1 75, B2 70, B3 65, C4 60, C5 55, C6 50, D7 45,
 * E8 40, F9 0). The Grading page must grade with the school's scale: on the
 * fully published Mathematics 5A, Ada (80.4%) is an A1 and Ben (66.5%) a B3.
 * Then the default scale goes back (the backend's `node e2e/seed.js` would do
 * the same). Set E2E_ADMIN_GRADES=1 to run it.
 */
test.skip(process.env.E2E_ADMIN_GRADES !== "1", "run after the School Admin grade-scale spec with E2E_ADMIN_GRADES=1");
test.use({ storageState: authFile("teacher") });

const DEFAULT_SCALE = [
  { letter: "A", min: 70, remark: "Excellent" },
  { letter: "B", min: 60, remark: "Very good" },
  { letter: "C", min: 50, remark: "Good" },
  { letter: "D", min: 45, remark: "Fair" },
  { letter: "E", min: 40, remark: "Pass" },
  { letter: "F", min: 0, remark: "Fail" },
];

interface Sheet {
  course: { id: string };
  scale: { letter: string }[];
  students: { name: string; percent: number | null; grade: string | null }[];
}

test.afterAll(async () => {
  const admin = await apiLogin(ACCOUNTS.schoolAdmin);
  await apiCall(admin, "PATCH", "/settings/academic", { gradeScale: DEFAULT_SCALE, passMark: 50 });
});

test("the Grading page grades with the scale the school admin saved", async ({ page }) => {
  const token = await apiLogin(ACCOUNTS.teacher);
  const cards = await apiCall<{ course: { id: string; code: string } }[]>(token, "GET", "/scheme-of-work/me");
  const mth = cards.find((c) => c.course.code === "MTH-5A")!.course.id;
  const sheet = await apiCall<Sheet>(token, "GET", `/grading/course/${mth}`);
  expect(sheet.scale.map((b) => b.letter)).toEqual(["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"]);
  const byName = Object.fromEntries(sheet.students.map((s) => [s.name, s.grade]));
  expect(byName).toEqual({ "Ada Student": "A1", "Ben Student": "B3" });

  const loaded = page.waitForResponse((r) => r.url().includes(`/grading/course/${mth}`) && r.ok());
  await page.goto(`/grading?courseId=${mth}&assessmentId=total`);
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
  const table = page.getByRole("table");
  await expect(table.getByRole("row").filter({ hasText: "Ada Student" })).toContainText("A1");
  await expect(table.getByRole("row").filter({ hasText: "Ben Student" })).toContainText("B3");
  await page.screenshot({ path: "e2e/screenshots/redesign-grading-admin-scale-desktop-light.png", fullPage: true });
});
