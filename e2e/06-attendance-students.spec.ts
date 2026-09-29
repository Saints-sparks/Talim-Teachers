import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import type { Browser, Page } from "@playwright/test";
import { test, expect, type Allowed } from "./support/fixtures";
import { ACCOUNTS, authFile } from "./support/creds";
import { apiCall, apiLogin } from "./support/api";
import { seed } from "./support/backend";
import { dismissGuide } from "./support/ui";

/**
 * The redesigned Attendance (`/attendance`, `GET|PUT /registers/:classId`)
 * and Students (`/students`, `/students/[id]`) pages against the seeded
 * Grade 5A: Ada is markable, Ben is on leave approved for today (so the
 * register has one student to mark), five past school days are recorded.
 * Also the per-page guides, the portal tour, and "Share a resource" from a
 * lesson filing the upload under its scheme-of-work week.
 */
const ALLOW: readonly Allowed[] = [
  { kind: "external", match: /fonts\.googleapis\.com|fonts\.gstatic\.com/, reason: "Google Fonts; blocked by the harness" },
  { kind: "http", match: /GET \/curriculum\?teacherId=[a-f0-9]+ -> 404/, reason: "known backend bug, see 02-smoke.spec.ts" },
];
const THEME_KEY = "talim_teacher_theme";

interface MyClass {
  id: string;
  name: string;
  courses: { id: string; title: string }[];
}
interface RosterBody {
  students: { id: string; name: string }[];
}

let token = "";
let grade5A: MyClass;
let ada = "";

const registerLoaded = (page: Page) =>
  page.waitForResponse((r) => /\/registers\/[a-f0-9]{24}(\?|$)/.test(r.url()) && r.request().method() === "GET" && r.ok());
const radios = (page: Page, student: string) => page.getByRole("radiogroup", { name: `Attendance for ${student}` });
const submitButton = (page: Page) => page.getByRole("button", { name: /^(Submit|Resubmit) register$/ });
const isRegisterPut = (submit: boolean) => (r: { request(): { method(): string; postDataJSON(): unknown }; url(): string }) =>
  r.request().method() === "PUT" && r.url().includes("/registers/") && (r.request().postDataJSON() as { submit?: boolean }).submit === submit;

test.use({ storageState: authFile("teacher") });
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  seed("--reset"); // no attendance and no register today; Ben's leave stays
  token = await apiLogin(ACCOUNTS.teacher);
  const classes = await apiCall<MyClass[]>(token, "GET", "/teachers/me/classes");
  grade5A = classes.find((c) => c.name === "Grade 5A")!;
  const roster = await apiCall<RosterBody>(token, "GET", `/teachers/me/classes/${grade5A.id}/students`);
  ada = roster.students.find((s) => s.name === "Ada Student")!.id;
});

async function openAttendance(page: Page, query = ""): Promise<void> {
  const loaded = registerLoaded(page);
  await page.goto(`/attendance${query}`);
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.getByRole("heading", { level: 2, name: /^Grade 5A · / })).toBeVisible();
}

// ─── Guides ────────────────────────────────────────────────────────────────

/** The `data-guide` targets each redesigned page's guide walks through, in order. */
const GUIDES: { path: () => string; name: string; targets: string[]; ready: RegExp }[] = [
  { path: () => "/dashboard", name: "Today", targets: ["today-now", "today-day", "today-attention", "today-setup"], ready: /\/teachers\/today$/ },
  { path: () => "/timetable", name: "Timetable", targets: ["timetable-week-nav", "timetable-lessons", "timetable-view-toggle", "timetable-print"], ready: /\/timetable\/me/ },
  {
    path: () => "/attendance",
    name: "Attendance",
    targets: ["attendance-controls", "attendance-stats", "attendance-mark-all", "attendance-rows", "attendance-submit"],
    ready: /\/registers\/[a-f0-9]{24}/,
  },
  {
    path: () => "/students",
    name: "Students",
    targets: ["students-tabs", "students-stats", "students-search", "students-table", "students-export"],
    ready: /\/teachers\/me\/classes\/[a-f0-9]{24}\/students/,
  },
  {
    path: () => `/students/${ada}`,
    name: "Student record",
    targets: ["student-header", "student-guardian", "student-attendance", "student-scores"],
    ready: /\/teachers\/me\/students\//,
  },
  {
    // English 5A: its first assessment is a draft, so Publish (a step of the guide) is on the page.
    path: () => `/grading?courseId=${grade5A.courses.find((c) => c.title === "English 5A")!.id}`,
    name: "Grading (subject scores)",
    targets: ["grading-mode-switch", "grading-course-chips", "grading-assessment-tabs", "grading-score-sheet", "grading-publish", "grading-term"],
    ready: /\/grading\/course\/[a-f0-9]{24}/,
  },
  {
    path: () => "/grading?mode=class",
    name: "Grading (class report)",
    targets: ["grading-mode-switch", "grading-readiness", "grading-tab-summary", "grading-tab-remarks"],
    ready: /\/grading\/classes\/[a-f0-9]{24}\/readiness/,
  },
  {
    path: () => "/subjects",
    name: "Subjects",
    targets: ["subjects-cards", "subjects-plan", "subjects-mark-taught", "subjects-tab-resources", "subjects-upload"],
    ready: /\/scheme-of-work\/course\/[a-f0-9]{24}/,
  },
];

for (const guide of GUIDES) {
  test(`the ${guide.name} guide opens by itself and highlights every step's target`, async ({ page, monitor }) => {
    await page.goto("/dashboard");
    // Forget every guide this teacher has seen or finished, then load the page fresh.
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) if (key.startsWith("talim_teacher_guide")) localStorage.removeItem(key);
    });
    monitor.clear();
    const ready = page.waitForResponse((r) => guide.ready.test(r.url()) && r.ok());
    await page.goto(guide.path());
    await ready;

    const dialog = page.getByRole("dialog", { name: /.+/ }).filter({ has: page.getByRole("button", { name: "Close guide" }) });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    const visited: string[] = [];
    for (let i = 0; i < 12; i++) {
      await expect(dialog.getByText(new RegExp(`^Step ${i + 1} of \\d+$`))).toBeVisible();
      const highlight = page.getByTestId("guide-highlight");
      await expect(highlight).toBeVisible();
      const target = (await highlight.getAttribute("data-guide-for"))!;
      visited.push(target);
      // The spotlight sits 8px around the target (clamped to the viewport edge), once scrolling settles.
      await expect
        .poll(
          () =>
            page.evaluate((t) => {
              const el = document.querySelector(`[data-guide="${t}"]`);
              const hl = document.querySelector('[data-testid="guide-highlight"]');
              if (!el || !hl) return "missing";
              const a = el.getBoundingClientRect();
              const b = hl.getBoundingClientRect();
              const ok =
                Math.abs(b.left - Math.max(a.left - 8, 8)) <= 3 &&
                Math.abs(b.top - Math.max(a.top - 8, 8)) <= 3 &&
                Math.abs(b.width - (a.width + 16)) <= 3 &&
                Math.abs(b.height - (a.height + 16)) <= 3;
              return ok ? "ok" : `off: target ${Math.round(a.left)},${Math.round(a.top)} ${Math.round(a.width)}x${Math.round(a.height)}; highlight ${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)}`;
            }, target),
          { message: `step ${i + 1} (${target}) is highlighted`, timeout: 5_000 },
        )
        .toBe("ok");
      const last = dialog.getByRole("button", { name: "Got it" });
      if (await last.isVisible()) {
        await last.click();
        break;
      }
      await dialog.getByRole("button", { name: "Next" }).click();
    }
    await expect(dialog).toHaveCount(0);
    console.log(`[guide] ${guide.name}: ${visited.join(" > ")}`);
    expect(visited).toEqual(guide.targets);
    expect(monitor.unexpected(ALLOW)).toEqual([]);
  });
}

test("the portal tour runs to the end and ticks 'Take the tour' on Today", async ({ page }) => {
  await apiCall(token, "PATCH", "/teacher/settings/preferences", { guides: { tourCompleted: false } });
  const loaded = page.waitForResponse((r) => /\/teachers\/today$/.test(r.url()) && r.ok());
  await page.goto("/dashboard");
  await loaded;
  await dismissGuide(page, 3_000);
  await page.getByRole("button", { name: "Take the tour" }).click();
  const sheet = page.getByRole("dialog");
  const total = Number((await sheet.getByText(/^Step 1 of \d+$/).textContent())!.match(/of (\d+)/)![1]);
  for (let i = 1; i < total; i++) {
    await expect(sheet.getByText(`Step ${i} of ${total}`)).toBeVisible();
    await sheet.getByRole("button", { name: "Next" }).click();
  }
  await expect(sheet.getByText(`Step ${total} of ${total}`)).toBeVisible();
  const stored = page.waitForResponse((r) => r.url().includes("/teacher/settings/preferences") && r.request().method() === "PATCH");
  await sheet.getByRole("button", { name: "Finish" }).click();
  expect((await stored).ok()).toBe(true);
  await expect(page.getByText("Tour complete. You can replay it from Settings under Help.")).toBeVisible();

  await page.reload();
  await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole("listitem").filter({ hasText: "Take the tour (done)" })).toBeVisible();
  console.log(`[tour] ${total} steps, finished`);
});

// ─── Attendance ────────────────────────────────────────────────────────────

test("Submit stays disabled while a student is unmarked, and the API's 409 keeps the teacher on the register", async ({ page, monitor }) => {
  await openAttendance(page);
  monitor.clear();
  await expect(radios(page, "Ada Student").getByRole("radio", { name: "Present" })).toHaveAttribute("aria-checked", "false");
  await expect(submitButton(page)).toBeDisabled();
  await expect(submitButton(page)).toHaveAttribute("title", "Mark every student first");

  // Force the API's 409: drafts are not saved (so the server has no mark for
  // Ada), and the submit goes out without her mark.
  const registerUrl = (url: URL) => url.pathname.includes("/registers/");
  await page.route(
    registerUrl,
    async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      const body = route.request().postDataJSON() as { submit: boolean };
      if (!body.submit) return route.abort("failed");
      return route.continue({ postData: JSON.stringify({ ...body, marks: [] }) });
    },
  );
  await radios(page, "Ada Student").getByRole("radio", { name: "Present" }).click();
  await expect(page.getByText("Draft not saved")).toBeVisible();
  await expect(submitButton(page)).toBeEnabled();
  const refused = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/registers/"));
  await submitButton(page).click();
  const res = await refused;
  expect(res.status()).toBe(409);
  const body = await res.json();
  expect(body.missing ?? body.data?.missing).toBe(1);
  await expect(page.getByText("1 student still needs a mark before you can submit.")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /^Submitted at / })).toHaveCount(0);

  // Let saves through again: Retry stores the draft.
  await page.unroute(registerUrl);
  const saved = page.waitForResponse(isRegisterPut(false));
  await page.getByRole("button", { name: "Retry" }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page.getByText("Draft saved")).toBeVisible();
  expect(
    monitor.unexpected([
      ...ALLOW,
      { kind: "http", match: /PUT \/registers\/[a-f0-9]{24}\?date=[\d-]+ -> 409|PUT \/registers\/[a-f0-9]{24} -> 409/, reason: "the forced incomplete submit" },
      { kind: "requestfailed", match: /PUT .*\/registers\//, reason: "drafts aborted on purpose so the server has no mark" },
      { kind: "console.error", match: /409|not marked|attendance|register/i, reason: "the app logs the refused submit and the failed draft" },
    ]),
  ).toEqual([]);
});

test("marks save as a draft and are still there after a reload; the student on leave is locked", async ({ page }) => {
  await openAttendance(page);
  const saved = page.waitForResponse(isRegisterPut(false));
  await radios(page, "Ada Student").getByRole("radio", { name: "Late" }).click();
  const res = await saved;
  expect(res.ok()).toBe(true);
  await expect(page.getByText("Draft saved")).toBeVisible();

  await openAttendance(page);
  await expect(radios(page, "Ada Student").getByRole("radio", { name: "Late" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("status").filter({ hasText: /^Submitted at / })).toHaveCount(0);

  // Ben is on leave the parent asked for and the office approved: no radios, just the reason.
  await expect(radios(page, "Ben Student")).toHaveCount(0);
  const ben = page.locator("li", { hasText: "Ben Student" });
  await expect(ben.getByText("Approved leave", { exact: true })).toBeVisible();
  await expect(ben.getByText("Leave approved by the school office · requested by Paul Parent")).toBeVisible();
});

test("Submit tells the teacher how many parents were told; Edit register then Resubmit tells only the newly absent", async ({ page }) => {
  await openAttendance(page);
  await expect(page.getByText("Ready to submit.")).toBeVisible();
  const first = page.waitForResponse(isRegisterPut(true));
  await submitButton(page).click();
  const firstBody = await (await first).json();
  expect(firstBody.notified ?? firstBody.data?.notified).toBe(0);
  await expect(page.getByText("Register for Grade 5A submitted. No parents needed notifying.")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /^Submitted at .*Parents of absent students were notified/ })).toBeVisible();

  // Reopen, mark Ada absent with a reason, resubmit: her parent is told now.
  await page.getByRole("button", { name: "Edit register" }).click();
  await expect(page.getByText("You are editing a submitted register. Resubmit to save your changes.")).toBeVisible();
  await radios(page, "Ada Student").getByRole("radio", { name: "Absent" }).click();
  await page.getByLabel("Why is Ada absent?").selectOption({ index: 1 });
  await expect(page.getByText(/1 absent parent will be notified/)).toBeVisible();
  const second = page.waitForResponse(isRegisterPut(true));
  await page.getByRole("button", { name: "Resubmit register" }).click();
  const secondBody = await (await second).json();
  expect(secondBody.notified ?? secondBody.data?.notified).toBe(1);
  await expect(page.getByText("Register for Grade 5A submitted. 1 absent parent has been notified.")).toBeVisible();

  // Resubmitting with Ada still absent tells nobody again.
  await page.getByRole("button", { name: "Edit register" }).click();
  await expect(page.getByText(/No parents|Ready to submit\./).first()).toBeVisible();
  const third = page.waitForResponse(isRegisterPut(true));
  await page.getByRole("button", { name: "Resubmit register" }).click();
  const thirdBody = await (await third).json();
  expect(thirdBody.notified ?? thirdBody.data?.notified).toBe(0);
  await expect(page.getByText("Register for Grade 5A submitted. No parents needed notifying.").last()).toBeVisible();
});

test("a past day is read-only", async ({ page }) => {
  await openAttendance(page);
  const past = registerLoaded(page);
  await page.getByRole("button", { name: "Previous school day" }).click();
  await past;
  await expect(page.getByRole("heading", { level: 2, name: /^Grade 5A · (?!.*today)/ })).toBeVisible();
  await expect(page.getByText("Past registers are read-only. Ask the school office if a record needs correcting.")).toBeVisible();
  await expect(page.getByRole("radiogroup")).toHaveCount(0);
  await expect(submitButton(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark the rest present" })).toHaveCount(0);
  await page.getByRole("button", { name: "Back to today" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /^Grade 5A · .* · today$/ })).toBeVisible();
});

// ─── Students ──────────────────────────────────────────────────────────────

test("the Students list searches and exports the class as CSV", async ({ page }) => {
  const loaded = page.waitForResponse((r) => /\/teachers\/me\/classes\/[a-f0-9]{24}\/students$/.test(r.url()) && r.ok());
  await page.goto("/students");
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.getByRole("button", { name: /Grade 5A/, pressed: true })).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByRole("link", { name: /Ada Student/ })).toBeVisible();
  await expect(table.getByRole("link", { name: /Ben Student/ })).toBeVisible();

  await page.getByRole("searchbox", { name: /Search students/ }).fill("ben");
  await expect(table.getByRole("link", { name: /Ben Student/ })).toBeVisible();
  await expect(table.getByRole("link", { name: /Ada Student/ })).toHaveCount(0);
  await page.getByRole("searchbox", { name: /Search students/ }).fill("");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.csv$/);
  const text = fs.readFileSync((await file.path())!, "utf8").replace(/^﻿/, "");
  const [header, ...rows] = text.trim().split(/\r?\n/);
  expect(header).toBe("Name,Admission number,Email,Class,Attendance rate,Guardian,Relationship,Guardian phone,Guardian email");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toContain("Ada Student");
});

test("the student record shows the guardian without empty rows, and Message opens a direct chat", async ({ page }) => {
  const loaded = page.waitForResponse((r) => /\/teachers\/me\/students\/[a-f0-9]{24}$/.test(r.url()) && r.ok());
  await page.goto(`/students/${ada}`);
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.getByRole("heading", { level: 1, name: "Ada Student" })).toBeVisible();
  const guardian = page.locator('[data-guide="student-guardian"]');
  await expect(guardian.getByText("Paul Parent").first()).toBeVisible();
  await expect(guardian.getByText("Occupation")).toHaveCount(0);
  await expect(guardian.getByText("Home address")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Mathematics 5A · Grade 5A" })).toBeVisible();

  await guardian.getByRole("button", { name: "Message" }).click();
  await expect(page).toHaveURL(/\/messages\?room=[a-f0-9]{24}/);
});

test("a second teacher cannot pick or open Grade 5A: pickers leave it out and direct links say so", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, storageState: authFile("secondTeacher") });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());

  await page.goto("/attendance");
  await dismissGuide(page, 3_000);
  const picker = page.getByLabel("Class");
  await expect(picker.locator("option")).toHaveText([/Grade 6B/]);
  await page.goto("/students");
  await dismissGuide(page, 3_000);
  await expect(page.getByRole("group", { name: "Class" }).getByRole("button")).toHaveText([/Grade 6B/]);

  await page.goto(`/attendance?classId=${grade5A.id}`);
  await expect(page.getByRole("heading", { name: "Not one of your classes" })).toBeVisible();
  await expect(page.getByText(/You don't teach this class, so its register is not available to you/)).toBeVisible();
  await expect(page.getByRole("radiogroup")).toHaveCount(0);

  await page.goto(`/students?classId=${grade5A.id}`);
  await expect(page.getByRole("heading", { name: "Not one of your classes" })).toBeVisible();
  await expect(page.getByText("Ada Student")).toHaveCount(0);

  await page.goto(`/students/${ada}`);
  await expect(page.getByRole("heading", { name: "Not one of your students" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Students" })).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});

// ─── Share a resource from a lesson ─────────────────────────────────────────

test("Share a resource from a lesson opens the Subjects upload sheet on the lesson's week", async ({ page, monitor }) => {
  interface Lesson {
    id: string;
    course: { id: string; title: string };
    class: { name: string };
    topic: { week: number } | null;
  }
  const today = await apiCall<{ lessons: Lesson[] }>(token, "GET", "/teachers/today");
  const lesson = today.lessons.find((l) => l.topic);
  test.skip(!lesson, "no lesson with a scheme-of-work week today");
  const week = lesson!.topic!.week;

  // Nothing reaches Cloudinary: the upload answers with a made-up file address.
  const fakeUrl = `https://res.cloudinary.com/e2e-dummy-cloud/raw/upload/v1/e2e-week-${week}-${Date.now()}.pdf`;
  await page.route(/api\.cloudinary\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ secure_url: fakeUrl, public_id: "e2e", bytes: 12 }) }),
  );

  const loaded = page.waitForResponse((r) => /\/teachers\/today$/.test(r.url()) && r.ok());
  await page.goto("/dashboard");
  await loaded;
  await dismissGuide(page, 2_000);
  const title = `${lesson!.course.title} · ${lesson!.class.name}`;
  await page.getByRole("region", { name: "Your day" }).getByRole("button", { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText(new RegExp(`^For .*, week ${week}$`))).toBeVisible();
  await sheet.getByRole("button", { name: "Upload" }).click();

  // Subjects, on the lesson's course and its Resources tab, with the upload sheet open on the lesson's week.
  await expect(page).toHaveURL(new RegExp(`/subjects\\?.*courseId=${lesson!.course.id}`));
  const upload = page.getByRole("dialog", { name: "Upload a resource" });
  await expect(upload).toBeVisible();
  await expect(upload.getByLabel("Week")).toHaveValue(String(week));
  await expect(upload.getByRole("button", { name: title })).toHaveAttribute("aria-pressed", "true");
  await upload.getByLabel("Name").fill(`E2E week ${week} notes`);
  await upload.getByLabel("File to upload").setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 e2e") });
  monitor.clear();
  const created = page.waitForResponse((r) => r.request().method() === "POST" && /\/resources\/?(\?|$)/.test(new URL(r.url()).pathname + new URL(r.url()).search));
  await upload.getByRole("button", { name: "Upload", exact: true }).click();
  const res = await created;
  expect(res.ok()).toBe(true);
  expect((res.request().postDataJSON() as { week?: number }).week).toBe(week);
  await expect(page.getByRole("dialog", { name: "Uploaded" })).toBeVisible();

  const stored = await apiCall<unknown>(token, "GET", `/resources/course/${lesson!.course.id}?week=${week}`);
  const list = (Array.isArray(stored) ? stored : ((stored as { resources?: unknown[] }).resources ?? [])) as { _id: string; week?: number; name?: string }[];
  const mine = list.find((r) => JSON.stringify(r).includes(fakeUrl));
  expect(mine, "the resource is listed for that week").toBeTruthy();
  expect(mine!.week).toBe(week);
  const other = await apiCall<unknown>(token, "GET", `/resources/course/${lesson!.course.id}?week=${week === 1 ? 2 : week - 1}`);
  expect(JSON.stringify(other)).not.toContain(fakeUrl);
  console.log(`[upload] stored with week ${mine!.week}`);

  // Leave the course's resources as the seed made them.
  await apiCall(token, "DELETE", `/resources/${mine!._id}`);
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

// ─── axe and screenshots ───────────────────────────────────────────────────

const PAGES = [
  { path: () => "/attendance", name: "attendance", ready: /\/registers\/[a-f0-9]{24}/ },
  { path: () => "/students", name: "students", ready: /\/teachers\/me\/classes\/[a-f0-9]{24}\/students/ },
  { path: () => `/students/${ada}`, name: "student-record", ready: /\/teachers\/me\/students\// },
];

async function openQuiet(page: Page, path: string, ready: RegExp): Promise<void> {
  const loaded = page.waitForResponse((r) => ready.test(r.url()) && r.ok());
  await page.goto(path);
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
}

for (const theme of ["light", "dark"] as const) {
  test(`axe finds nothing serious or critical on Attendance, Students and the record (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, theme] as const);
    for (const p of PAGES) {
      await openQuiet(page, p.path(), p.ready);
      await page.waitForTimeout(600);
      expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(theme === "dark");
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
      const bad = result.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 5) }));
      console.log(`[axe] ${p.name} ${theme}: ${result.violations.map((v) => `${v.id}(${v.impact})`).join(", ") || "none"}; ${bad.length} serious/critical`);
      expect(bad, `${p.name} (${theme})`).toEqual([]);
    }
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
    await page.setViewportSize({ width: size.width, height: size.height + hidden });
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: file, fullPage: true });
  if (hidden > 0) await page.setViewportSize(size);
}

async function themedPage(browser: Browser, baseURL: string | undefined, theme: "light" | "dark", phone: boolean) {
  const context = await browser.newContext({
    baseURL,
    storageState: authFile("teacher"),
    colorScheme: theme,
    ...(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } }),
  });
  const page = await context.newPage();
  await page.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, theme] as const);
  return { context, page };
}

test("screenshots of Attendance, Students and the record: desktop light and dark, phone", async ({ browser, baseURL }) => {
  test.setTimeout(300_000);
  fs.mkdirSync("e2e/screenshots", { recursive: true });
  for (const [theme, phone] of [["light", false], ["dark", false], ["light", true]] as const) {
    const { context, page } = await themedPage(browser, baseURL, theme, phone);
    for (const p of PAGES) {
      await openQuiet(page, p.path(), p.ready);
      await page.waitForTimeout(800);
      await shootWhole(page, `e2e/screenshots/redesign-${p.name}-${phone ? "mobile" : "desktop"}-${theme}.png`);
    }
    await context.close();
  }
});
