import type { Page } from "@playwright/test";
import { test, expect, type Allowed } from "./support/fixtures";
import { ACCOUNTS, authFile } from "./support/creds";
import { apiCall, apiLogin, unwrap } from "./support/api";
import { dismissGuide } from "./support/ui";
import { axeFindings } from "./support/axe";

/**
 * v1.5 My tickets (Settings → Help) through the teacher's UI: raise a ticket to
 * Talim support, find it in the list, see Talim's reply arrive as "1 new", and
 * reply from the thread. axe (WCAG 2.1 A/AA) on the Help tab and the thread,
 * light and dark. Each run makes its own "E2E <run> ..." ticket.
 */
const RUN = Date.now().toString(36).slice(-5);
const PLATFORM = { email: "platform@e2e.talim.test", password: ACCOUNTS.teacher.password };
const ALLOW: readonly Allowed[] = [
  { kind: "external", match: /fonts\.googleapis\.com|fonts\.gstatic\.com/, reason: "Google Fonts are blocked by the harness; the system font is used." },
];

interface Ticket {
  id: string;
  reference: string;
  desk: string;
  status: string;
  messages: { body: string; author: { role: string } }[];
}

test.use({ storageState: authFile("teacher") });
test.describe.configure({ mode: "serial" });

let ticket: Ticket;
const subject = `E2E ${RUN}: register will not save`;

/** Opens Settings → Help and waits for My tickets. */
async function openHelp(page: Page, query = ""): Promise<void> {
  const loaded = page.waitForResponse((r) => /\/tickets\/mine(\?|$)/.test(r.url()) && r.ok());
  await page.goto(`/settings?tab=help${query}`);
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
}

test("raise a ticket to Talim support; it is listed", async ({ page, monitor }) => {
  monitor.clear();
  await openHelp(page);
  await page.locator("#settings-panel").getByRole("button", { name: "New ticket" }).click();
  const sheet = page.getByRole("dialog", { name: "How can we help?" });
  await sheet.getByRole("button", { name: "Attendance", exact: true }).click();
  await sheet.getByLabel("Subject").fill(subject);
  await sheet.getByLabel("Message").fill("Saving today's register spins and then nothing happens.");
  const sent = page.waitForResponse((r) => /\/tickets$/.test(r.url()) && r.request().method() === "POST");
  await sheet.getByRole("button", { name: "Send to Talim support" }).click();
  const res = await sent;
  expect(res.status()).toBe(201);
  ticket = unwrap<Ticket>(await res.json());
  expect(res.request().postDataJSON()).toMatchObject({ desk: "talim", area: "attendance", subject });

  // The new ticket's thread opens; closing it leaves the list with the ticket in it.
  const thread = page.getByRole("dialog", { name: subject });
  await expect(thread.getByText(ticket.reference, { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(thread).toHaveCount(0);
  const list = page.getByRole("list", { name: "My tickets" });
  await expect(list.getByRole("button", { name: new RegExp(subject) })).toContainText(ticket.reference);
  await expect(list.getByRole("button", { name: new RegExp(subject) })).toContainText("Open");
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

test("Talim's reply shows as new; the teacher replies from the thread", async ({ page, monitor }) => {
  const platform = await apiLogin(PLATFORM);
  const staffReply = `E2E ${RUN}: which class and which day?`;
  await apiCall(platform, "POST", `/tickets/${ticket.id}/messages`, { body: staffReply });

  monitor.clear();
  await openHelp(page);
  const row = page.getByRole("list", { name: "My tickets" }).getByRole("button", { name: new RegExp(subject) });
  await expect(row).toContainText("1 new");
  await row.click();
  const thread = page.getByRole("dialog", { name: subject });
  await expect(thread.getByRole("list", { name: "Messages" })).toContainText(staffReply);

  const mine = `E2E ${RUN}: Grade 5A, today.`;
  await thread.getByLabel("Your reply").fill(mine);
  const posted = page.waitForResponse((r) => r.url().endsWith(`/tickets/${ticket.id}/messages`) && r.request().method() === "POST");
  await thread.getByRole("button", { name: "Send reply" }).click();
  expect((await posted).status()).toBe(201);
  await expect(thread.getByRole("list", { name: "Messages" })).toContainText(mine);
  await expect(thread.getByLabel("Your reply")).toHaveValue("");

  const seen = await apiCall<Ticket>(platform, "GET", `/tickets/${ticket.id}`);
  expect(seen.messages.map((m) => m.body)).toEqual(expect.arrayContaining([staffReply, mine]));
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

for (const theme of ["light", "dark"] as const) {
  test(`axe: Help and a ticket thread in the ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript((t) => localStorage.setItem("talim_teacher_theme", t), theme);
    const failures: string[] = [];
    await openHelp(page);
    await page.waitForTimeout(500);
    for (const f of await axeFindings(page, `/settings?tab=help (${theme})`, "tickets")) failures.push(`help ${theme}: ${f.rule} ${f.targets.join(" | ")}`);
    await openHelp(page, `&ticket=${ticket.id}`);
    await expect(page.getByRole("dialog", { name: subject })).toBeVisible();
    await page.waitForTimeout(500);
    for (const f of await axeFindings(page, `ticket thread (${theme})`, "tickets")) failures.push(`thread ${theme}: ${f.rule} ${f.targets.join(" | ")}`);
    expect(failures).toEqual([]);
  });
}
