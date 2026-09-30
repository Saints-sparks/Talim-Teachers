import { attentionHref, classMessagesRoute, pickRegisterAction, registerRoute, schemeOfWorkRoute, setupStepHref, uploadResourceRoute } from "@/hooks/today/today.routes";
import { makeTodayFixture } from "@/lib/fixtures/today.fixture";
import type { RegisterStatus } from "@/types/today";

describe("attention targets → routes", () => {
  it.each([
    [{ page: "attendance", classId: "c1", date: "2026-09-25" }, "/attendance/class/c1?date=2026-09-25"],
    [{ page: "attendance" }, "/attendance"],
    [{ page: "grading", courseId: "k1", assessmentId: "a1" }, "/grading?courseId=k1&assessmentId=a1"],
    [{ page: "grading" }, "/grading"],
    [{ page: "messages", roomId: "t1" }, "/messages?room=t1"],
    [{ page: "messages" }, "/messages"],
    [{ page: "resources", courseId: "k1", week: 3 }, "/subjects?courseId=k1&tab=resources&upload=1&week=3"],
    [{ page: "resources", courseId: "k1" }, "/subjects?courseId=k1&tab=resources&upload=1"],
    [{ page: "resources" }, "/subjects?tab=resources&upload=1"],
    [{ page: "subjects", courseId: "k1", week: 3 }, "/subjects?courseId=k1&tab=plan&week=3"],
    [{ page: "subjects" }, "/subjects"],
    [{ page: "leave", classId: "c1" }, "/attendance/class/c1"],
    [{ page: "leave" }, "/attendance"],
    // Round 4 §30: the pages notifications add.
    [{ page: "announcements" }, "/notifications?tab=announcements"],
    [{ page: "timetable" }, "/timetable"],
    [{ page: "timetable", date: "2026-09-28" }, "/timetable?date=2026-09-28"],
    [{ page: "settings" }, "/settings"],
  ] as const)("%j → %s", (target, href) => {
    expect(attentionHref(target)).toBe(href);
  });

  it("maps every fixture action to an in-app path", () => {
    for (const item of makeTodayFixture().attention) expect(attentionHref(item.action.target)).toMatch(/^\/[a-z]/);
  });

  it("encodes ids", () => {
    expect(registerRoute("a/b")).toBe("/attendance/class/a%2Fb");
    expect(schemeOfWorkRoute("k1")).toBe("/subjects?courseId=k1&tab=plan");
    expect(uploadResourceRoute()).toBe("/subjects?tab=resources&upload=1");
    expect(uploadResourceRoute("a/b", 4)).toBe("/subjects?courseId=a%2Fb&tab=resources&upload=1&week=4");
    expect(uploadResourceRoute("k1", null)).toBe("/subjects?courseId=k1&tab=resources&upload=1");
  });
});

describe("Take register", () => {
  const base = makeTodayFixture().registers[0];
  const reg = (over: Partial<RegisterStatus>): RegisterStatus => ({ ...base, ...over });

  it("opens the first class-teacher register not yet submitted", () => {
    const action = pickRegisterAction(
      [reg({ classId: "a", submittedAt: "2026-09-25T07:44:00Z" }), reg({ classId: "b" }), reg({ classId: "c" })],
      "2026-09-25",
      true,
    );
    expect(action).toMatchObject({ kind: "take", href: "/attendance/class/b?date=2026-09-25" });
  });

  it("skips a class with no students", () => {
    const action = pickRegisterAction([reg({ classId: "empty", studentCount: 0 }), reg({ classId: "b" })], "2026-09-25", true);
    expect(action).toMatchObject({ kind: "take", href: "/attendance/class/b?date=2026-09-25" });
    expect(pickRegisterAction([reg({ studentCount: 0 })], "2026-09-25", true).kind).toBe("hidden");
  });

  it("reports 'submitted' once every register is in", () => {
    expect(pickRegisterAction([reg({ submittedAt: "2026-09-25T07:44:00Z" })], "2026-09-25", true).kind).toBe("submitted");
  });

  it("is hidden for a subject teacher, and on a day with no school", () => {
    expect(pickRegisterAction([reg({ isClassTeacher: false })], "2026-09-25", true).kind).toBe("hidden");
    expect(pickRegisterAction([], "2026-09-25", true).kind).toBe("hidden");
    expect(pickRegisterAction([reg({})], "2026-09-26", false).kind).toBe("hidden");
  });
});

describe("setup steps", () => {
  it("send each step somewhere, except the tour, which opens in place", () => {
    expect(setupStepHref("profile")).toBe("/settings?tab=account");
    expect(setupStepHref("register")).toBe("/attendance");
    expect(setupStepHref("publish")).toBe("/grading");
    expect(setupStepHref("plan")).toBe("/subjects");
    expect(setupStepHref("resource")).toBe("/subjects?tab=resources&upload=1");
    expect(setupStepHref("tour")).toBeNull();
  });
});

describe("Message the class", () => {
  it("opens the class-group room when the lesson has one, else the inbox", () => {
    expect(classMessagesRoute("room 1")).toBe("/messages?room=room+1");
    expect(classMessagesRoute(null)).toBe("/messages");
  });
});
