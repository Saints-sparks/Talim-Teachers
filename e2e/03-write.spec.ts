import { test, expect, type Allowed } from "./support/fixtures";
import { authFile } from "./support/creds";
import { seed } from "./support/backend";
import { dismissGuide } from "./support/ui";

/**
 * A real write flow through the UI, against the real API: the class teacher
 * marks the one student not on leave on the morning register (a radiogroup
 * per student), the draft is saved with `PUT /registers/:classId`, and the
 * footer's Submit sends `{ submit: true }`. The mark and the submission
 * survive a reload.
 */
const ALLOW: readonly Allowed[] = [
  { kind: "external", match: /fonts\.googleapis\.com|fonts\.gstatic\.com/, reason: "Google Fonts; blocked by the harness" },
  { kind: "http", match: /GET \/curriculum\?teacherId=[a-f0-9]+ -> 404/, reason: "known backend bug, see 02-smoke.spec.ts" },
];

test.use({ storageState: authFile("teacher") });
test.describe.configure({ mode: "serial" });
test.beforeAll(() => seed("--reset")); // no attendance marks and no register today

test("marking and submitting the register is stored and survives a reload", async ({ page, monitor }) => {
  const loaded = page.waitForResponse((r) => /\/registers\/[a-f0-9]{24}(\?|$)/.test(r.url()) && r.request().method() === "GET" && r.ok());
  await page.goto("/attendance");
  await loaded;
  await dismissGuide(page);
  await expect(page.getByRole("heading", { level: 2, name: /^Grade 5A · .* · today$/ })).toBeVisible();
  monitor.clear();

  // Ben is on approved leave: locked, no radios.
  await expect(page.getByRole("radiogroup", { name: "Attendance for Ben Student" })).toHaveCount(0);
  const ada = page.getByRole("radiogroup", { name: "Attendance for Ada Student" });
  const submit = page.getByRole("button", { name: "Submit register" });
  await expect(submit).toBeDisabled();

  // 1. Mark Ada present: the draft is saved with submit: false.
  const draft = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/registers/"));
  await ada.getByRole("radio", { name: "Present" }).click();
  const draftRes = await draft;
  expect(draftRes.status()).toBe(200);
  const draftBody = draftRes.request().postDataJSON() as { marks: { studentId: string; status: string }[]; submit: boolean };
  expect(draftBody.submit).toBe(false);
  expect(draftBody.marks).toEqual([expect.objectContaining({ status: "present" })]);
  await expect(page.getByText("Draft saved")).toBeVisible();
  await expect(ada.getByRole("radio", { name: "Present" })).toHaveAttribute("aria-checked", "true");

  // 2. Submit from the footer: submit: true, and the banner says it is in.
  await expect(submit).toBeEnabled();
  const posted = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/registers/"));
  await submit.click();
  const res = await posted;
  expect(res.status()).toBe(200);
  expect((res.request().postDataJSON() as { submit: boolean }).submit).toBe(true);
  await expect(page.getByRole("status").filter({ hasText: /^Submitted at / })).toBeVisible();

  // 3. Reload: still submitted, Ada still present (read-only until Edit register).
  await page.reload();
  await dismissGuide(page);
  await expect(page.getByRole("status").filter({ hasText: /^Submitted at / })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Attendance for Ada Student" })).toHaveCount(0);
  await expect(page.locator("li", { hasText: "Ada Student" }).getByText("Present", { exact: true })).toBeVisible();
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});
