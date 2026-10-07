import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect, type Allowed } from "./support/fixtures";
import { ACCOUNTS, API_URL, ENVELOPE, authFile, type Account } from "./support/creds";
import { apiCall, apiLogin, unwrap } from "./support/api";
import { MAIL_DIR, seed } from "./support/backend";
import { signInThroughUi } from "./support/auth";
import { dismissGuide } from "./support/ui";
import { TALIM_APP, TALIM_APP_HEADER } from "../src/lib/talimApp";

/**
 * Round 4 (Messages, Notifications, Settings) and Round 5 (sign-in pages,
 * Attendance history, the old Resources and Curriculum routes, the 404) in
 * the browser against the real API (backend `e2e/seed.js`):
 *
 * - Messages: the category chips, "New message" (parents, colleagues, the
 *   School office), the office thread reaching the admin, Call only in the
 *   parent's thread, "Message the class" from a lesson, group info (the
 *   description edited by the group admin, the "Group admin" badge, no editor
 *   for a plain member), images and the media tabs, and the push every other
 *   member gets for a message (read from the API's log, see below).
 * - Notifications: the tab counts, Mark all as read, a notification's action.
 * - Settings: Account (saved on blur, email read-only), the landing page,
 *   sessions and "Sign out of other devices", the password rules from
 *   `GET /auth/password-policy`, a new support ticket (v1.5).
 * - Forgotten password (the code read from the backend's mail sink), Attendance
 *   history, `/resources?upload=1`, Curriculum from Subjects, the 404.
 * - axe on the new screens in both themes, and screenshots
 *   (`e2e/screenshots/redesign-r4-*.png`: desktop light and dark, phone).
 *
 * Settings the tests change belong to the third teacher (signed in fresh, so
 * the stored teacher session is never signed out) and are put back.
 *
 * Optional, from the environment:
 * - `E2E_API_LOG`: the API's log file, the API started with `LOG_LEVEL=debug`.
 *   The push check reads the chat push job's result from it; skipped without.
 * - `E2E_REMINDER=weekday|weekend`: the register reminder check, for an API
 *   started with `E2E_MODE=true E2E_CLOCK_NOW=<a weekday, or a Saturday, at
 *   registerCloseTime − 29 minutes, school time>` after `seed.js --reset`.
 */
const ALLOW: readonly Allowed[] = [
  { kind: "external", match: /fonts\.googleapis\.com|fonts\.gstatic\.com/, reason: "Google Fonts; blocked by the harness" },
];
const THEME_KEY = "talim_teacher_theme";
const RUN = Date.now().toString(36).slice(-5);
/** A 1x1 PNG. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
/** New contexts in this file would inherit the teacher's stored session (`test.use`): these start signed out. */
const SIGNED_OUT = { cookies: [], origins: [] };
const ONBOARDING_STEPS = ["teacher-profile", "upload-resource", "mark-attendance", "view-notifications", "create-curriculum", "create-group-chat"];

interface Participant {
  _id?: string;
  userId?: string;
}
interface Room {
  _id: string;
  type: string;
  name?: string;
  category?: string;
  subtitle?: string;
  callPhone?: string | null;
  description?: string | null;
  admins?: { id: string; name: string }[];
  participants?: (Participant | string)[];
}
interface Contact {
  userId: string;
  name: string;
  group: "parent" | "colleague" | "office";
  subtitle: string;
  phone: string | null;
}
interface Counts {
  all: number;
  unread: number;
  byCategory: Record<string, { all: number; unread: number }>;
}
interface Media {
  items: { url: string; name: string | null }[];
  counts: { image: number; video: number; document: number; link: number };
}
interface Lesson {
  course: { id: string; title: string };
  class: { id: string; name: string };
}
interface Policy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  historyCount: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const subOf = (jwt: string): string => JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).sub;
const idOf = (p: Participant | string): string => (typeof p === "string" ? p : String(p.userId ?? p._id));

let token = "";
let admin = "";
let third = "";
let me = "";
let thirdId = "";
let classRoom = "";
let parent: Contact;
let colleague: Contact;

test.use({ storageState: authFile("teacher") });
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  token = await apiLogin(ACCOUNTS.teacher);
  admin = await apiLogin(ACCOUNTS.schoolAdmin);
  third = await apiLogin(ACCOUNTS.thirdTeacher);
  me = subOf(token);
  thirdId = subOf(third);
  const rooms = await apiCall<Room[]>(token, "GET", "/chat/rooms");
  classRoom = rooms.find((r) => r.type === "class_group")!._id;
  const contacts = await apiCall<Contact[]>(token, "GET", "/chat/contacts");
  parent = contacts.find((c) => c.group === "parent" && c.name === ACCOUNTS.parent.name)!;
  colleague = contacts.find((c) => c.group === "colleague" && c.name === ACCOUNTS.secondTeacher.name)!;
  // A direct chat with the parent and one with a colleague, so every chip has a thread (both are reused when they exist).
  await apiCall(token, "POST", "/chat/rooms", { type: "one_to_one", participants: [me, parent.userId] });
  await apiCall(token, "POST", "/chat/rooms", { type: "one_to_one", participants: [me, colleague.userId] });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Opens Messages (optionally on a room) and waits for the conversations. */
async function openMessages(page: Page, room?: string): Promise<void> {
  await page.goto(room ? `/messages?room=${room}` : "/messages");
  await dismissGuide(page, 3_000);
  await expect(page.getByRole("list", { name: "Conversations" })).toBeVisible({ timeout: 30_000 });
}

/** The conversation's row in the list. */
const threadRow = (page: Page, name: string) => page.getByRole("list", { name: "Conversations" }).getByRole("listitem").filter({ hasText: name });

/** Sends a text message from the open conversation and waits for it on screen. */
async function send(page: Page, text: string): Promise<void> {
  await page.getByRole("textbox", { name: "Message" }).fill(text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText(text).first()).toBeVisible();
}

/** Opens the conversation info of the open room. */
async function openInfo(page: Page) {
  await page.getByRole("button", { name: "Conversation info" }).click();
  const info = page.getByRole("dialog", { name: /^Conversation info: / });
  await expect(info).toBeVisible();
  return info;
}

/** The latest messages of a room, as the API has them. */
async function messagesOf(tokenFor: string, room: string) {
  return (await apiCall<{ messages: { _id: string; text?: string; content?: string }[] }>(tokenFor, "GET", `/chat/rooms/${room}/messages/cursor?limit=30`)).messages;
}

/** Opens a page and waits for the response that feeds it. */
async function openPage(page: Page, route: string, ready: RegExp): Promise<void> {
  const loaded = page.waitForResponse((r) => ready.test(r.url()) && r.ok());
  await page.goto(route);
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
}

/**
 * A new, signed-out browser context signed in as `account` through the form.
 * The onboarding checklist is marked done on this device first, so sign-in goes
 * to the landing page instead of onboarding.
 */
async function freshSignIn(browser: Browser, baseURL: string | undefined, account: Account, userId: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL, storageState: SIGNED_OUT, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    [`teacher_onboarding_${userId}`, JSON.stringify({ completedSteps: ONBOARDING_STEPS, phase1Completed: true, setupDismissed: true })] as const,
  );
  await signInThroughUi(page, account);
  return { context, page };
}

// ─── Messages ───────────────────────────────────────────────────────────────

test("New message lists the parent, colleagues and the School office; the office thread reaches the admin", async ({ page, monitor }) => {
  await openMessages(page);
  monitor.clear();
  await page.getByRole("button", { name: "New message" }).first().click();
  const sheet = page.getByRole("dialog", { name: "New message" });
  await expect(sheet).toBeVisible();
  const section = (title: string) => sheet.getByRole("region", { name: title });
  await expect(section("Parents").getByRole("button").filter({ hasText: parent.name })).toContainText(parent.subtitle);
  for (const name of [ACCOUNTS.secondTeacher.name, ACCOUNTS.thirdTeacher.name]) {
    await expect(section("Colleagues").getByRole("button").filter({ hasText: name })).toBeVisible();
  }
  await expect(section("Colleagues").getByRole("button").filter({ hasText: ACCOUNTS.teacher.name })).toHaveCount(0);

  const opened = page.waitForResponse((r) => r.url().endsWith("/chat/office") && r.request().method() === "POST");
  await section("School office").getByRole("button").filter({ hasText: "School office" }).click();
  expect((await opened).ok()).toBe(true);
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/messages\?room=[a-f0-9]{24}/);
  const officeRoom = new URL(page.url()).searchParams.get("room")!;
  await expect(page.getByRole("heading", { level: 2, name: "School office" })).toBeVisible();

  const text = `E2E office hello ${RUN}`;
  await send(page, text);
  // Every admin reads the teacher's office room (§28): the admin sees the thread and the message.
  await expect
    .poll(
      async () => {
        const room = (await apiCall<Room[]>(admin, "GET", "/chat/rooms")).find((r) => r._id === officeRoom);
        if (!room) return "the admin has no such room";
        const seen = (await messagesOf(admin, officeRoom)).some((m) => (m.text ?? m.content) === text);
        return seen ? `${room.category} · ${room.subtitle}` : "the message is missing";
      },
      { timeout: 20_000 },
    )
    .toBe(`office · Office thread · ${ACCOUNTS.teacher.name}`);
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

test("the category chips filter the conversations, and each chip counts what it shows", async ({ page }) => {
  await openMessages(page);
  const chips = page.getByRole("group", { name: "Show conversations" });
  const chip = (label: string) => chips.getByRole("button", { name: new RegExp(`^${label}\\s*, \\d+ conversations$`) });
  const list = page.getByRole("list", { name: "Conversations" });
  const cases: [string, string[], string[]][] = [
    ["Parents", [parent.name], ["Class Group Chat", "School office", colleague.name]],
    ["Colleagues", [colleague.name], [parent.name, "Class Group Chat", "School office"]],
    ["Class groups", ["Class Group Chat"], [parent.name, colleague.name, "School office"]],
    ["Office", ["School office"], [parent.name, colleague.name, "Class Group Chat"]],
    ["All", [parent.name, colleague.name, "Class Group Chat", "School office"], []],
  ];
  for (const [label, shown, hidden] of cases) {
    await chip(label).click();
    await expect(chip(label)).toHaveAttribute("aria-pressed", "true");
    for (const name of shown) await expect(threadRow(page, name).first()).toBeVisible();
    for (const name of hidden) await expect(threadRow(page, name)).toHaveCount(0);
    const rows = await list.getByRole("listitem").count();
    await expect(chip(label)).toHaveAccessibleName(new RegExp(`^${label}\\s*, ${rows} conversations$`));
  }
});

test("Call is offered only in the thread with a parent, and dials the parent's phone", async ({ page }) => {
  const rooms = await apiCall<Room[]>(token, "GET", "/chat/rooms");
  const parentRoom = rooms.find((r) => r.category === "parent" && r.subtitle?.startsWith("Parent of"))!;
  expect(parentRoom.callPhone).toBe(parent.phone);
  await openMessages(page, parentRoom._id);
  await expect(page.getByRole("heading", { level: 2, name: parent.name })).toBeVisible();
  await expect(page.getByRole("link", { name: `Call ${parent.name}` })).toHaveAttribute("href", `tel:${parent.phone!.replace(/[^\d+]/g, "")}`);

  for (const [category, name] of [["colleague", colleague.name], ["class_group", "Class Group Chat"], ["office", "School office"]] as const) {
    const room = rooms.find((r) => r.category === category && (category !== "colleague" || r.subtitle?.includes("colleague")))!;
    await threadRow(page, name).first().click();
    await expect(page).toHaveURL(new RegExp(`room=${room._id}`));
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Call / })).toHaveCount(0);
  }
});

test("Message the class in a lesson sheet opens the class group", async ({ page }) => {
  const week = await apiCall<{ lessons: Lesson[] }>(token, "GET", "/timetable/me");
  const lesson = week.lessons.find((l) => l.class.name === "Grade 5A");
  test.skip(!lesson, "no Grade 5A lesson this week");
  await openPage(page, "/timetable", /\/timetable\/me/);
  const title = `${lesson!.course.title} · ${lesson!.class.name}`;
  await page.getByRole("button", { name: new RegExp(`^${escape(title)}, `) }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: title })).toBeVisible();
  await expect(sheet.getByText("The Grade 5A class group in Messages")).toBeVisible();
  await sheet.getByRole("link", { name: "Message", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/messages\\?room=${classRoom}`));
  await expect(page.getByRole("heading", { level: 2, name: "Class Group Chat" })).toBeVisible();
  await expect(page.getByText("Class group · 2 students").first()).toBeVisible();
});

test("group info: the group admin edits the description, which stays after a reload; a plain member gets no editor", async ({ page, browser, baseURL }) => {
  // The third teacher (Basic Science 5A) joins the class group as a plain member (a no-op when already in).
  await apiCall(token, "POST", `/chat/rooms/${classRoom}/participants/${thirdId}`);
  const description = `E2E ${RUN}: homework is posted here every Friday. Ask questions any time before 6pm.`;

  await openMessages(page, classRoom);
  let info = await openInfo(page);
  const adminRow = info.getByRole("listitem").filter({ hasText: `${ACCOUNTS.teacher.name} (you)` });
  await expect(adminRow.getByText("Group admin")).toBeVisible();
  await expect(info.getByRole("listitem").filter({ hasText: ACCOUNTS.thirdTeacher.name }).getByText("Group admin")).toHaveCount(0);
  let details = info.getByRole("region", { name: "Group details" });
  await details.getByRole("button", { name: /^(Edit|Add a description)$/ }).click();
  await details.getByRole("textbox", { name: "Description" }).fill(description);
  const saved = page.waitForResponse((r) => r.url().endsWith(`/chat/rooms/${classRoom}`) && r.request().method() === "PATCH");
  await details.getByRole("button", { name: "Save" }).click();
  const res = await saved;
  expect(res.status()).toBe(200);
  expect(res.request().postDataJSON()).toEqual({ description });
  await expect(details.getByText(description)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Class Group Chat" })).toBeVisible();
  await dismissGuide(page, 2_000);
  info = await openInfo(page);
  details = info.getByRole("region", { name: "Group details" });
  await expect(details.getByText(description)).toBeVisible();
  expect((await apiCall<Room[]>(token, "GET", "/chat/rooms")).find((r) => r._id === classRoom)!.description).toBe(description);

  // The third teacher is a member but not an admin: the description is shown, with no way to change it.
  const { context, page: member } = await freshSignIn(browser, baseURL, ACCOUNTS.thirdTeacher, thirdId);
  try {
    await openMessages(member, classRoom);
    await expect(member.getByRole("heading", { level: 2, name: "Class Group Chat" })).toBeVisible();
    const theirs = await openInfo(member);
    const theirDetails = theirs.getByRole("region", { name: "Group details" });
    await expect(theirDetails.getByText(description)).toBeVisible();
    await expect(theirDetails.getByRole("button", { name: /^(Edit|Add a description)$/ })).toHaveCount(0);
    await expect(theirDetails.getByRole("button", { name: "Edit the group name" })).toHaveCount(0);
    await expect(theirDetails.getByRole("textbox")).toHaveCount(0);
    await expect(theirs.getByRole("listitem").filter({ hasText: ACCOUNTS.teacher.name }).getByText("Group admin")).toBeVisible();
    await expect(theirs.getByRole("button", { name: "Add students" })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("an image and a link sent in the class group are listed under Images and Links, with the counts on the tabs", async ({ page, monitor }) => {
  const name = `e2e-photo-${RUN}.png`;
  const fileUrl = `https://res.cloudinary.com/e2e-dummy-cloud/image/upload/v1/${name}`;
  // The API uploads chat files to Cloudinary, which the e2e API has no keys for: answer the upload here.
  await page.route(`${API_URL}/upload/chat-attachment`, (route) => {
    const body = { url: fileUrl, type: "image", name, mimeType: "image/png", size: PNG.length, width: 1, height: 1 };
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(ENVELOPE === "true" ? { success: true, data: body } : body) });
  });
  await openMessages(page, classRoom);
  monitor.clear();
  await page.locator('input[type="file"][multiple]').setInputFiles({ name, mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const link = `https://example.org/e2e-${RUN}`;
  await send(page, `The reading for Friday: ${link}`);

  await expect
    .poll(async () => (await apiCall<Media>(token, "GET", `/chat/rooms/${classRoom}/media?kind=image`)).items.some((i) => i.url === fileUrl), { timeout: 20_000 })
    .toBe(true);
  const media = await apiCall<Media>(token, "GET", `/chat/rooms/${classRoom}/media?kind=link`);
  expect(media.items.some((i) => i.url === link)).toBe(true);
  expect(media.counts.image).toBeGreaterThan(0);

  const info = await openInfo(page);
  const tabs = info.getByRole("tablist", { name: "Conversation info" });
  for (const [label, count] of [
    ["Images", media.counts.image],
    ["Videos", media.counts.video],
    ["Documents", media.counts.document],
    ["Links", media.counts.link],
  ] as const) {
    await expect(tabs.getByRole("tab", { name: new RegExp(`^${label}`) })).toHaveText(new RegExp(`^${label}\\s*${count}$`));
  }
  await tabs.getByRole("tab", { name: /^Images/ }).click();
  await expect(info.getByRole("list", { name: "Shared images" }).getByRole("button", { name: new RegExp(`^Open ${escape(name)}, from ${ACCOUNTS.teacher.name}`) })).toBeVisible();
  await tabs.getByRole("tab", { name: /^Links/ }).click();
  await expect(info.getByRole("list", { name: "Shared links" }).getByText(link).first()).toBeVisible();
  // The image itself is on Cloudinary, which the harness blocks.
  expect(monitor.unexpected([...ALLOW, { kind: "external", match: /res\.cloudinary\.com/, reason: "the made-up image address; blocked by the harness" }])).toEqual([]);
});

test("the page guide's button never covers Send, on a desktop or a phone", async ({ browser, baseURL }) => {
  const devices = [
    { name: "desktop", viewport: { width: 1440, height: 900 } },
    { name: "phone", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  ];
  for (const { name, ...device } of devices) {
    const context = await browser.newContext({ baseURL, storageState: authFile("teacher"), ...device });
    const page = await context.newPage();
    await page.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
    await page.goto(`/messages?room=${classRoom}`);
    await dismissGuide(page, 3_000);
    await expect(page.getByRole("heading", { level: 2, name: "Class Group Chat" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("textbox", { name: "Message" }).fill("Almost done");
    const send = page.getByRole("button", { name: "Send", exact: true });
    // On a desktop the conversation fits the window as it opens; a phone scrolls the page down to the composer.
    if (name === "phone") {
      await send.evaluate((el) => {
        for (let p = el.parentElement; p; p = p.parentElement) if (p.scrollHeight > p.clientHeight) p.scrollTop = p.scrollHeight;
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
    }
    const guide = page.getByRole("button", { name: "Guide", exact: true });
    await expect(guide).toBeVisible();
    const a = (await send.boundingBox())!;
    const b = (await guide.boundingBox())!;
    const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    expect(overlap, `${name}: Send ${JSON.stringify(a)} and Guide ${JSON.stringify(b)} overlap`).toBe(false);
    expect(a.y + a.height, `${name}: Send is on screen`).toBeLessThanOrEqual(device.viewport.height);
    await context.close();
  }
});

test("a message in the class group is pushed to every other member", async ({ page }) => {
  const log = process.env.E2E_API_LOG;
  test.skip(!log, "set E2E_API_LOG to the API's log file (the API started with LOG_LEVEL=debug)");
  const room = (await apiCall<Room[]>(token, "GET", "/chat/rooms")).find((r) => r._id === classRoom)!;
  const others = (room.participants ?? []).map(idOf).filter((id) => id !== me);
  expect(others.length).toBeGreaterThanOrEqual(3); // Ada, Ben and the third teacher

  await openMessages(page, classRoom);
  const text = `E2E push check ${RUN}`;
  await send(page, text);
  let messageId = "";
  await expect
    .poll(async () => {
      messageId = (await messagesOf(token, classRoom)).find((m) => (m.text ?? m.content) === text)?._id ?? "";
      return messageId;
    })
    .not.toBe("");
  // The chat push job (one per message) goes to every member but the sender, online or not (Round 4 B);
  // the processor logs what it sent on each channel. Without a device or a browser subscription the
  // phone channel still counts the dispatch; a switched-off recipient would count as suppressed.
  await expect
    .poll(
      () => {
        const line = fs.readFileSync(log!, "utf8").match(new RegExp(`Chat push for message ${messageId}: (\\{[^}]*\\})`));
        return line ? (JSON.parse(line[1]) as { mobile: number; web: number; suppressed: number }) : null;
      },
      { timeout: 30_000 },
    )
    .toEqual({ mobile: others.length, web: 0, suppressed: 0 });
});

// ─── Notifications ──────────────────────────────────────────────────────────

test("Notifications: the tabs carry the counts, Mark all as read clears them, and an action opens its page", async ({ page, monitor }) => {
  // Something unread for certain: a fresh announcement from the school.
  await apiCall(admin, "POST", "/notifications/announcements", {
    title: `E2E notice ${RUN}`,
    content: "Staff meeting moved to Thursday at 2pm.",
    audience: ["teachers"],
    status: "PUBLISHED",
  });
  const counts = await apiCall<Counts>(token, "GET", "/notifications/counts");
  expect(counts.unread).toBeGreaterThan(0);
  const cat = (c: string) => counts.byCategory[c]?.all ?? 0;
  const expected: [string, number][] = [
    ["All", counts.all],
    ["Unread", counts.unread],
    ["Academics", cat("academics") + cat("grading") + cat("resources")],
    ["Attendance", cat("attendance")],
    ["Announcements", cat("announcement")],
  ];

  await openPage(page, "/notifications", /\/notifications\/counts$/);
  monitor.clear();
  const tabs = page.getByRole("tablist", { name: "Show notifications" });
  const tab = (label: string) => tabs.getByRole("tab", { name: new RegExp(`^${label}`) });
  for (const [label, n] of expected) await expect(tab(label)).toHaveText(new RegExp(`^${label}\\s*${n}$`));
  await expect(page.getByRole("list", { name: "Notifications" }).getByText(`E2E notice ${RUN}`)).toBeVisible();

  const marked = page.waitForResponse((r) => r.url().endsWith("/notifications/read-all") && r.request().method() === "PATCH");
  await page.getByRole("button", { name: "Mark all as read" }).click();
  expect((await marked).ok()).toBe(true);
  await expect(tab("Unread")).toHaveText(/^Unread\s*0$/);
  await expect(page.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
  expect((await apiCall<Counts>(token, "GET", "/notifications/counts")).unread).toBe(0);
  await page.reload();
  await expect(tab("Unread")).toHaveText(/^Unread\s*0$/);
  await expect(tab("All")).toHaveText(new RegExp(`^All\\s*${counts.all}$`));

  // The seed's publish confirmation links to its scores (§30 target, "View scores").
  await page.getByRole("list", { name: "Notifications" }).getByRole("button").filter({ hasText: "Grades published: First Term CA 1" }).first().click();
  const detail = page.getByRole("article", { name: "Grades published: First Term CA 1" }).first();
  await expect(detail).toBeVisible();
  await detail.getByRole("link", { name: "View scores" }).click();
  await expect(page).toHaveURL(/\/grading\?courseId=[a-f0-9]{24}&assessmentId=[a-f0-9]{24}/);
  await dismissGuide(page, 3_000);
  await expect(page.getByText(/^First Term CA 1 · Mathematics 5A · Grade 5A/)).toBeVisible();
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

// ─── Settings ───────────────────────────────────────────────────────────────

test("Account: the last name saves when the field is left and is kept after a reload; the email is read-only", async ({ browser, baseURL }) => {
  const { context, page } = await freshSignIn(browser, baseURL, ACCOUNTS.thirdTeacher, thirdId);
  try {
    await openPage(page, "/settings?tab=account", /\/teacher\/settings$/);
    const panel = page.locator("#settings-panel");
    const last = panel.getByLabel("Last name");
    await expect(last).toHaveValue("Third");
    await last.fill("Thirdly");
    const saved = page.waitForResponse((r) => r.url().endsWith("/teacher/settings/profile") && r.request().method() === "PATCH");
    await last.press("Tab");
    const res = await saved;
    expect(res.status()).toBe(200);
    expect(res.request().postDataJSON()).toEqual({ lastName: "Thirdly" });
    await expect(panel.getByText("Saved", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.locator("#settings-panel").getByLabel("Last name")).toHaveValue("Thirdly");
    // The email is shown, with who changes it, and is not a field.
    await expect(panel.getByText(ACCOUNTS.thirdTeacher.email)).toBeVisible();
    await expect(panel.getByText("The school office changes your email.")).toBeVisible();
    await expect(panel.getByRole("textbox")).toHaveCount(3); // first name, last name and phone
    await expect(panel.getByRole("textbox", { name: /email/i })).toHaveCount(0);
  } finally {
    await apiCall(third, "PATCH", "/teacher/settings/profile", { lastName: "Third" });
    await context.close();
  }
});

test("Teaching preferences: with Timetable as the first screen, the next sign-in opens the timetable", async ({ browser, baseURL }) => {
  const { context, page } = await freshSignIn(browser, baseURL, ACCOUNTS.thirdTeacher, thirdId);
  try {
    await openPage(page, "/settings?tab=teaching", /\/teacher\/settings$/);
    const saved = page.waitForResponse((r) => r.url().endsWith("/teacher/settings/preferences") && r.request().method() === "PATCH");
    await page.getByLabel("First screen after sign-in").selectOption("timetable");
    expect((await saved).ok()).toBe(true);

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible({ timeout: 30_000 });
    await page.locator("#identifier").fill(ACCOUNTS.thirdTeacher.email);
    await page.locator("#password").fill(ACCOUNTS.thirdTeacher.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/timetable(\?|$)/, { timeout: 60_000 });

    // Back to Today, through the same control.
    await openPage(page, "/settings?tab=teaching", /\/teacher\/settings$/);
    const reset = page.waitForResponse((r) => r.url().endsWith("/teacher/settings/preferences") && r.request().method() === "PATCH");
    await page.getByLabel("First screen after sign-in").selectOption("dashboard");
    expect((await reset).ok()).toBe(true);
  } finally {
    const current = await apiCall<{ preferences: { teaching: Record<string, unknown> } }>(third, "GET", "/teacher/settings");
    if (current.preferences.teaching.landingPage !== "dashboard") {
      await apiCall(third, "PATCH", "/teacher/settings/preferences", { teaching: { ...current.preferences.teaching, landingPage: "dashboard" } });
    }
    await context.close();
  }
});

test("Security: this device is marked, and Sign out of other devices ends the other session", async ({ browser, baseURL }) => {
  const a = await freshSignIn(browser, baseURL, ACCOUNTS.thirdTeacher, thirdId);
  const b = await freshSignIn(browser, baseURL, ACCOUNTS.thirdTeacher, thirdId);
  try {
    await openPage(a.page, "/settings?tab=security", /\/auth\/sessions$/);
    const panel = a.page.locator("#settings-panel");
    const others = panel.getByRole("button", { name: /^Sign out of (?!other devices$)/ });
    await expect(panel.getByText("This device", { exact: true })).toHaveCount(1);
    await expect(others.first()).toBeVisible();

    await panel.getByRole("button", { name: "Sign out of other devices" }).click();
    const confirm = a.page.getByRole("dialog", { name: "Sign out of other devices?" });
    const revoked = a.page.waitForResponse((r) => r.url().endsWith("/auth/sessions/revoke-others") && r.request().method() === "POST");
    await confirm.getByRole("button", { name: "Sign out", exact: true }).click();
    const res = await revoked;
    expect(res.ok()).toBe(true);
    expect(unwrap<{ revoked: number }>(await res.json()).revoked).toBeGreaterThanOrEqual(1);
    await expect(others).toHaveCount(0);
    await expect(panel.getByText("This device", { exact: true })).toHaveCount(1);

    // The other browser: its next refresh is refused, and once its access token is gone it is back at sign-in.
    // The probe names the portal like the app does, so it reads this portal's own cookie (`refreshToken_teachers`).
    const status = await b.page.evaluate(
      async ({ api, header, app }) =>
        (await fetch(`${api}/auth/refresh`, { method: "POST", credentials: "include", headers: { [header]: app } })).status,
      { api: API_URL, header: TALIM_APP_HEADER, app: TALIM_APP },
    );
    expect(status).toBe(401);
    await b.page.evaluate(() => localStorage.removeItem("accessToken"));
    await b.page.goto("/dashboard");
    await expect(b.page.getByRole("heading", { name: "Welcome back" })).toBeVisible({ timeout: 30_000 });
    await expect(b.page).toHaveURL(/localhost:\d+\/$/);

    // This browser is still signed in.
    await openPage(a.page, "/settings?tab=security", /\/auth\/sessions$/);
    await expect(a.page.locator("#settings-panel").getByText("This device", { exact: true })).toHaveCount(1);
  } finally {
    await a.context.close();
    await b.context.close();
  }
});

test("Security: the password rules are the ones GET /auth/password-policy answers", async ({ page }) => {
  const policy = unwrap<Policy>(await (await fetch(`${API_URL}/auth/password-policy`)).json());
  const parts: string[] = [];
  if (policy.requireUppercase && policy.requireLowercase) parts.push("upper and lower case letters");
  else if (policy.requireUppercase) parts.push("an uppercase letter");
  else if (policy.requireLowercase) parts.push("a lowercase letter");
  if (policy.requireNumber) parts.push("a number");
  if (policy.requireSymbol) parts.push("a symbol");
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts.join("");
  const summary = `At least ${policy.minLength} characters${parts.length ? `, with ${joined}` : ""}`;

  await openPage(page, "/settings?tab=security", /\/auth\/password-policy$/);
  const panel = page.locator("#settings-panel");
  await expect(panel.getByText(summary, { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Change password" }).click();
  const sheet = page.getByRole("dialog", { name: "Change password" });
  await expect(sheet.getByLabel("New password", { exact: true })).toHaveAttribute("placeholder", summary);
  if (policy.historyCount === 1) await expect(sheet.getByText("You can't reuse your last password.")).toBeVisible();
  // A password that is long enough but breaks the symbol rule is told so.
  await sheet.getByLabel("New password", { exact: true }).fill("Abcdefgh1".padEnd(policy.minLength, "x"));
  if (policy.requireSymbol) await expect(sheet.getByText("Include a symbol such as ! @ # $ or %.")).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Update password" })).toBeDisabled();
});

test("Help: a new ticket goes to the Talim desk and opens its thread", async ({ page }) => {
  await openPage(page, "/settings?tab=help", /\/teacher\/settings$/);
  await page.locator("#settings-panel").getByRole("button", { name: "New ticket" }).click();
  const sheet = page.getByRole("dialog", { name: "How can we help?" });
  await expect(sheet.getByRole("group", { name: "Send to" })).toContainText("Talim support");
  await sheet.getByRole("button", { name: "Messages", exact: true }).click();
  await sheet.getByLabel("Subject").fill(`E2E ${RUN}: group picture`);
  await sheet.getByLabel("Message").fill("The group picture does not change after I upload a new one.");
  const sent = page.waitForResponse((r) => r.url().endsWith("/tickets") && r.request().method() === "POST");
  await sheet.getByRole("button", { name: "Send to Talim support" }).click();
  const res = await sent;
  expect(res.status()).toBe(201);
  const ticket = unwrap<{ id: string; reference: string }>(await res.json());
  expect(ticket.reference).toMatch(/^TS-[A-HJ-NP-Z2-9]{5}$/);
  expect(res.request().postDataJSON()).toMatchObject({ desk: "talim", area: "messages" });
  const thread = page.getByRole("dialog", { name: `E2E ${RUN}: group picture` });
  await expect(thread.getByText(ticket.reference, { exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`ticket=${ticket.id}`));
});

// ─── Signed-out pages and the rest of Round 5 ───────────────────────────────

/** The newest code emailed to `email` after `since` (the backend's mail sink). */
function resetCode(email: string, since: number): string | null {
  if (!fs.existsSync(MAIL_DIR)) return null;
  const files = fs
    .readdirSync(MAIL_DIR)
    .filter((f) => f.endsWith(".json") && Number(f.split("-")[0]) >= since)
    .sort();
  for (const file of files.reverse()) {
    const mail = JSON.parse(fs.readFileSync(path.join(MAIL_DIR, file), "utf8")) as { to: string[]; raw: string };
    if (!mail.to.some((to) => to.includes(email))) continue;
    // The code is the only element whose whole text is six digits (headers hold other digit runs).
    const code = mail.raw.match(/>\s*(\d{6})\s*</);
    if (code) return code[1];
  }
  return null;
}

test("Forgot password: a code by email, a new password, and the account signs in with it", async ({ browser, baseURL }) => {
  const temp = ACCOUNTS.tempTeacher;
  const next = `Reset#Pass${RUN}9`;
  seed("--rearm");
  const context = await browser.newContext({ baseURL, storageState: SIGNED_OUT });
  const page = await context.newPage();
  await page.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
  try {
    // Opened straight from a link, signed out: the page stays once the session probe has been refused.
    const probed = page.waitForResponse((r) => r.url().endsWith("/auth/refresh"));
    await page.goto("/forgot-password");
    expect((await probed).status()).toBe(401);
    await page.waitForTimeout(2_000);
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    const since = Date.now() - 1_000;
    await page.getByLabel("Email address").fill(temp.email);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByRole("heading", { name: "Enter the code" })).toBeVisible();
    let code: string | null = null;
    await expect
      .poll(() => (code = resetCode(temp.email, since)), { timeout: 20_000, message: `a code in ${MAIL_DIR}` })
      .toMatch(/^\d{6}$/);
    await page.getByLabel("6-digit code").fill(code!);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill(next);
    await page.getByLabel("Confirm new password").fill(next);
    await page.getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByRole("dialog").filter({ has: page.locator("#reset-success-title") })).toBeVisible();
    expect(await apiLogin({ email: temp.email, password: next })).toBeTruthy();
  } finally {
    await context.close();
    seed("--rearm");
  }
});

test("Attendance history: the period presets and the dates filter the class's figures", async ({ page, monitor }) => {
  await openPage(page, "/analytics/attendance", /\/teachers\/me\/classes\/[a-f0-9]{24}\/students$/);
  monitor.clear();
  const picker = page.locator("#history-class");
  await expect(picker).toHaveValue(/[a-f0-9]{24}/);
  await expect(picker.locator("option:checked")).toHaveText(/Grade 5A/);
  const period = page.getByRole("group", { name: "Period" });
  for (const preset of ["This week", "This month", "This term"]) {
    await period.getByRole("button", { name: preset }).click();
    await expect(period.getByRole("button", { name: preset })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { level: 2, name: /^Grade 5A · / })).toBeVisible();
  }
  // The seed's five past school days, and nothing from today: From the first of them to the day before today.
  const from = page.locator("#history-from");
  const to = page.locator("#history-to");
  const today = await to.getAttribute("max");
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const earlier = new Date(Date.parse(`${today}T00:00:00Z`) - 10 * 86_400_000).toISOString().slice(0, 10);
  await from.fill(earlier);
  await to.fill(yesterday);
  for (const preset of ["This week", "This month", "This term"]) {
    await expect(period.getByRole("button", { name: preset })).toHaveAttribute("aria-pressed", "false");
  }
  const tile = (label: string) => page.locator('[data-guide="history-stats"]').getByText(label, { exact: true }).locator("xpath=..");
  // The class's figures are the sum of each student's for the range (GET /attendance/student/:id/kpis).
  // In a database seeded today that is Ada present five days and Ben present three, late once and absent
  // once: 8, 1, 1, no leave, 90%. A database seeded on several days holds more past days.
  const classes = await apiCall<{ id: string; name: string }[]>(token, "GET", "/teachers/me/classes");
  const grade5A = classes.find((c) => c.name === "Grade 5A")!.id;
  const roster = await apiCall<{ students: { id: string }[] }>(token, "GET", `/teachers/me/classes/${grade5A}/students`);
  const sum = { present: 0, late: 0, absent: 0, onLeave: 0 };
  for (const student of roster.students) {
    const k = await apiCall<{ presentDays: number; lateDays: number; absentDays: number; excusedDays: number }>(
      token,
      "GET",
      `/attendance/student/${student.id}/kpis?startDate=${earlier}&endDate=${yesterday}`,
    );
    sum.present += k.presentDays ?? 0;
    sum.late += k.lateDays ?? 0;
    sum.absent += k.absentDays ?? 0;
    sum.onLeave += k.excusedDays ?? 0;
  }
  expect(sum.present + sum.late + sum.absent, "the seed's past days are in the range").toBeGreaterThan(0);
  const rate = Math.round(((sum.present + sum.late) / (sum.present + sum.late + sum.absent)) * 1000) / 10;
  await expect(tile("Present")).toHaveText(new RegExp(`^Present\\s*${sum.present}$`));
  await expect(tile("Late")).toHaveText(new RegExp(`^Late\\s*${sum.late}$`));
  await expect(tile("Absent")).toHaveText(new RegExp(`^Absent\\s*${sum.absent}$`));
  await expect(tile("On leave")).toHaveText(new RegExp(`^On leave\\s*${sum.onLeave}$`));
  await expect(tile("Attendance rate")).toHaveText(new RegExp(`^Attendance rate\\s*${String(rate).replace(".", "\\.")}(\\.0)?%$`));
  // A range that ends before it starts is explained, not loaded.
  await from.fill(yesterday);
  await to.fill(earlier);
  await expect(page.locator("#history-range-error")).toHaveText("The start date is after the end date.");
  await expect(page.getByRole("heading", { name: "Check the dates" })).toBeVisible();
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

test("/resources?courseId=…&upload=1 lands on Subjects' Resources with the upload sheet open", async ({ page }) => {
  const cards = await apiCall<{ course: { id: string; code: string } }[]>(token, "GET", "/scheme-of-work/me");
  const mth = cards.find((c) => c.course.code === "MTH-5A")!.course.id;
  await page.goto(`/resources?courseId=${mth}&upload=1`);
  await expect(page).toHaveURL(new RegExp(`/subjects\\?.*courseId=${mth}`));
  expect(new URL(page.url()).searchParams.get("tab")).toBe("resources");
  await dismissGuide(page, 2_000);
  const sheet = page.getByRole("dialog", { name: "Upload a resource" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("button", { name: /^Mathematics 5A/ })).toHaveAttribute("aria-pressed", "true");
  // Behind the sheet, the Resources tab of that subject.
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /Resources/ })).toHaveAttribute("aria-selected", "true");
});

test("Subjects links to the written curriculum of the subject", async ({ page }) => {
  await openPage(page, "/subjects", /\/scheme-of-work\/me(\?|$)/);
  const link = page.locator('a[href^="/curriculum?courseId="]').first();
  await expect(link).toBeVisible();
  const href = (await link.getAttribute("href"))!;
  const courseId = new URL(href, "http://x").searchParams.get("courseId")!;
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/curriculum\\?courseId=${courseId}`));
  await dismissGuide(page, 2_000);
  await expect(page.locator('[data-guide="curriculum-header"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Choose a subject first" })).toHaveCount(0);
});

test("an unknown address shows the 404 page with a way back", async ({ page }) => {
  const res = await page.goto(`/no-such-page-${RUN}`);
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Error 404")).toBeVisible();
  await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  await page.getByRole("link", { name: "Go to Today" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

// ─── Register reminder (needs the API on a test clock) ──────────────────────

test("register reminder: sent to the class teacher on a school day, never at a weekend", async () => {
  const mode = process.env.E2E_REMINDER;
  test.skip(mode !== "weekday" && mode !== "weekend", "start the API on a test clock (see the file comment) and set E2E_REMINDER=weekday|weekend");
  test.setTimeout(240_000);
  interface Item {
    type: string;
    createdAt: string;
    metadata?: { target?: { page?: string; classId?: string; date?: string }; actionLabel?: string };
  }
  const classes = await apiCall<{ id: string; name: string }[]>(token, "GET", "/teachers/me/classes");
  const grade5A = classes.find((c) => c.name === "Grade 5A")!.id;
  const today = (await apiCall<{ date: string }>(token, "GET", "/teachers/today")).date;
  const reminders = async () => {
    const page = await apiCall<{ data: Item[] }>(token, "GET", `/notifications?recipientId=${me}&page=1&limit=50`);
    return page.data.filter((n) => n.type === "register_reminder" && n.metadata?.target?.classId === grade5A && n.metadata?.target?.date === today);
  };
  if (mode === "weekday") {
    await expect.poll(async () => (await reminders()).length, { timeout: 150_000, intervals: [5_000] }).toBe(1);
    const [reminder] = await reminders();
    expect(reminder.metadata!.target!.page).toBe("attendance");
    expect(reminder.metadata!.actionLabel).toBe("Take register");
  } else {
    // The cron runs every minute: give it two runs inside the window, then nothing may be there.
    await new Promise((resolve) => setTimeout(resolve, 130_000));
    expect(await reminders()).toEqual([]);
  }
});

// ─── axe and screenshots ────────────────────────────────────────────────────

const SETTINGS_TABS = ["account", "notifications", "messages", "teaching", "appearance", "security", "help", "about"];

/** The signed-in screens axe and the screenshots cover: [name, path, the response that feeds it]. */
const SCREENS = (): [string, string, RegExp][] => [
  ["messages", `/messages?room=${classRoom}`, /\/teacher\/settings$/],
  ["notifications", "/notifications", /\/notifications\/counts$/],
  ...SETTINGS_TABS.map((tab): [string, string, RegExp] => [`settings-${tab}`, `/settings?tab=${tab}`, /\/teacher\/settings$/]),
  ["attendance-history", "/analytics/attendance", /\/teachers\/me\/classes\/[a-f0-9]{24}\/students$/],
];

/** axe's serious and critical findings on the page. */
async function seriousIssues(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
  return {
    all: result.violations.map((v) => `${v.id}(${v.impact})`),
    bad: result.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 5) })),
  };
}

for (const theme of ["light", "dark"] as const) {
  test(`axe finds nothing serious or critical on Messages, Notifications, every Settings tab, Attendance history and sign-in (${theme})`, async ({ page, browser, baseURL }) => {
    test.setTimeout(400_000);
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, theme] as const);
    const failures: Record<string, unknown> = {};
    for (const [name, route, ready] of SCREENS()) {
      await openPage(page, route, ready);
      await page.waitForTimeout(600);
      expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(theme === "dark");
      const { all, bad } = await seriousIssues(page);
      console.log(`[axe] ${name} ${theme}: ${all.join(", ") || "none"}; ${bad.length} serious/critical`);
      if (bad.length) failures[name] = bad;
    }
    // The conversation info modal, over Messages.
    await openPage(page, `/messages?room=${classRoom}`, /\/teacher\/settings$/);
    await openInfo(page);
    const modal = await seriousIssues(page);
    console.log(`[axe] messages-info ${theme}: ${modal.all.join(", ") || "none"}; ${modal.bad.length} serious/critical`);
    if (modal.bad.length) failures["messages-info"] = modal.bad;

    // Signed out: sign-in and forgotten password.
    const anon = await browser.newContext({ baseURL, storageState: SIGNED_OUT, colorScheme: theme });
    const anonPage = await anon.newPage();
    await anonPage.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
    await anonPage.addInitScript(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, theme] as const);
    for (const [name, route, heading] of [["sign-in", "/", "Welcome back"], ["forgot-password", "/forgot-password", "Reset your password"]] as const) {
      await anonPage.goto(route);
      await expect(anonPage.getByRole("heading", { name: heading })).toBeVisible();
      await anonPage.waitForTimeout(600);
      const { all, bad } = await seriousIssues(anonPage);
      console.log(`[axe] ${name} ${theme}: ${all.join(", ") || "none"}; ${bad.length} serious/critical`);
      if (bad.length) failures[name] = bad;
    }
    await anon.close();
    expect(failures).toEqual({});
  });
}

/** See 05-today-timetable.spec.ts: the shell scrolls its main column, so grow the viewport first. */
async function shootWhole(page: Page, file: string): Promise<void> {
  const size = page.viewportSize()!;
  const hidden = await page.evaluate(() => {
    let most = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const overflow = getComputedStyle(el).overflowY;
      if ((overflow === "auto" || overflow === "scroll") && el.clientHeight > 200) most = Math.max(most, el.scrollHeight - el.clientHeight);
    }
    return most;
  });
  if (hidden > 0) {
    await page.setViewportSize({ width: size.width, height: Math.min(size.height + hidden, 6_000) });
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: file, fullPage: true });
  if (hidden > 0) await page.setViewportSize(size);
}

test("screenshots of the new pages: desktop light and dark, phone", async ({ browser, baseURL }) => {
  test.setTimeout(600_000);
  fs.mkdirSync("e2e/screenshots", { recursive: true });
  const shots: [string, string, RegExp | null][] = [
    ["messages", `/messages?room=${classRoom}`, /\/teacher\/settings$/],
    ["notifications", "/notifications", /\/notifications\/counts$/],
    ["settings-account", "/settings?tab=account", /\/teacher\/settings$/],
    ["settings-notifications", "/settings?tab=notifications", /\/teacher\/settings$/],
    ["settings-security", "/settings?tab=security", /\/auth\/sessions$/],
    ["settings-help", "/settings?tab=help", /\/teacher\/settings$/],
    ["attendance-history", "/analytics/attendance", /\/teachers\/me\/classes\/[a-f0-9]{24}\/students$/],
    ["curriculum", "/curriculum", null],
    ["not-found", `/no-such-page-${RUN}`, null],
  ];
  for (const [theme, phone] of [["light", false], ["dark", false], ["light", true]] as const) {
    const variant = `${phone ? "mobile" : "desktop"}-${theme}`;
    const device = phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } };
    const context = await browser.newContext({ baseURL, storageState: authFile("teacher"), colorScheme: theme, ...device });
    const page = await context.newPage();
    await page.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
    await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, theme] as const);
    for (const [name, route, ready] of shots) {
      if (ready) await openPage(page, route, ready);
      else {
        await page.goto(route);
        await dismissGuide(page, 2_000);
      }
      await page.waitForTimeout(800);
      await shootWhole(page, `e2e/screenshots/redesign-r4-${name}-${variant}.png`);
    }
    // The conversation info over Messages.
    await openPage(page, `/messages?room=${classRoom}`, /\/teacher\/settings$/);
    await openInfo(page);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `e2e/screenshots/redesign-r4-messages-info-${variant}.png` });
    await context.close();

    // Signed out: sign-in, forgotten password and the temporary-password page.
    const anon = await browser.newContext({ baseURL, storageState: SIGNED_OUT, colorScheme: theme, ...device });
    const anonPage = await anon.newPage();
    await anonPage.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
    await anonPage.addInitScript(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, theme] as const);
    await anonPage.goto("/");
    await expect(anonPage.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await anonPage.waitForTimeout(600);
    await shootWhole(anonPage, `e2e/screenshots/redesign-r4-sign-in-${variant}.png`);
    await anonPage.goto("/forgot-password");
    await expect(anonPage.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await anonPage.waitForTimeout(600);
    await shootWhole(anonPage, `e2e/screenshots/redesign-r4-forgot-password-${variant}.png`);
    seed("--rearm");
    await anonPage.goto("/");
    await anonPage.locator("#identifier").fill(ACCOUNTS.tempTeacher.email);
    await anonPage.locator("#password").fill(ACCOUNTS.tempTeacher.password);
    await anonPage.getByRole("button", { name: "Sign in" }).click();
    await expect(anonPage).toHaveURL(/\/set-password/, { timeout: 30_000 });
    await anonPage.waitForTimeout(800);
    await shootWhole(anonPage, `e2e/screenshots/redesign-r4-set-password-${variant}.png`);
    await anon.close();
  }
});
