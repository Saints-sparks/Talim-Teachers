import { expect, type Page } from "@playwright/test";
import type { Account } from "./creds";

/** Signs in through the real form; resolves once the app has left the sign-in page. */
export async function signInThroughUi(page: Page, account: Pick<Account, "email" | "password">, keepSignedIn = true): Promise<void> {
  await page.goto("/");
  await page.locator("#identifier").fill(account.email);
  await page.locator("#password").fill(account.password);
  if (keepSignedIn) await page.getByLabel(/Keep me signed in/).check();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/localhost:\d+\/$/, { timeout: 60_000 });
}
