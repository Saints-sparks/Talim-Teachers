import { test, expect, type Allowed } from "./support/fixtures";
import { TEACHER_PAGES } from "./support/pages";
import { authFile } from "./support/creds";

/**
 * Walks every sidebar destination as the seeded class teacher. A page passes
 * when it loads with no uncaught error, no console.error and no unexpected
 * non-2xx API response, leaves its loading state, and shows its content (or its
 * empty state where the seed has none).
 *
 * ALLOW lists what is known and accepted. Each entry states why; anything else
 * is a failure, so a new error on a page cannot slip in unnoticed.
 */
export const ALLOW: readonly Allowed[] = [
  {
    kind: "external",
    match: /fonts\.googleapis\.com|fonts\.gstatic\.com/,
    reason: "The layout loads Poppins and Montserrat from Google Fonts. The harness blocks every off-machine request; the page falls back to a system font.",
  },
];

test.use({ storageState: authFile("teacher") });

test("the sidebar groups the pages under Teach, Classes and Inbox", async ({ page }) => {
  await page.goto("/dashboard");
  const nav = page.getByRole("navigation", { name: "Teacher portal" });
  for (const group of ["Teach", "Classes", "Inbox"]) await expect(nav.getByRole("heading", { name: group })).toBeVisible();
  for (const spec of TEACHER_PAGES.filter((p) => p.path !== "/settings")) {
    await expect(nav.locator(`a[href="${spec.path}"]`)).toContainText(spec.label);
  }
  await expect(nav.getByRole("link", { name: /^Today/ })).toHaveAttribute("aria-current", "page");
});

for (const spec of TEACHER_PAGES) {
  test(`teacher can open ${spec.path}`, async ({ page, monitor }) => {
    monitor.clear();
    const fed = spec.feed ? page.waitForResponse((r) => spec.feed!.test(new URL(r.url()).pathname + new URL(r.url()).search)) : null;
    await page.goto(spec.path);
    if (fed) expect((await fed).status(), `${spec.path} reads its data`).toBe(200);

    // Loading -> content: no skeleton may outlive the data.
    await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText(spec.content).filter({ visible: true }).first()).toBeVisible();
    // Attendance and Students keep the chosen class in the query (`?classId=`), Grading and Subjects
    // the chosen subject and view (`?courseId=&assessmentId=`, `?courseId=&tab=`).
    await expect(page).toHaveURL(new RegExp(`${spec.path}/?(\\?(classId|courseId)=[a-f0-9]{24}(&[a-zA-Z]+=[a-zA-Z0-9]+)*)?$`));
    await expect(page.locator(`a[href="${spec.path}"]`).first()).toBeAttached();

    // Let trailing requests (websocket handshake, badge counts, onboarding sync) land before judging.
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    expect(monitor.unexpected(ALLOW), `unexpected findings on ${spec.path}`).toEqual([]);
  });
}
