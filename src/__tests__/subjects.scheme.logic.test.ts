import {
  canMarkWeek,
  cardMeta,
  detailMeta,
  formatBytes,
  kindChip,
  kindFromFile,
  lessonsAWeek,
  parseSubjectsParams,
  resourceHref,
  resourceMeta,
  resourcesForTerm,
  resourcesSharedText,
  shortDate,
  subjectLabel,
  subjectsHref,
  taughtPercent,
  taughtToast,
  uploadDoneNote,
  uploadNamePlaceholder,
  uploadWeekLabel,
  viewsText,
  visibilityLabel,
  weeksTaughtText,
  weekTag,
} from "@/hooks/subjects/scheme.logic";
import {
  FIXTURE_CURRENT_WEEK,
  makeCourseResourcesFixture,
  makeSchemeFixture,
  makeSubjectCardsFixture,
  resetSubjectsFixtureStore,
  saveSchemeWeekFixture,
  setWeekTaughtFixture,
  createResourceFixture,
  removeResourceFixture,
} from "@/lib/fixtures/subjects.fixture";
import type { SubjectCard } from "@/types/subjects";

const NOW = new Date(2026, 8, 25, 10, 25).getTime();

const card = (over: Partial<SubjectCard> = {}): SubjectCard => ({ ...makeSubjectCardsFixture()[0], ...over });

beforeEach(() => resetSubjectsFixtureStore());

describe("weeks taught", () => {
  it("counts against the term's weeks, never a fixed 12", () => {
    expect(weeksTaughtText(2, 12)).toBe("2 of 12 weeks taught");
    expect(weeksTaughtText(7, 14)).toBe("7 of 14 weeks taught");
    expect(taughtPercent(7, 14)).toBe(50);
    expect(taughtPercent(2, 12)).toBe(17);
    expect(taughtPercent(3, 14)).toBe(21);
  });

  it("keeps the bar between 0 and 100", () => {
    expect(taughtPercent(0, 0)).toBe(0);
    expect(taughtPercent(20, 14)).toBe(100);
    expect(taughtPercent(-1, 14)).toBe(0);
  });
});

describe("week tags and the taught toggle", () => {
  it("prefers Taught over This week, and Planned otherwise", () => {
    expect(weekTag({ week: 3, taughtAt: "2026-09-25T09:00:00Z" }, 3)).toEqual({ label: "Taught", tone: "success" });
    expect(weekTag({ week: 3, taughtAt: null }, 3)).toEqual({ label: "This week", tone: "info" });
    expect(weekTag({ week: 4, taughtAt: null }, 3)).toEqual({ label: "Planned", tone: "muted" });
    expect(weekTag({ week: 1, taughtAt: "2026-09-11T14:00:00Z" }, null).label).toBe("Taught");
    expect(weekTag({ week: 3, taughtAt: null }, null).label).toBe("Planned");
  });

  it("allows marking only weeks up to the current one, and none outside the term", () => {
    expect(canMarkWeek(1, 3)).toBe(true);
    expect(canMarkWeek(3, 3)).toBe(true);
    expect(canMarkWeek(4, 3)).toBe(false);
    expect(canMarkWeek(1, null)).toBe(false);
  });

  it("words the toasts as the design does", () => {
    expect(taughtToast(3, true)).toBe("Week 3 marked as taught.");
    expect(taughtToast(3, false)).toBe("Marked as not taught.");
  });
});

describe("meta lines", () => {
  it("writes the card meta with singular lessons", () => {
    expect(lessonsAWeek(1)).toBe("1 lesson a week");
    expect(lessonsAWeek(6)).toBe("6 lessons a week");
    expect(cardMeta(card({ lessonsPerWeek: 6 }))).toBe("JSS1 A · 6 lessons a week");
    expect(cardMeta(card({ lessonsPerWeek: 1 }))).toBe("JSS1 A · 1 lesson a week");
    expect(subjectLabel(card())).toBe("Mathematics · JSS1 A");
  });

  it("writes the detail meta, without 'now' outside the term", () => {
    const c = card({ lessonsPerWeek: 6, studentCount: 12, currentWeek: 3, totalWeeks: 12 });
    expect(detailMeta(c)).toBe("MTH111 · 12 students · 6 lessons a week · week 3 of 12 now");
    expect(detailMeta(c, { currentWeek: 5, totalWeeks: 14 })).toBe("MTH111 · 12 students · 6 lessons a week · week 5 of 14 now");
    expect(detailMeta(c, { currentWeek: null, totalWeeks: 12 })).toBe("MTH111 · 12 students · 6 lessons a week");
    expect(detailMeta(card({ studentCount: 1, lessonsPerWeek: 1, currentWeek: null }))).toBe("MTH111 · 1 student · 1 lesson a week");
  });

  it("counts resources and views with singulars", () => {
    expect(resourcesSharedText(1)).toBe("1 resource shared");
    expect(resourcesSharedText(3)).toBe("3 resources shared");
    expect(viewsText(1)).toBe("1 view");
    expect(viewsText(11)).toBe("11 views");
    expect(viewsText(0)).toBe("0 views");
  });
});

describe("resources", () => {
  it("formats sizes the way the design shows them", () => {
    expect(formatBytes(420 * 1024)).toBe("420 KB");
    expect(formatBytes(Math.round(2.1 * 1024 * 1024))).toBe("2.1 MB");
    expect(formatBytes(38 * 1024 * 1024)).toBe("38 MB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2 MB");
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(3.5 * 1024 * 1024 * 1024)).toBe("3.5 GB");
    expect(formatBytes(null)).toBe("");
    expect(formatBytes(undefined)).toBe("");
  });

  it("names who can see it", () => {
    expect(visibilityLabel("students")).toBe("Students");
    expect(visibilityLabel("students_and_parents")).toBe("Students and parents");
    expect(visibilityLabel(undefined)).toBe("Students");
  });

  it("writes short dates, with the year only when it is not this year", () => {
    expect(shortDate("2026-09-08", NOW)).toBe("8 Sep");
    expect(shortDate(new Date(2026, 8, 15, 11, 30).toISOString(), NOW)).toBe("15 Sep");
    expect(shortDate("2025-07-24", NOW)).toBe("24 Jul 2025");
    expect(shortDate("not a date", NOW)).toBe("");
    expect(shortDate(undefined, NOW)).toBe("");
  });

  it("builds the row meta from the fixture's resources", () => {
    const [r1, r2] = makeCourseResourcesFixture("k1");
    expect(resourceMeta({ ...r1, uploadDate: "2026-09-08" }, NOW)).toBe("Week 1 · 420 KB · 8 Sep · Students and parents");
    expect(resourceMeta({ ...r2, uploadDate: "2026-09-15" }, NOW)).toBe("Week 2 · 2.1 MB · 15 Sep · Students");
    // A resource saved before §24: no week or size; the server answers `visibility: 'students'`.
    expect(resourceMeta({ uploadDate: "2026-09-01", visibility: "students" }, NOW)).toBe("1 Sep · Students");
  });

  it("labels the kind chip from the kind the server always answers", () => {
    expect(kindChip({ kind: "pdf" })).toEqual({ label: "PDF", tone: "danger" });
    expect(kindChip({ kind: "slides" }).label).toBe("Slides");
    expect(kindChip({ kind: "video" }).label).toBe("Video");
    expect(kindChip({ kind: "doc" }).label).toBe("Doc");
    expect(kindChip({ kind: "image" }).label).toBe("Image");
    expect(kindChip({ kind: "other" }).label).toBe("File");
    // A kind added on the server later still gets a chip.
    expect(kindChip({ kind: "audio" as never }).label).toBe("File");
    // The upload derives the kind it sends the same way the server does.
    expect(kindFromFile(null, "https://cdn.test/a/notes.docx")).toBe("doc");
    expect(kindFromFile("video/mp4", "Old upload")).toBe("video");
    expect(kindFromFile(null, "deck.PPTX")).toBe("slides");
    expect(kindFromFile("application/zip", "bundle.zip")).toBe("other");
  });

  it("keeps the page's term and resources without a term", () => {
    const list = [
      { _id: "a", name: "A", termId: "term-1" },
      { _id: "b", name: "B", termId: { _id: "term-0" } },
      { _id: "c", name: "C", termId: null },
    ];
    expect(resourcesForTerm(list, "term-1").map((r) => r._id)).toEqual(["a", "c"]);
    expect(resourcesForTerm(list, undefined)).toHaveLength(3);
  });

  it("opens the first file", () => {
    expect(resourceHref({ files: ["https://f/1.pdf"], image: "https://f/i.png" })).toBe("https://f/1.pdf");
    expect(resourceHref({ files: [], image: "https://f/i.png" })).toBe("https://f/i.png");
    expect(resourceHref({ files: [], image: null })).toBeNull();
  });
});

describe("upload sheet wording", () => {
  it("labels weeks, marks this week, and suggests a name", () => {
    expect(uploadWeekLabel({ week: 3, topic: "Fractions: types and equivalence" }, 3)).toBe("Week 3 · Fractions: types and equivalence (this week)");
    expect(uploadWeekLabel({ week: 4, topic: "" }, 3)).toBe("Week 4");
    expect(uploadNamePlaceholder("Fractions: types and equivalence", 3)).toBe("e.g. Fractions: types and equivalence worksheet");
    expect(uploadNamePlaceholder("", 4)).toBe("e.g. Week 4 worksheet");
  });

  it("writes the done note", () => {
    expect(uploadDoneNote(" Fractions worksheet ", "students", "JSS1 A", 3)).toBe("“Fractions worksheet” is now available to students in JSS1 A, filed under week 3.");
    expect(uploadDoneNote("Slides", "students_and_parents", "JSS2 B", 2)).toBe("“Slides” is now available to students and parents in JSS2 B, filed under week 2.");
  });
});

describe("deep links", () => {
  it("accepts courseId, tab plan|resources and week 1..30", () => {
    expect(parseSubjectsParams({ courseId: "k2", tab: "plan", week: "3" })).toEqual({ courseId: "k2", tab: "plan", week: 3 });
    expect(parseSubjectsParams({ courseId: "k1", tab: "resources" })).toEqual({ courseId: "k1", tab: "resources" });
    expect(parseSubjectsParams({ week: "30" })).toEqual({ week: 30 });
    // The upload deep link every "Upload" / "Share a resource" uses.
    expect(parseSubjectsParams({ courseId: "k2", tab: "resources", upload: "1", week: "4" })).toEqual({ courseId: "k2", tab: "resources", upload: true, week: 4 });
    expect(parseSubjectsParams({ tab: "resources", upload: "true" })).toEqual({ tab: "resources", upload: true });
  });

  it("drops anything it does not recognise", () => {
    expect(parseSubjectsParams({ courseId: "  ", tab: "res", week: "0" })).toEqual({});
    expect(parseSubjectsParams({ week: "31" })).toEqual({});
    expect(parseSubjectsParams({ week: "2.5" })).toEqual({});
    expect(parseSubjectsParams({ week: "abc", tab: null, courseId: null })).toEqual({});
    expect(parseSubjectsParams({ upload: "0" })).toEqual({});
    expect(parseSubjectsParams({ upload: "yes please" })).toEqual({});
  });

  it("builds the address the page keeps", () => {
    expect(subjectsHref({ courseId: "k1", tab: "plan" })).toBe("/subjects?courseId=k1&tab=plan");
    expect(subjectsHref({ tab: "resources" })).toBe("/subjects?tab=resources");
  });
});

describe("subjects fixture", () => {
  it("mirrors the design seed", () => {
    const cards = makeSubjectCardsFixture();
    expect(cards.map((c) => [c.course.code, c.class.name, c.studentCount, c.taughtCount, c.totalWeeks, c.currentWeek, c.resourceCount])).toEqual([
      ["MTH111", "JSS1 A", 12, 2, 12, 3, 2],
      ["MTH211", "JSS2 B", 10, 2, 12, 3, 1],
      ["FMT201", "JSS2 B", 10, 2, 12, 3, 1],
    ]);
    expect(cards[0].legacyCurriculum).not.toBeNull();
    expect(cards[1].legacyCurriculum).toBeNull();
    const scheme = makeSchemeFixture("k1")!;
    expect(scheme.weeks).toHaveLength(12);
    expect(scheme.currentWeek).toBe(FIXTURE_CURRENT_WEEK);
    expect(scheme.weeks[2].topic).toBe("Fractions: types and equivalence");
    expect(scheme.weeks[5].objectives).not.toBe("");
    expect(scheme.weeks[6].objectives).toBe("");
    expect(scheme.weeks[0].resourceCount).toBe(1);
    expect(makeSchemeFixture("k9")).toBeNull();
    expect(makeSchemeFixture("k1", "term-0")!.currentWeek).toBeNull();
  });

  it("stores saves, taught toggles, uploads and removals until reset", () => {
    saveSchemeWeekFixture("k1", 7, { topic: "Mid-term review", objectives: "Revise weeks 1 to 6." });
    setWeekTaughtFixture("k1", 3, { taught: true });
    createResourceFixture({ name: "New", classId: "c1", courseId: "k1", termId: "term-1", files: ["u"], week: 3, visibility: "students", mimeType: "application/pdf", sizeBytes: 10 });
    removeResourceFixture("r1");
    const scheme = makeSchemeFixture("k1")!;
    expect(scheme.weeks[6].objectives).toBe("Revise weeks 1 to 6.");
    expect(scheme.weeks[2].taughtAt).not.toBeNull();
    expect(scheme.weeks[2].resourceCount).toBe(1);
    expect(makeCourseResourcesFixture("k1").map((r) => r.name)).toEqual(["Factors and multiples slides", "New"]);
    expect(makeSubjectCardsFixture()[0].taughtCount).toBe(3);
    resetSubjectsFixtureStore();
    expect(makeCourseResourcesFixture("k1")).toHaveLength(2);
    expect(makeSchemeFixture("k1")!.weeks[2].taughtAt).toBeNull();
  });
});
