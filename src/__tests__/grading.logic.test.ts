import {
  DEFAULT_SCALE,
  assessmentStatusLine,
  assessmentTab,
  assessmentTiles,
  badCount,
  broadsheetCells,
  broadsheetNote,
  canPublish,
  cellValue,
  competitionRanks,
  completenessPill,
  draftChanges,
  dueLabel,
  formatPercent,
  gradeFor,
  isBelowThreshold,
  isLocked,
  isLockedError,
  liveTotals,
  missingScoresFromError,
  parseScore,
  positionLabel,
  pruneDraft,
  publishedMessage,
  readinessAction,
  redThreshold,
  remarksLock,
  remindedToday,
  rowStatus,
  sanitizeScoreInput,
  sortReportRows,
  statTiles,
  submissionView,
  termTotalStatusLine,
  termTotalTab,
  termTotalTiles,
  tiedRanks,
  waitingOnFromError,
  whenLabel,
} from "@/hooks/grading/grading.logic";
import { assessmentCsv, importScoresCsv, termTotalCsv } from "@/hooks/grading/grading.csv";
import { ApiError, type ApiErrorBody } from "@/lib/apiError";
import { makeBroadsheetFixture, makeCourseSheetFixture, resetGradingFixtureStore, setTermResultFixture } from "@/lib/fixtures/grading.fixture";
import { FIXTURE_NOW } from "@/lib/fixtures/today.fixture";
import type { CourseGradingSheet, GradingAssessment, ReadinessSubject } from "@/types/grading";

const NOW = Date.parse(FIXTURE_NOW);
const TZ = "Africa/Lagos";

beforeEach(() => resetGradingFixtureStore());

/**
 * A 409 as the API client raises it.
 *
 * @param body - Extra top-level fields.
 * @returns The error.
 */
function conflict(body: Record<string, unknown>): ApiError {
  return ApiError.fromResponse({ status: 409 }, { success: false, statusCode: 409, message: "Conflict", ...body } as ApiErrorBody);
}

/**
 * A small sheet: three students, two assessments (out of 20 and 80).
 *
 * @param over - Scores per student id and assessment id.
 * @returns The sheet.
 */
function sheetOf(over: Record<string, Record<string, number | null>> = {}): CourseGradingSheet {
  const assessments: GradingAssessment[] = [
    { id: "ca", name: "CA", type: "ca", maxScore: 20, dueDate: "2026-10-02", status: "draft", savedAt: null, publishedAt: null, unlockedAt: null, stats: { entered: 0, total: 3, average: null, highest: null, lowest: null, passRate: null } },
    { id: "ex", name: "Exam", type: "exam", maxScore: 80, dueDate: null, status: "not_started", savedAt: null, publishedAt: null, unlockedAt: null, stats: { entered: 0, total: 3, average: null, highest: null, lowest: null, passRate: null } },
  ];
  const students = ["Ada", "Bola", "Chi"].map((name, i) => ({
    id: `s${i + 1}`,
    name,
    admissionNumber: `A${i + 1}`,
    scores: { ca: null, ex: null, ...(over[`s${i + 1}`] ?? {}) },
    total: null,
    percent: null,
    grade: null,
    position: null,
    complete: false,
  }));
  return {
    course: { id: "k", code: "MTH", title: "Mathematics" },
    class: { id: "c", name: "JSS1 A" },
    term: { id: "t", name: "First term" },
    scale: DEFAULT_SCALE,
    passMark: 50,
    assessments,
    totalMax: 100,
    students,
  };
}

describe("score cells", () => {
  it("strip everything but digits and a point as the teacher types", () => {
    expect(sanitizeScoreInput("1a5")).toBe("15");
    expect(sanitizeScoreInput("-12,5")).toBe("125");
    expect(sanitizeScoreInput("12.5")).toBe("12.5");
    expect(sanitizeScoreInput("123456789")).toBe("12345678");
  });

  it.each([
    ["", 20, { kind: "empty" }],
    ["  ", 20, { kind: "empty" }],
    ["15", 20, { kind: "valid", value: 15 }],
    ["20", 20, { kind: "valid", value: 20 }],
    ["0", 20, { kind: "valid", value: 0 }],
    ["12.5", 20, { kind: "valid", value: 12.5 }],
    ["12.", 20, { kind: "valid", value: 12 }],
    ["21", 20, { kind: "above", value: 21 }],
    ["1.2.3", 20, { kind: "invalid" }],
    [".", 20, { kind: "invalid" }],
  ] as const)("%j out of %d reads as %j", (raw, max, expected) => {
    expect(parseScore(raw, max)).toEqual(expected);
  });

  it("show Above {max}, Not a number, Entered or Missing", () => {
    expect(rowStatus(parseScore("25", 20), 20)).toEqual({ label: "Above 20", tone: "danger" });
    expect(rowStatus(parseScore("..", 20), 20).label).toBe("Not a number");
    expect(rowStatus(parseScore("5", 20), 20).label).toBe("Entered");
    expect(rowStatus(parseScore("", 20), 20).label).toBe("Missing");
  });

  it("count only valid scores, with the draft over the saved score", () => {
    expect(cellValue(12, undefined, 20)).toBe(12);
    expect(cellValue(12, "", 20)).toBeNull();
    expect(cellValue(12, "25", 20)).toBeNull();
    expect(cellValue(null, "7", 20)).toBe(7);
  });

  it("send changed valid scores and cleared cells, and hold back invalid ones", () => {
    const sheet = sheetOf({ s1: { ca: 10 }, s2: { ca: 12 } });
    const changes = draftChanges(sheet, sheet.assessments[0], { s1: "", s2: "12", s3: "30" });
    expect(changes.valid).toEqual([{ studentId: "s1", score: null }]);
    expect(changes.invalid).toEqual(["s3"]);
  });

  it("drop drafts that now match what is saved", () => {
    const sheet = sheetOf({ s1: { ca: 10 } });
    expect(pruneDraft(sheet, sheet.assessments[0], { s1: "10", s2: "4" })).toEqual({ s2: "4" });
    expect(pruneDraft(sheet, sheet.assessments[0], { s1: "10" })).toBeUndefined();
  });
});

describe("numbers and grades", () => {
  it("formats percents to one decimal without a trailing .0", () => {
    expect(formatPercent(72.5)).toBe("72.5%");
    expect(formatPercent(70)).toBe("70%");
    expect(formatPercent(66.666)).toBe("66.7%");
    expect(formatPercent(null)).toBe("—");
  });

  it("grades from the school's scale, not fixed letters", () => {
    expect(gradeFor(70, DEFAULT_SCALE)).toBe("A");
    expect(gradeFor(69.96, DEFAULT_SCALE)).toBe("A");
    expect(gradeFor(69.9, DEFAULT_SCALE)).toBe("B");
    expect(gradeFor(45, DEFAULT_SCALE)).toBe("D");
    expect(gradeFor(0, DEFAULT_SCALE)).toBe("F");
    const pass = [
      { letter: "Distinction", min: 75, remark: null },
      { letter: "Pass", min: 40, remark: null },
      { letter: "Fail", min: 0, remark: null },
    ];
    expect(gradeFor(80, pass)).toBe("Distinction");
    expect(gradeFor(50, pass)).toBe("Pass");
    expect(gradeFor(10, [])).toBeNull();
  });

  it("colours below the scale's D minimum, else 45", () => {
    expect(redThreshold(DEFAULT_SCALE)).toBe(45);
    expect(redThreshold([{ letter: "A", min: 80, remark: null }, { letter: "D", min: 50, remark: null }, { letter: "F", min: 0, remark: null }])).toBe(50);
    expect(redThreshold([{ letter: "Pass", min: 40, remark: null }])).toBe(45);
    expect(redThreshold(undefined)).toBe(45);
    expect(isBelowThreshold(8, 20, 45)).toBe(true);
    expect(isBelowThreshold(9, 20, 45)).toBe(false);
    expect(isBelowThreshold(44.9, null, 45)).toBe(true);
    expect(isBelowThreshold(null, 20, 45)).toBe(false);
  });

  it("works out the tiles live, with the pass rate on the pass mark", () => {
    const tiles = statTiles([80, 50, 30], 3, 4, 50);
    expect(tiles).toEqual({ entered: "3 / 4", average: "53.3%", highest: "80%", lowest: "30%", passRate: "67%" });
    expect(statTiles([], 0, 4, 50)).toEqual({ entered: "0 / 4", average: "—", highest: "—", lowest: "—", passRate: "—" });
    expect(statTiles([55], 1, 1, 60).passRate).toBe("0%");
  });

  it("counts the scores on screen for one assessment", () => {
    const sheet = sheetOf({ s1: { ca: 10 } });
    const tiles = assessmentTiles(sheet, sheet.assessments[0], { s2: "20", s3: "99" });
    expect(tiles.entered).toBe("2 / 3");
    expect(tiles.average).toBe("75%");
    expect(tiles.passRate).toBe("100%");
  });
});

describe("term totals and positions", () => {
  it("ranks with standard competition ranking (1, 1, 3)", () => {
    const items = ["a", "b", "c", "d"];
    const score: Record<string, number | null> = { a: 90, b: 90, c: 70, d: null };
    const ranks = competitionRanks(items, (x) => score[x]);
    expect(ranks.get("a")).toEqual({ rank: 1, of: 3 });
    expect(ranks.get("b")).toEqual({ rank: 1, of: 3 });
    expect(ranks.get("c")).toEqual({ rank: 3, of: 3 });
    expect(ranks.has("d")).toBe(false);
  });

  it("shows ties as 1st= and ordinals correctly", () => {
    const tied = tiedRanks([{ rank: 1, of: 3 }, { rank: 1, of: 3 }, { rank: 3, of: 3 }, null]);
    expect([...tied]).toEqual([1]);
    expect(positionLabel({ rank: 1, of: 3 }, true)).toBe("1st=");
    expect(positionLabel({ rank: 3, of: 3 })).toBe("3rd");
    expect(positionLabel({ rank: 11, of: 30 })).toBe("11th");
    expect(positionLabel({ rank: 22, of: 30 })).toBe("22nd");
    expect(positionLabel(null)).toBe("—");
  });

  it("totals every assessment with unsaved text counted, and grades and ranks only complete students", () => {
    const sheet = sheetOf({ s1: { ca: 18, ex: 60 }, s2: { ca: 10 }, s3: { ca: 18 } });
    const rows = liveTotals(sheet, { ex: { s3: "60", s2: "85" } });
    const [ada, bola, chi] = rows;
    expect(ada).toMatchObject({ total: 78, entered: 2, complete: true, percent: 78, grade: "A", position: { rank: 1, of: 2 } });
    expect(chi).toMatchObject({ total: 78, complete: true, position: { rank: 1, of: 2 } });
    // Bola's exam is above the maximum, so it does not count: incomplete, no grade, no position.
    expect(bola).toMatchObject({ total: 10, entered: 1, complete: false, grade: null, position: null });
    expect(completenessPill(bola, 2)).toEqual({ label: "1 of 2", tone: "warning" });
    expect(completenessPill(ada, 2)).toEqual({ label: "Complete", tone: "success" });
    expect(completenessPill({ complete: false, entered: 0 }, 2).tone).toBe("muted");
    expect(termTotalTiles(rows, 50)).toMatchObject({ entered: "2 / 3", average: "78%" });
    expect(termTotalTab(sheet, rows)).toEqual({ name: "Term total", meta: "CA + Exam = 100", status: { label: "2/3 complete", tone: "muted" } });
  });
});

describe("tabs and status lines", () => {
  it("shows Published, Unlocked, a live Draft count or Not started, and the maximum and due date", () => {
    const sheet = sheetOf({ s1: { ca: 10 } });
    expect(assessmentTab(sheet, sheet.assessments[0], { s2: "5" })).toEqual({
      name: "CA",
      meta: "Out of 20 · due Fri 2 Oct",
      status: { label: "Draft · 2/3", tone: "warning" },
    });
    expect(assessmentTab(sheet, sheet.assessments[1], undefined)).toMatchObject({ meta: "Out of 80 · no due date", status: { label: "Not started" } });
    expect(assessmentTab(sheet, { ...sheet.assessments[0], status: "published" }, undefined).status.label).toBe("Published");
    expect(assessmentTab(sheet, { ...sheet.assessments[0], status: "unlocked" }, undefined).status.label).toBe("Unlocked");
    expect(dueLabel("2026-12-04")).toBe("Fri 4 Dec");
  });

  it("says when a draft was saved, that it is published and locked, or that there are unsaved changes", () => {
    const a = sheetOf().assessments[0];
    expect(assessmentStatusLine({ ...a, savedAt: "2026-09-24T15:12:00.000Z" }, 0, false, NOW, TZ).text).toBe("Draft saved yesterday at 4:12pm. Only you can see it.");
    expect(assessmentStatusLine({ ...a, savedAt: "2026-09-25T08:10:00.000Z" }, 0, false, NOW, TZ).text).toBe("Draft saved today at 9:10am. Only you can see it.");
    expect(assessmentStatusLine({ ...a, status: "published", publishedAt: "2026-09-18T14:29:00.000Z" }, 0, false, NOW, TZ)).toEqual({
      text: "Published 18 Sep. Locked and visible to students and parents.",
      tone: "success",
    });
    expect(assessmentStatusLine(a, 0, true, NOW, TZ)).toEqual({ text: "Unsaved changes", tone: "warning" });
    expect(assessmentStatusLine(a, 2, true, NOW, TZ).text).toBe("2 scores are above the maximum of 20 or not a number.");
    expect(assessmentStatusLine(a, 0, false, NOW, TZ).text).toBe("Nothing saved yet.");
    expect(assessmentStatusLine({ ...a, status: "unlocked", unlockedAt: "2026-09-25T08:00:00.000Z" }, 0, false, NOW, TZ).tone).toBe("accent");
    expect(whenLabel("2026-09-18T14:29:00.000Z", NOW, TZ)).toBe("on 18 Sep");
  });

  it("summarises every assessment on the Term total", () => {
    const sheet = sheetOf({ s1: { ca: 10 } });
    expect(termTotalStatusLine(sheet, {}).text).toBe("CA draft 1/3 · Exam not started");
    expect(termTotalStatusLine(sheet, { ex: { s1: "40" } })).toEqual({ text: "Unsaved changes · CA draft 1/3 · Exam draft 1/3", tone: "warning" });
  });
});

describe("publishing", () => {
  it("is enabled only when every student has a valid score and the assessment is not published", () => {
    const sheet = sheetOf({ s1: { ca: 10 }, s2: { ca: 12 } });
    const ca = sheet.assessments[0];
    expect(canPublish(sheet, ca, undefined)).toBe(false);
    expect(canPublish(sheet, ca, { s3: "14" })).toBe(true);
    expect(canPublish(sheet, ca, { s3: "24" })).toBe(false);
    expect(canPublish(sheet, ca, { s3: "14", s1: "" })).toBe(false);
    expect(canPublish(sheet, { ...ca, status: "published" }, { s3: "14" })).toBe(false);
    expect(canPublish(sheet, { ...ca, status: "unlocked" }, { s3: "14" })).toBe(true);
    expect(canPublish({ ...sheet, students: [] }, ca, undefined)).toBe(false);
    expect(badCount(sheet, ca, { s3: "24" })).toBe(1);
  });

  it("locks only published assessments", () => {
    expect(isLocked({ status: "published" })).toBe(true);
    expect(isLocked({ status: "unlocked" })).toBe(false);
    expect(isLocked({ status: "draft" })).toBe(false);
  });

  it("reads the 409 bodies: LOCKED (top level or in error), missing and waitingOn", () => {
    expect(isLockedError(conflict({ code: "LOCKED" }))).toBe(true);
    expect(isLockedError(conflict({ error: { code: "LOCKED", message: "Locked" } }))).toBe(true);
    expect(isLockedError(conflict({ missing: 2 }))).toBe(false);
    expect(isLockedError(ApiError.fromResponse({ status: 400 }, { message: "Bad", error: { code: "LOCKED" } } as ApiErrorBody))).toBe(false);
    expect(isLockedError(new Error("x"))).toBe(false);
    expect(missingScoresFromError(conflict({ missing: 3 }))).toBe(3);
    expect(missingScoresFromError(conflict({ code: "LOCKED" }))).toBeNull();
    expect(waitingOnFromError(conflict({ waitingOn: [{ courseId: "o1", title: "English" }] }))).toEqual([{ courseId: "o1", title: "English" }]);
    expect(waitingOnFromError(conflict({}))).toBeNull();
  });

  it("tells the teacher how many people were notified", () => {
    expect(publishedMessage("1st CA", { notified: 24, changed: [] }, false)).toBe("1st CA published. Students and parents can see the scores; 24 people have been notified.");
    expect(publishedMessage("1st CA", { notified: 2, changed: ["s1"] }, true)).toBe("1st CA published again. 1 score changed; 2 people have been notified.");
    expect(publishedMessage("1st CA", { notified: 0, changed: [] }, true)).toBe("1st CA published again. No score changed, so nobody was notified.");
  });
});

describe("the class report", () => {
  const subject = (over: Partial<ReadinessSubject>): ReadinessSubject => ({
    course: { id: "o1", code: "ENG", title: "English" },
    teacher: { id: "t", name: "Mrs. Okoro" },
    isMine: false,
    cells: [
      { assessmentId: "a1", status: "published", reminderSentAt: null },
      { assessmentId: "a2", status: "draft", reminderSentAt: null },
    ],
    ...over,
  });
  const cols = [
    { id: "a1", name: "1st CA" },
    { id: "a2", name: "2nd CA" },
  ];

  it("reminds about the first assessment not yet published, in the reminder's copy", () => {
    const action = readinessAction(subject({}), cols, NOW, TZ);
    expect(action).toEqual({ kind: "remind", courseId: "o1", assessmentId: "a2", assessmentName: "2nd CA", teacherName: "Mrs. Okoro", tip: "Message Mrs. Okoro about the 2nd CA deadline" });
  });

  it("shows Reminder sent once sent today, and offers it again the next day", () => {
    const sentToday = subject({ cells: [{ assessmentId: "a1", status: "draft", reminderSentAt: "2026-09-25T07:00:00.000Z" }] });
    expect(readinessAction(sentToday, cols, NOW, TZ).kind).toBe("reminded");
    const sentYesterday = subject({ cells: [{ assessmentId: "a1", status: "draft", reminderSentAt: "2026-09-24T07:00:00.000Z" }] });
    expect(readinessAction(sentYesterday, cols, NOW, TZ).kind).toBe("remind");
    expect(remindedToday(null, NOW, TZ)).toBe(false);
  });

  it("offers Open on the caller's own course, nothing once all published, and says when nobody teaches it", () => {
    expect(readinessAction(subject({ isMine: true }), cols, NOW, TZ)).toMatchObject({ kind: "open", assessmentId: "a2" });
    const done = subject({ cells: cols.map((c) => ({ assessmentId: c.id, status: "published" as const, reminderSentAt: null })) });
    expect(readinessAction(done, cols, NOW, TZ).kind).toBe("none");
    expect(readinessAction(subject({ teacher: null }), cols, NOW, TZ).kind).toBe("no_teacher");
  });

  it("is a preview until every subject has published, naming who it waits on", () => {
    const sheet = makeBroadsheetFixture("c1", "a1");
    expect(sheet.ready).toBe(false);
    expect(broadsheetNote(sheet, new Set(["k1"]))).toBe(
      "Preview only. Waiting on Mathematics (yours), Social Studies. Gaps show as dashes until they publish.",
    );
    expect(broadsheetNote({ ...sheet, ready: true, waitingOn: [] }, new Set())).toBe(
      "Every subject has published 1st CA scores. Generate the summary to rank the class and send it to the school office.",
    );
  });

  it("sorts by position with the unranked last, or A to Z", () => {
    const rows = [
      { student: { name: "Chi" }, position: null },
      { student: { name: "Bola" }, position: { rank: 2, of: 3 } },
      { student: { name: "Ada" }, position: { rank: 2, of: 3 } },
      { student: { name: "Dayo" }, position: { rank: 1, of: 3 } },
    ];
    expect(sortReportRows(rows, "pos").map((r) => r.student.name)).toEqual(["Dayo", "Ada", "Bola", "Chi"]);
    expect(sortReportRows(rows, "name").map((r) => r.student.name)).toEqual(["Ada", "Bola", "Chi", "Dayo"]);
  });

  it("flags broadsheet cells below the threshold and dashes the gaps", () => {
    expect(broadsheetCells({ cells: [8, 9, null] }, 20, 45)).toEqual([
      { text: "8", low: true, empty: false },
      { text: "9", low: false, empty: false },
      { text: "—", low: false, empty: true },
    ]);
  });

  it("shows where the submission stands: none, submitted, returned with the reason, published", () => {
    expect(submissionView(undefined, "1st CA", NOW, TZ)).toEqual({ banner: null, label: "Generate 1st CA summary", canSubmit: true });
    const submitted = submissionView(setTermResultFixture("a1", "submitted"), "1st CA", NOW, TZ);
    expect(submitted).toMatchObject({ label: "Submitted", canSubmit: false, banner: { tone: "info" } });
    expect(submitted.banner?.text).toBe("Submitted to the school office yesterday at 11:00am. The office publishes it to students and parents.");
    const returned = submissionView(setTermResultFixture("a1", "returned", "Two positions look wrong"), "1st CA", NOW, TZ);
    expect(returned).toMatchObject({ label: "Submit 1st CA summary again", canSubmit: true });
    expect(returned.banner?.text).toBe("Returned by the school office today at 9:00am: “Two positions look wrong”. Make the changes, then submit it again.");
    expect(submissionView(setTermResultFixture("total", "published"), "Term total", NOW, TZ)).toMatchObject({ label: "Published", canSubmit: false, banner: { tone: "success" } });
  });

  it("locks remarks while results are submitted or published, not when returned", () => {
    expect(remarksLock([])).toBeNull();
    expect(remarksLock([setTermResultFixture("a1", "returned")])).toBeNull();
    expect(remarksLock([setTermResultFixture("a1", "submitted")])?.status).toBe("submitted");
    expect(remarksLock([setTermResultFixture("total", "published")])?.status).toBe("published");
  });
});

describe("CSV", () => {
  it("exports the scores on screen and reads them back into unsaved cells", () => {
    const sheet = makeCourseSheetFixture("k1");
    const a1 = sheet.assessments[0];
    const file = assessmentCsv(sheet, a1, { [sheet.students[0].id]: "17" });
    expect(file.filename).toBe("mathematics-jss1-a-1st-ca-first-term.csv");
    const lines = file.csv.split("\r\n");
    expect(lines[0]).toBe("Student ID,Admission number,Student,Score,Max score");
    expect(lines[1]).toBe(`${sheet.students[0].id},${sheet.students[0].admissionNumber},${sheet.students[0].name},17,20`);

    const imported = importScoresCsv(
      ["Student,Score", `${sheet.students[0].name},12`, "Nobody Here,5", `${sheet.students[1].name},25`, `${sheet.students[2].name},`].join("\n"),
      sheet,
      a1,
    );
    expect(imported.draft).toEqual({ [sheet.students[0].id]: "12" });
    expect(imported.filled).toBe(1);
    expect(imported.problems).toEqual([`Row 3: no student in this class matches “Nobody Here”.`, `Row 4: 25 is outside 0–20.`]);
  });

  it("matches an admission number in the id column and ignores the file's own maximum", () => {
    const sheet = makeCourseSheetFixture("k1");
    const a1 = sheet.assessments[0];
    const s = sheet.students[3];
    const imported = importScoresCsv(`Student ID,Score,Max score\n${s.admissionNumber},19,100`, sheet, a1);
    expect(imported.draft).toEqual({ [s.id]: "19" });
    expect(importScoresCsv(`Student ID,Score,Max score\n${s.admissionNumber},80,100`, sheet, a1).problems).toEqual(["Row 2: 80 is outside 0–20."]);
    expect(importScoresCsv("Name\nAda", sheet, a1).problems).toEqual(["Row 1: No score column. Add a column headed “Score”."]);
  });

  it("exports the Term total with every assessment, total, grade and tied positions", () => {
    const sheet = makeCourseSheetFixture("k2");
    const file = termTotalCsv(sheet, liveTotals(sheet, {}));
    const [head, first] = file.csv.split("\r\n");
    expect(head).toBe("Student ID,Admission number,Student,1st CA (/20),2nd CA (/20),Exam (/60),Total (/100),Grade,Position");
    expect(first.split(",").length).toBe(9);
    expect(file.filename).toBe("mathematics-jss2-b-term-total-first-term.csv");
  });
});
