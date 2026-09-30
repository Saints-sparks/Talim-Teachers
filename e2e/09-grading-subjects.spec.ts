import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import type { Browser, Page } from "@playwright/test";
import { test, expect, type Allowed } from "./support/fixtures";
import { ACCOUNTS, authFile } from "./support/creds";
import { apiCall, apiLogin, unwrap } from "./support/api";
import { seed } from "./support/backend";
import { dismissGuide } from "./support/ui";

/**
 * Round 3: the redesigned Grading (`/grading`, `/grading?mode=class`) and
 * Subjects (`/subjects`) pages against the seeded Grade 5A (backend
 * `e2e/seed.js`): Mathematics 5A fully published (CA 1 20, CA 2 20, Exam 60),
 * English 5A with Ada's CA 1 only, Basic Science 5A taught by the third
 * teacher with nothing entered, and two Mathematics 5A resources.
 *
 * Published scores are locked and `--reset` does not roll scores back, so the
 * score flows run on a throwaway assessment ("E2E Grading Quiz …", out of
 * 10) that this spec creates through the API and deletes again (unlock,
 * clear, delete). Everything else it changes it puts back: the week it
 * edits, the week it marks taught, the resource it uploads, Ada's remark.
 */
const ALLOW: readonly Allowed[] = [
  { kind: "external", match: /fonts\.googleapis\.com|fonts\.gstatic\.com/, reason: "Google Fonts; blocked by the harness" },
];
const THEME_KEY = "talim_teacher_theme";
const RUN = Date.now().toString(36).slice(-5);
const QUIZ = `E2E Grading Quiz ${RUN}`;

interface Card {
  course: { id: string; code: string; title: string };
  class: { id: string; name: string };
  currentWeek: number | null;
}
interface Sheet {
  term: { id: string; name: string };
  assessments: { id: string; name: string; status: string; maxScore: number }[];
  students: {
    id: string;
    name: string;
    scores: Record<string, number | null>;
    total: number | null;
    grade: string | null;
    position: { rank: number; of: number } | null;
  }[];
}
interface SchemeWeek {
  week: number;
  topic: string;
  objectives: string;
  taughtAt: string | null;
}
interface Resource {
  _id: string;
  id?: string;
  name: string;
  visibility?: string;
  week?: number | null;
  sizeBytes?: number | null;
  mimeType?: string | null;
  kind?: string;
  files?: string[];
}

let token = "";
let admin = "";
let mth: Card;
let students: Sheet["students"] = [];
let quiz = "";

const isoDay = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

test.use({ storageState: authFile("teacher") });
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  seed("--reset"); // no reminders, remarks or term results submissions
  [token, admin] = await Promise.all([apiLogin(ACCOUNTS.teacher), apiLogin(ACCOUNTS.schoolAdmin)]);
  const cards = await apiCall<Card[]>(token, "GET", "/scheme-of-work/me");
  mth = cards.find((c) => c.course.code === "MTH-5A")!;
  const sheet = await apiCall<Sheet>(token, "GET", `/grading/course/${mth.course.id}`);
  students = sheet.students;
  const created = await apiCall<{ assessment: { _id: string } }>(admin, "POST", "/assessments", {
    name: QUIZ,
    termId: sheet.term.id,
    maxScore: 10,
    startDate: `${isoDay()}T00:00:00Z`,
    endDate: `${isoDay(3)}T23:59:59Z`,
  });
  quiz = created.assessment._id;
});

/** Unlocks, clears and deletes the throwaway assessment (published scores cannot simply be deleted). */
async function removeQuiz(): Promise<void> {
  if (!quiz) return;
  const base = `/grading/course/${mth.course.id}/assessments/${quiz}`;
  await apiCall(token, "POST", `${base}/unlock`, { reason: "e2e cleanup" }).catch(() => undefined);
  await apiCall(token, "PUT", `${base}/scores`, { scores: students.map((s) => ({ studentId: s.id, score: null })) }).catch(() => undefined);
  await apiCall(admin, "DELETE", `/assessments/${quiz}`);
  quiz = "";
}

test.afterAll(removeQuiz);

/** Opens the Grading page on a link and waits for the data it needs. */
async function openGrading(page: Page, query: string, ready: RegExp): Promise<void> {
  const loaded = page.waitForResponse((r) => ready.test(r.url()) && r.request().method() === "GET" && r.ok());
  await page.goto(`/grading${query}`);
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
}

const scoreInput = (page: Page, student: string, max = 10) => page.getByLabel(`Score for ${student}, ${QUIZ}, out of ${max}`);
const scoreRow = (page: Page, student: string) => page.getByRole("table").getByRole("row").filter({ hasText: student });
const sheetUrl = () => new RegExp(`/grading/course/${mth.course.id}(\\?|$)`);

// ─── Subject scores ────────────────────────────────────────────────────────

test("scores: Enter walks down the column, above the max is flagged, a draft saves and survives a reload", async ({ page, monitor }) => {
  // Start from Today and move in the app (client-side), so Back stays in the app and is a `popstate`.
  const today = page.waitForResponse((r) => /\/teachers\/today$/.test(r.url()) && r.ok());
  await page.goto("/dashboard");
  await today;
  await dismissGuide(page, 2_000);
  const sheetLoaded = page.waitForResponse((r) => sheetUrl().test(r.url()) && r.ok());
  await page.getByRole("navigation", { name: "Teacher portal" }).getByRole("link", { name: /^Grading/ }).click();
  await sheetLoaded;
  await dismissGuide(page, 2_000);
  await page.getByRole("group", { name: "Assessment" }).getByRole("button", { name: new RegExp(`^${QUIZ}`) }).click();
  await expect(page).toHaveURL(new RegExp(`assessmentId=${quiz}`));
  monitor.clear();
  const publish = page.getByRole("button", { name: "Publish scores" });
  await expect(publish).toBeDisabled();

  const ada = scoreInput(page, "Ada Student");
  const ben = scoreInput(page, "Ben Student");
  await ada.click();
  await page.keyboard.type("8");
  await page.keyboard.press("Enter");
  await expect(ben).toBeFocused();
  // Ben is still missing: nothing to publish yet.
  await expect(scoreRow(page, "Ben Student")).toContainText("Missing");
  await expect(publish).toBeDisabled();

  await page.keyboard.type("12");
  await expect(scoreRow(page, "Ben Student")).toContainText("Above 10");
  await expect(ben).toHaveAttribute("aria-invalid", "true");
  await expect(publish).toBeDisabled();
  await ben.fill("6.5");
  await expect(scoreRow(page, "Ben Student")).toContainText("Entered");
  await expect(scoreRow(page, "Ada Student")).toContainText("80%");

  // Unsaved scores: leaving through the sidebar asks first.
  let asked = "";
  page.once("dialog", (d) => {
    asked = d.message();
    void d.dismiss();
  });
  await page.getByRole("navigation", { name: "Teacher portal" }).getByRole("link", { name: /^Today/ }).click();
  await expect.poll(() => asked).toContain("unsaved scores");
  await expect(page).toHaveURL(/\/grading/);
  await expect(ada).toHaveValue("8");

  // ... and so does the browser's Back.
  asked = "";
  page.once("dialog", (d) => {
    asked = d.message();
    void d.dismiss();
  });
  await page.evaluate(() => window.history.back());
  await expect.poll(() => asked).toContain("unsaved scores");
  await expect(page).toHaveURL(/\/grading\?/);
  await expect(page.getByRole("heading", { level: 1, name: "Grading" })).toBeVisible();
  await expect(ada).toHaveValue("8");
  await expect(ben).toHaveValue("6.5");

  const saved = page.waitForResponse((r) => r.url().includes(`/assessments/${quiz}/scores`) && r.request().method() === "PUT");
  await page.getByRole("button", { name: "Save draft" }).click();
  const res = await saved;
  expect(res.status()).toBe(200);
  expect((res.request().postDataJSON() as { scores: { score: number }[] }).scores.map((s) => s.score).sort()).toEqual([6.5, 8]);
  await expect(page.getByText("Draft saved. Students and parents cannot see it yet.")).toBeVisible();

  await page.reload();
  await expect(scoreInput(page, "Ada Student")).toHaveValue("8");
  await expect(scoreInput(page, "Ben Student")).toHaveValue("6.5");
  await expect(page.getByRole("button", { name: "Publish scores" })).toBeEnabled();
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

test("publish: the toast says how many people were told, and the scores lock", async ({ page }) => {
  await openGrading(page, `?courseId=${mth.course.id}&assessmentId=${quiz}`, sheetUrl());
  await page.getByRole("button", { name: "Publish scores" }).click();
  const confirm = page.getByRole("dialog", { name: `Publish ${QUIZ} for Mathematics 5A · Grade 5A?` });
  await expect(confirm).toBeVisible();
  const published = page.waitForResponse((r) => r.url().includes(`/assessments/${quiz}/publish`) && r.request().method() === "POST");
  await confirm.getByRole("button", { name: "Publish scores" }).click();
  const res = await published;
  expect(res.status()).toBe(200);
  const body = unwrap<{ changed: string[]; notified: number }>(await res.json());
  // Ada, Ben and their one parent (a parent of two is counted once).
  expect(body.notified).toBe(3);
  expect(body.changed).toHaveLength(2);
  await expect(page.getByText(`${QUIZ} published. Students and parents can see the scores; 3 people notified.`)).toBeVisible();

  await expect(scoreInput(page, "Ada Student")).toBeDisabled();
  await expect(scoreInput(page, "Ben Student")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Unlock to correct" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish scores" })).toHaveCount(0);
});

test("a correction: Unlock to correct, change one score, republish tells only that student and parent", async ({ page }) => {
  await openGrading(page, `?courseId=${mth.course.id}&assessmentId=${quiz}`, sheetUrl());
  await page.getByRole("button", { name: "Unlock to correct" }).click();
  const confirm = page.getByRole("dialog", { name: `Unlock ${QUIZ} for Mathematics 5A · Grade 5A?` });
  await confirm.getByLabel("Reason (optional)").fill("Ben's paper was marked twice");
  const unlocked = page.waitForResponse((r) => r.url().includes(`/assessments/${quiz}/unlock`) && r.request().method() === "POST");
  await confirm.getByRole("button", { name: "Unlock" }).click();
  const u = await unlocked;
  expect(u.status()).toBe(200);
  expect(u.request().postDataJSON()).toEqual({ reason: "Ben's paper was marked twice" });
  await expect(scoreInput(page, "Ben Student")).toBeEnabled();

  await scoreInput(page, "Ben Student").fill("7");
  await page.getByRole("button", { name: "Publish scores" }).click();
  const again = page.getByRole("dialog", { name: `Publish ${QUIZ} for Mathematics 5A · Grade 5A?` });
  await expect(again).toContainText("Only those whose score changed are notified.");
  const republished = page.waitForResponse((r) => r.url().includes(`/assessments/${quiz}/publish`) && r.request().method() === "POST");
  await again.getByRole("button", { name: "Publish scores" }).click();
  const res = await republished;
  expect(res.status()).toBe(200);
  const body = unwrap<{ changed: string[]; notified: number }>(await res.json());
  expect(body.changed).toEqual([students.find((s) => s.name === "Ben Student")!.id]);
  expect(body.notified).toBe(2);
  await expect(page.getByText(`${QUIZ} published again. 1 score changed; 2 people notified.`)).toBeVisible();
  await expect(scoreInput(page, "Ben Student")).toBeDisabled();
  await expect(scoreInput(page, "Ben Student")).toHaveValue("7");
});

test("Term total: a column per assessment, the total, grade and position", async ({ page }) => {
  await openGrading(page, `?courseId=${mth.course.id}&assessmentId=total`, sheetUrl());
  const table = page.getByRole("table");
  for (const head of ["First Term CA 1", "First Term CA 2", "First Term Exam", QUIZ, "Total", "Grade", "Pos."]) {
    await expect(table.getByRole("columnheader").filter({ hasText: head }).first()).toBeVisible();
  }
  // The totals come from the API: the seeded scores differ between a fresh database (Ada 81, Ben 65.5
  // before the quiz's 8 and 7) and one seeded before Round 3 (80.4 and 66.5 after the CA 1 repair).
  // Either way Ada is 1st with an A and Ben 2nd with a B.
  const sheet = await apiCall<Sheet>(token, "GET", `/grading/course/${mth.course.id}`);
  const expected = (name: string) => sheet.students.find((s) => s.name === name)!;
  for (const [name, rank, letter] of [["Ada Student", "1st", "A"], ["Ben Student", "2nd", "B"]] as const) {
    const want = expected(name);
    expect(want.grade).toBe(letter);
    const row = table.getByRole("row").filter({ hasText: name });
    await expect(row).toContainText(String(want.total));
    await expect(row).toContainText(rank);
    await expect(row.getByRole("cell").filter({ hasText: new RegExp(`^${letter}$`) })).toHaveCount(1);
  }
});

test("the throwaway assessment goes again, and Mathematics 5A is as the seed left it", async () => {
  await removeQuiz();
  const sheet = await apiCall<Sheet>(token, "GET", `/grading/course/${mth.course.id}`);
  expect(sheet.assessments.map((a) => `${a.name} ${a.maxScore} ${a.status}`)).toEqual([
    "First Term CA 1 20 published",
    "First Term CA 2 20 published",
    "First Term Exam 60 published",
  ]);
});

// ─── Class report ──────────────────────────────────────────────────────────

test("class report: readiness shows the third teacher's Basic Science, and Send reminder says so", async ({ page, monitor }) => {
  await openGrading(page, "?mode=class", /\/grading\/classes\/[a-f0-9]{24}\/readiness/);
  monitor.clear();
  const readiness = page.getByRole("region", { name: "Grade 5A · report readiness" });
  await expect(readiness).toBeVisible();
  const bsc = readiness.getByRole("row").filter({ hasText: "Basic Science 5A" });
  await expect(bsc).toContainText("Tade Third");
  await expect(bsc).toContainText("Not started");
  await expect(readiness.getByRole("row").filter({ hasText: "Mathematics 5A" })).toContainText("You");

  const sent = page.waitForResponse((r) => /\/grading\/classes\/[a-f0-9]{24}\/reminders$/.test(r.url()) && r.request().method() === "POST");
  await bsc.getByRole("button", { name: "Send reminder" }).click();
  const res = await sent;
  expect(res.status()).toBe(200);
  await expect(page.getByText("Reminder sent to Tade Third about First Term CA 1 scores.")).toBeVisible();
  await expect(bsc.getByText("Reminder sent")).toBeVisible();
  await expect(bsc.getByRole("button", { name: "Send reminder" })).toHaveCount(0);

  // Still there after a reload: the server keeps the day's reminder.
  await page.reload();
  await expect(page.getByRole("region", { name: "Grade 5A · report readiness" }).getByRole("row").filter({ hasText: "Basic Science 5A" })).toContainText("Reminder sent");
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

test("class report: the broadsheet is a preview while subjects are waiting", async ({ page }) => {
  await openGrading(page, "?mode=class&tab=summary", /\/grading\/classes\/[a-f0-9]{24}\/broadsheet/);
  await expect(page.getByText("Preview only. Waiting on Basic Science 5A, English 5A (yours). Gaps show as dashes until they publish.")).toBeVisible();
  // The broadsheet opens on the first assessment; only Mathematics has published it.
  const sheet = page.getByRole("region", { name: "Grade 5A · First Term CA 1 broadsheet" });
  await expect(sheet.getByRole("columnheader")).toContainText(["Student", "BSC-5A", "ENG-5A", "MTH-5A", "Total", "Average", "Pos.", "Grade"]);
  // Ada's published Mathematics CA 1, as the API holds it (17 in a fresh database, 16.4 in one seeded before Round 3).
  const maths = await apiCall<Sheet>(token, "GET", `/grading/course/${mth.course.id}`);
  const ca1 = maths.assessments.find((a) => a.name === "First Term CA 1")!;
  const adaCa1 = maths.students.find((st) => st.name === "Ada Student")!.scores[ca1.id];
  await expect(sheet.getByRole("row").filter({ hasText: "Ada Student" })).toContainText(String(adaCa1));
  await expect(sheet.getByRole("button", { name: "Generate First Term CA 1 summary" })).toBeDisabled();
  await expect(sheet.getByRole("row").filter({ hasText: "Ada Student" })).toBeVisible();
});

test("class report: a remark autosaves with the indicator and is still there after a reload", async ({ page }) => {
  await openGrading(page, "?mode=class&tab=remarks", /\/grading\/classes\/[a-f0-9]{24}\/remarks/);
  const remarks = page.getByRole("region", { name: "Class teacher's remarks" });
  const ada = remarks.getByLabel("Remark for Ada Student");
  const text = `A careful worker ${RUN}.`;
  const saved = page.waitForResponse((r) => /\/grading\/classes\/[a-f0-9]{24}\/remarks$/.test(r.url()) && r.request().method() === "PUT");
  await ada.fill(text);
  await expect(remarks.getByText(/Unsaved changes|Saving…/).first()).toBeVisible();
  expect((await saved).status()).toBe(200);
  await expect(remarks.getByText("All remarks saved")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("region", { name: "Class teacher's remarks" }).getByLabel("Remark for Ada Student")).toHaveValue(text);
  // Put it back.
  await apiCall(token, "PUT", `/grading/classes/${mth.class.id}/remarks`, { remarks: [{ studentId: students.find((s) => s.name === "Ada Student")!.id, classTeacherRemark: "" }] });
});

test("a teacher of another class gets no access to a Grade 5A subject's scores", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, storageState: authFile("secondTeacher") });
  const page = await context.newPage();
  await page.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
  try {
    const refused = page.waitForResponse((r) => r.url().includes(`/grading/course/${mth.course.id}`));
    await page.goto(`/grading?courseId=${mth.course.id}`);
    expect((await refused).status()).toBe(403);
    await dismissGuide(page, 2_000);
    await expect(page.getByRole("heading", { name: "Not one of your subjects" })).toBeVisible();
    await expect(page.getByText("You don't teach this subject, so its scores are not available to you.")).toBeVisible();
    await expect(page.getByText("Ada Student")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

// ─── Subjects ──────────────────────────────────────────────────────────────

async function openSubjects(page: Page, query = ""): Promise<void> {
  const loaded = page.waitForResponse((r) => /\/scheme-of-work\/me(\?|$)/.test(r.url()) && r.ok());
  await page.goto(`/subjects${query}`);
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
}

const plan = (page: Page) => page.getByRole("list", { name: "Weeks of the scheme of work for Mathematics 5A · Grade 5A" });
const weekRow = (page: Page, week: number) => plan(page).getByRole("listitem").filter({ has: page.getByRole("heading", { name: new RegExp(`^Week ${week}: `) }) });

test("Subjects: the cards, the plan, Edit week saved, Mark taught and Undo", async ({ page, monitor }) => {
  const week = mth.currentWeek ?? 1;
  const before = await apiCall<{ weeks: SchemeWeek[] }>(token, "GET", `/scheme-of-work/course/${mth.course.id}`);
  const original = before.weeks.find((w) => w.week === week)!;
  try {
    await openSubjects(page);
    monitor.clear();
    const cards = page.getByRole("group", { name: "Your subjects" });
    for (const code of ["MTH-5A", "ENG-5A", "MTH-6B"]) await expect(cards.getByRole("button").filter({ hasText: code })).toBeVisible();
    await cards.getByRole("button").filter({ hasText: "MTH-5A" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Mathematics 5A · Grade 5A" })).toBeVisible();
    await expect(plan(page)).toBeVisible();
    await expect(plan(page).locator('[aria-current="date"]')).toHaveCount(1);

    // Edit week.
    const objectives = `${original.objectives || "Objectives"} (E2E ${RUN})`;
    await weekRow(page, week).getByRole("button", { name: `Edit week ${week}` }).click();
    const sheet = page.getByRole("dialog", { name: `Week ${week}` });
    await expect(sheet.getByLabel("Topic")).toHaveValue(original.topic);
    await sheet.getByLabel("Objectives").fill(objectives);
    const put = page.waitForResponse((r) => r.url().includes(`/scheme-of-work/course/${mth.course.id}/weeks/${week}`) && r.request().method() === "PUT");
    await sheet.getByRole("button", { name: "Save week" }).click();
    expect((await put).status()).toBe(200);
    await expect(page.getByText(`Week ${week} saved.`)).toBeVisible();
    await expect(sheet).toHaveCount(0);
    await expect(weekRow(page, week)).toContainText(objectives);

    // Mark taught, then Undo.
    const wasTaught = Boolean(original.taughtAt);
    const toggle = (taught: boolean) => weekRow(page, week).getByRole("button", { name: taught ? `Undo taught for week ${week}` : `Mark taught for week ${week}` });
    const flip = async (from: boolean) => {
      const posted = page.waitForResponse((r) => r.url().includes(`/weeks/${week}/taught`) && r.request().method() === "POST");
      await toggle(from).click();
      expect((await posted).status()).toBe(200);
      await expect(toggle(!from)).toBeVisible();
    };
    await flip(wasTaught);
    await flip(!wasTaught);
    expect(monitor.unexpected(ALLOW)).toEqual([]);
  } finally {
    await apiCall(token, "PUT", `/scheme-of-work/course/${mth.course.id}/weeks/${week}`, { topic: original.topic, objectives: original.objectives });
  }
});

test("Subjects: the resources tab, an upload with its visibility, week and size stored, and Remove", async ({ page, monitor }) => {
  const week = Math.max(1, (mth.currentWeek ?? 2) - 1);
  const fakeUrl = `https://res.cloudinary.com/e2e-dummy-cloud/raw/upload/v1/e2e-subjects-${RUN}.pdf`;
  const pdf = Buffer.from(`%PDF-1.4 e2e subjects upload ${RUN}\n`.repeat(40));
  // Nothing reaches Cloudinary: the upload answers with a made-up address.
  await page.route(/api\.cloudinary\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ secure_url: fakeUrl, public_id: "e2e", bytes: pdf.length }) }),
  );
  const name = `E2E worksheet ${RUN}`;
  let created: Resource | undefined;
  try {
    await openSubjects(page, `?courseId=${mth.course.id}&tab=resources`);
    monitor.clear();
    const list = page.getByRole("list", { name: "Resources for Mathematics 5A · Grade 5A" });
    await expect(list.getByRole("link", { name: /^Fractions worksheet/ })).toBeVisible();
    await expect(list.getByRole("link", { name: /^Term plan for parents/ })).toBeVisible();
    // Unique viewers: Ada opened the worksheet (the seed).
    await expect(list.getByRole("listitem").filter({ hasText: "Fractions worksheet" })).toContainText("1 view");
    await expect(page.getByRole("tab", { name: /^Resources · \d+$/ })).toHaveAttribute("aria-selected", "true");

    await page.getByRole("button", { name: "Upload resource" }).click();
    const sheet = page.getByRole("dialog", { name: "Upload a resource" });
    await expect(sheet).toBeVisible();
    await sheet.getByLabel("Name").fill(name);
    await sheet.getByLabel("Week").selectOption(String(week));
    await sheet.getByRole("button", { name: "Students and parents" }).click();
    await expect(sheet.getByRole("button", { name: "Students and parents" })).toHaveAttribute("aria-pressed", "true");
    await sheet.getByLabel("File to upload").setInputFiles({ name: "worksheet.pdf", mimeType: "application/pdf", buffer: pdf });
    const posted = page.waitForResponse((r) => r.request().method() === "POST" && /\/resources\/?$/.test(new URL(r.url()).pathname));
    await sheet.getByRole("button", { name: "Upload", exact: true }).click();
    const res = await posted;
    expect(res.status()).toBe(201);
    expect(res.request().postDataJSON()).toMatchObject({ name, week, visibility: "students_and_parents", mimeType: "application/pdf", sizeBytes: pdf.length, files: [fakeUrl] });
    await expect(page.getByRole("dialog", { name: "Uploaded" })).toBeVisible();
    await page.getByRole("dialog", { name: "Uploaded" }).getByRole("button", { name: "Done" }).click();

    // What the API stored.
    const stored = await apiCall<Resource[] | { resources?: Resource[] }>(token, "GET", `/resources/course/${mth.course.id}`);
    created = (Array.isArray(stored) ? stored : (stored.resources ?? [])).find((r) => r.name === name);
    expect(created, "the upload is stored").toBeTruthy();
    expect(created).toMatchObject({ visibility: "students_and_parents", week, sizeBytes: pdf.length, mimeType: "application/pdf", kind: "pdf" });
    expect(created!.id).toBe(created!._id);
    console.log(`[upload] stored visibility=${created!.visibility} week=${created!.week} size=${created!.sizeBytes}`);

    // Remove it, after confirming.
    await expect(list.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
    await list.getByRole("listitem").filter({ hasText: name }).getByRole("button", { name: `Remove ${name}` }).click();
    const confirm = page.getByRole("dialog", { name: `Remove “${name}”?` });
    await expect(confirm).toContainText("Students will no longer see it. This cannot be undone.");
    const removed = page.waitForResponse((r) => r.url().includes(`/resources/${created!._id}`) && r.request().method() === "DELETE");
    await confirm.getByRole("button", { name: "Remove" }).click();
    expect((await removed).ok()).toBe(true);
    await expect(page.getByText("Resource removed.")).toBeVisible();
    await expect(list.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
    created = undefined;
    expect(monitor.unexpected(ALLOW)).toEqual([]);
  } finally {
    if (created) await apiCall(token, "DELETE", `/resources/${created._id}`).catch(() => undefined);
  }
});

test("Today's Upload resource opens the Subjects upload sheet", async ({ page }) => {
  const loaded = page.waitForResponse((r) => /\/teachers\/today$/.test(r.url()) && r.ok());
  await page.goto("/dashboard");
  await loaded;
  await dismissGuide(page, 2_000);
  await page.getByRole("button", { name: "Upload resource" }).first().click();
  await expect(page).toHaveURL(/\/subjects\?.*/);
  await expect(page.getByRole("dialog", { name: "Upload a resource" })).toBeVisible();
  // The sheet is modal (the page behind it is hidden from assistive tech), so look for the page by its markup.
  await expect(page.locator("h1", { hasText: "Subjects" })).toBeAttached();
  await expect(page.getByRole("dialog", { name: "Upload a resource" }).getByLabel("Week")).toHaveValue(/^\d+$/);
});

test("a Subjects deep link selects the subject, the Resources tab and the week of the upload sheet", async ({ page }) => {
  const week = Math.max(1, (mth.currentWeek ?? 2) - 1);
  await openSubjects(page, `?courseId=${mth.course.id}&tab=resources&upload=1&week=${week}`);
  const sheet = page.getByRole("dialog", { name: "Upload a resource" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel("Week")).toHaveValue(String(week));
  await expect(sheet.getByRole("button", { name: "Mathematics 5A · Grade 5A" })).toHaveAttribute("aria-pressed", "true");
  await sheet.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("tab", { name: /^Resources/ })).toHaveAttribute("aria-selected", "true");
});

// ─── axe and screenshots ───────────────────────────────────────────────────

const PAGES = [
  { path: () => `/grading?courseId=${mth.course.id}`, name: "grading", ready: /\/grading\/course\// },
  { path: () => "/grading?mode=class", name: "grading-class", ready: /\/grading\/classes\/[a-f0-9]{24}\/readiness/ },
  { path: () => "/subjects", name: "subjects", ready: /\/scheme-of-work\/me/ },
];

async function openQuiet(page: Page, path: string, ready: RegExp): Promise<void> {
  const loaded = page.waitForResponse((r) => ready.test(r.url()) && r.ok());
  await page.goto(path);
  await loaded;
  await dismissGuide(page, 2_000);
  await expect(page.locator(".animate-pulse:visible")).toHaveCount(0, { timeout: 30_000 });
}

for (const theme of ["light", "dark"] as const) {
  test(`axe finds nothing serious or critical on Grading (both modes) and Subjects (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, theme] as const);
    const bad: unknown[] = [];
    for (const p of PAGES) {
      await openQuiet(page, p.path(), p.ready);
      await page.waitForTimeout(600);
      expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(theme === "dark");
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
      for (const v of result.violations.filter((x) => x.impact === "serious" || x.impact === "critical")) {
        bad.push({ page: p.name, id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 5) });
      }
    }
    expect(bad).toEqual([]);
  });
}

/** The shell scrolls its main column: grows the viewport by what it hides, shoots, restores. */
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

test("screenshots of Grading (both modes) and Subjects: desktop light and dark, phone", async ({ browser, baseURL }) => {
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
