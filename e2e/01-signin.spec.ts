import { test, expect, type Allowed } from "./support/fixtures";
import { ACCOUNTS } from "./support/creds";
import { apiLogin } from "./support/api";
import { signInThroughUi } from "./support/auth";
import { seed } from "./support/backend";

const FONTS: Allowed = {
  kind: "external",
  match: /fonts\.googleapis\.com|fonts\.gstatic\.com/,
  reason: "Google Fonts stylesheets; blocked by the harness, the page falls back to a system font.",
};

test.describe("teacher sign-in", () => {
  test("a wrong password shows a clear message and stays on the sign-in page", async ({ page, monitor }) => {
    await page.goto("/");
    await page.locator("#identifier").fill(ACCOUNTS.teacher.email);
    await page.locator("#password").fill("Not-The-Password-1!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/Incorrect email, staff number, or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(
      monitor.unexpected([
        FONTS,
        { kind: "http", match: /POST \/auth\/login -> 401/, reason: "the wrong password is refused" },
        { kind: "http", match: /POST \/auth\/refresh -> 401/, reason: "the sign-in page probes for an existing session cookie; there is none" },
      ]),
    ).toEqual([]);
  });

  test("the right password leaves the sign-in page and the dashboard opens", async ({ page }) => {
    await signInThroughUi(page, ACCOUNTS.teacher);
    await page.goto("/dashboard");
    await expect(page.getByText(/Good (morning|afternoon|evening), Tolu/)).toBeVisible();
  });

  test("a student account is refused by the teachers portal with an explanation", async ({ page }) => {
    await page.goto("/");
    await page.locator("#identifier").fill(ACCOUNTS.student.email);
    await page.locator("#password").fill(ACCOUNTS.student.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/Access denied|registered as/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("a school admin is refused by the teachers portal too", async ({ page }) => {
    await page.goto("/");
    await page.locator("#identifier").fill(ACCOUNTS.schoolAdmin.email);
    await page.locator("#password").fill(ACCOUNTS.schoolAdmin.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/Access denied|registered as/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe.serial("temporary password", () => {
  const temp = ACCOUNTS.tempTeacher;
  const newPassword = "Sturdy#Pass2026";

  test.beforeAll(() => seed("--rearm"));
  test.afterAll(() => seed("--rearm"));

  test("a teacher on a temporary password is forced to /set-password, then can use the app", async ({ page, monitor }) => {
    // KNOWN BACKEND BUG (open): POST /auth/change-password returns an access token with no
    // sub/email/role (it spreads a Mongoose document). The app adopts it, as it should, and
    // then every request fails: the dashboard says "We couldn't load your dashboard".
    // Remove this line when the backend is fixed; Playwright then reports an unexpected pass.
    test.fail(true, "backend: change-password returns an unusable token");

    await page.goto("/");
    await page.locator("#identifier").fill(temp.email);
    await page.locator("#password").fill(temp.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/set-password/);

    // Every other page bounces back until the password is replaced.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/set-password/);

    monitor.clear();
    await page.locator("#currentPassword").fill(temp.password);
    await page.locator("#newPassword").fill(newPassword);
    await page.locator("#confirmPassword").fill(newPassword);
    await page.locator('form button[type="submit"]').first().click();

    await expect(page).not.toHaveURL(/\/set-password/, { timeout: 30_000 });
    // The account is usable: the dashboard loads its data with no refused request.
    await page.goto("/dashboard");
    await expect(page.getByText(/Good (morning|afternoon|evening), Temi/)).toBeVisible();
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    const allow: Allowed[] = [
      FONTS,
      { kind: "http", match: /GET \/curriculum\?teacherId=[a-f0-9]+ -> 404/, reason: "known backend bug, see 02-smoke.spec.ts" },
    ];
    expect(monitor.unexpected(allow)).toEqual([]);
  });

  test("after the change, the new password signs in normally and the temporary one is dead", async ({ page }) => {
    expect(await apiLogin({ email: temp.email, password: newPassword })).toBeTruthy();
    await expect(apiLogin(temp)).rejects.toThrow();

    await signInThroughUi(page, { email: temp.email, password: newPassword });
    await page.goto("/dashboard");
    await expect(page.getByText(/Good (morning|afternoon|evening), Temi/)).toBeVisible();
  });
});
