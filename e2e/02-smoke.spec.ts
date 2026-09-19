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
  {
    kind: "http",
    match: /GET \/curriculum\?teacherId=[a-f0-9]+ -> 404/,
    reason:
      "BACKEND BUG (open): GET /curriculum?teacherId= validates the id against the Teacher profile collection but filters on the User id, so no id can succeed. The onboarding sync sends the user id and swallows the 404 on every navigation.",
  },
];

test.use({ storageState: authFile("teacher") });

for (const spec of TEACHER_PAGES) {
  test(`teacher can open ${spec.path}`, async ({ page, monitor }) => {
    monitor.clear();
    await page.goto(spec.path);

    // Loading -> content: no skeleton may outlive the data.
    await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText(spec.content).filter({ visible: true }).first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${spec.path}/?$`));
    await expect(page.locator(`a[href="${spec.path}"]`).first()).toBeAttached();

    // Let trailing requests (websocket handshake, badge counts, onboarding sync) land before judging.
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    expect(monitor.unexpected(ALLOW), `unexpected findings on ${spec.path}`).toEqual([]);
  });
}
