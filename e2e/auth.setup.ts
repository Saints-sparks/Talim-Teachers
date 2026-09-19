import { test as setup } from "@playwright/test";
import { ACCOUNTS, authFile } from "./support/creds";
import { signInThroughUi } from "./support/auth";

/** Signs the seeded teacher in once and stores the session for the other specs. */
setup("sign in teacher", async ({ page }) => {
  await signInThroughUi(page, ACCOUNTS.teacher);
  // A first-time teacher is sent through onboarding; where they land is asserted in 01-signin.
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  console.log(`[e2e] teacher landed on ${new URL(page.url()).pathname}`);
  await page.context().storageState({ path: authFile("teacher") });
});
