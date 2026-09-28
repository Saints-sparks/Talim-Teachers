import {
  canEditRegister,
  canSubmitRegister,
  clampRegisterDate,
  countRegister,
  marksFor,
  markRestPresent,
  mergeMarks,
  missingFromError,
  parentsToNotify,
  progressText,
  pruneSaved,
  registerBanner,
  registerHeading,
  registerProgress,
  stepSchoolDay,
  submittedMessage,
} from "@/hooks/attendance/register.logic";
import { ApiError } from "@/lib/apiError";
import { makeRegisterFixture } from "@/lib/fixtures/classroom.fixture";
import { FIXTURE_NOW } from "@/lib/fixtures/today.fixture";
import type { RegisterView } from "@/types/classroom";

const TZ = "Africa/Lagos";
const NOW = Date.parse(FIXTURE_NOW); // 10:25 Friday 25 September, before the 11:00 close
const lagos = (hhmm: string) => Date.parse(`2026-09-25T${hhmm}:00+01:00`);

describe("counts and progress", () => {
  it("counts the open JSS1 A register: 11 to mark, Zainab on leave", () => {
    const view = makeRegisterFixture("c1");
    expect(countRegister(view.students)).toEqual({ present: 0, late: 0, absent: 0, onLeave: 1, unmarked: 11 });
    expect(registerProgress(view.students)).toEqual({ marked: 0, markable: 11, allMarked: false, onLeave: 1, absent: 0 });
    expect(progressText(registerProgress(view.students))).toEqual({ headline: "0 of 11 marked", note: "11 still to mark · 1 on approved leave" });
  });

  it("lays local marks over the server's, never over approved leave", () => {
    const view = makeRegisterFixture("c1");
    const merged = mergeMarks(view.students, {
      s1: { status: "absent", absenceReason: "Sick", note: null },
      s9: { status: "present", absenceReason: null, note: null },
    });
    expect(merged.find((s) => s.id === "s1")).toMatchObject({ status: "absent", absenceReason: "Sick" });
    expect(merged.find((s) => s.id === "s9")?.status).toBe("on_leave");
  });

  it("'Mark the rest present' fills only the unmarked and keeps other marks", () => {
    const view = makeRegisterFixture("c1");
    const overlay = markRestPresent(mergeMarks(view.students, { s1: { status: "late", absenceReason: null, note: null } }), {
      s1: { status: "late", absenceReason: null, note: null },
    });
    const merged = mergeMarks(view.students, overlay);
    expect(merged.find((s) => s.id === "s1")?.status).toBe("late");
    expect(merged.find((s) => s.id === "s9")?.status).toBe("on_leave");
    expect(registerProgress(merged)).toMatchObject({ marked: 11, markable: 11, allMarked: true });
    expect(progressText(registerProgress(merged)).note).toBe("Ready to submit.");
  });

  it("says how many parents will be notified once everyone is marked", () => {
    const view = makeRegisterFixture("c1");
    const absent = { s1: { status: "absent" as const, absenceReason: null, note: null }, s2: { status: "absent" as const, absenceReason: null, note: null } };
    const overlay = markRestPresent(mergeMarks(view.students, absent), absent);
    const merged = mergeMarks(view.students, overlay);
    expect(progressText(registerProgress(merged)).note).toBe("Ready to submit. 2 absent parents will be notified.");
    expect(progressText(registerProgress(merged), 1).note).toBe("Ready to submit. 1 absent parent will be notified.");
  });

  it("needs someone to mark before 'all marked' is true", () => {
    expect(registerProgress([]).allMarked).toBe(false);
  });
});

describe("access → what the teacher can do", () => {
  const open = makeRegisterFixture("c1");
  const submitted: RegisterView = { ...open, submittedAt: "2026-09-25T07:44:00.000Z" };
  const everyone = mergeMarks(open.students, markRestPresent(open.students, {}));

  it("edits an open register, and a submitted one only after Edit register", () => {
    expect(canEditRegister(open, false)).toBe(true);
    expect(canEditRegister(submitted, false)).toBe(false);
    expect(canEditRegister(submitted, true)).toBe(true);
  });

  it("never edits a view-only register", () => {
    expect(canEditRegister(makeRegisterFixture("c2"), true)).toBe(false);
    expect(canEditRegister(makeRegisterFixture("c1", "2026-09-24"), true)).toBe(false);
  });

  it("can submit only when editable and everyone is marked", () => {
    expect(canSubmitRegister(open, false, open.students)).toBe(false);
    expect(canSubmitRegister(open, false, everyone)).toBe(true);
    expect(canSubmitRegister(submitted, false, everyone)).toBe(false);
    expect(canSubmitRegister(submitted, true, everyone)).toBe(true);
  });
});

describe("banner", () => {
  const open = makeRegisterFixture("c1");

  it("shows nothing on an open register before the close time", () => {
    expect(registerBanner(open, false, NOW, TZ)).toBeNull();
  });

  it("says overdue after the close time", () => {
    expect(registerBanner(open, false, lagos("11:10"), TZ)).toMatchObject({ tone: "danger", text: expect.stringMatching(/^Register overdue · closed at 11:00\./) });
  });

  it("offers Edit register on a submitted register, then Cancel while editing", () => {
    const submitted = { ...open, submittedAt: "2026-09-25T07:44:00.000Z" };
    expect(registerBanner(submitted, false, NOW, TZ)).toEqual({
      tone: "success",
      text: "Submitted at 8:44am. Parents of absent students were notified. You can edit until 4:00pm today.",
      action: "edit",
    });
    expect(registerBanner(submitted, true, NOW, TZ)).toEqual({
      tone: "warning",
      text: "You are editing a submitted register. Resubmit to save your changes.",
      action: "cancel",
    });
  });

  it("explains each read-only reason", () => {
    expect(registerBanner(makeRegisterFixture("c1", "2026-09-24"), false, NOW, TZ)?.text).toBe(
      "Past registers are read-only. Ask the school office if a record needs correcting.",
    );
    expect(registerBanner(makeRegisterFixture("c2"), false, NOW, TZ)?.text).toBe(
      "View only. Only the class teacher can take this register. Submitted at 8:44am by Bola Ajayi.",
    );
    expect(registerBanner(makeRegisterFixture("c1", "2026-09-19"), false, NOW, TZ)?.text).toBe("There is no register at weekends.");
    expect(registerBanner(makeRegisterFixture("c1", "2026-09-25", { holiday: "Founders' Day" }), false, NOW, TZ)?.text).toBe(
      "Founders' Day: the school is closed, so there is no register today.",
    );
    expect(registerBanner(makeRegisterFixture("c1", "2026-09-28"), false, NOW, TZ)?.text).toBe("This day has not come yet. Its register opens that morning.");
    const late: RegisterView = { ...open, access: "view", readOnlyReason: "after_edit_window", submittedAt: "2026-09-25T07:44:00.000Z", submittedBy: null };
    expect(registerBanner(late, false, lagos("16:30"), TZ)?.text).toMatch(/^Submitted at 8:44am\. Changes closed at 4:00pm/);
    const never: RegisterView = { ...late, submittedAt: null };
    expect(registerBanner(never, false, lagos("16:30"), TZ)).toMatchObject({ tone: "danger" });
    const noTerm = makeRegisterFixture("c1", "2026-09-04");
    expect(noTerm.readOnlyReason).toBe("not_school_day");
    expect(registerBanner(noTerm, false, NOW, TZ)?.text).toBe("This day is outside the term, so there is no register.");
  });
});

describe("saving", () => {
  const view = makeRegisterFixture("c1");

  it("sends marks only for marked students not on leave, with reasons and notes", () => {
    const merged = mergeMarks(view.students, {
      s1: { status: "absent", absenceReason: "Travel", note: "Back Monday" },
      s2: { status: "present", absenceReason: null, note: null },
    });
    expect(marksFor(merged)).toEqual([
      { studentId: "s2", status: "present" },
      { studentId: "s1", status: "absent", absenceReason: "Travel", note: "Back Monday" },
    ].sort((a, b) => merged.findIndex((s) => s.id === a.studentId) - merged.findIndex((s) => s.id === b.studentId)));
  });

  it("drops local marks once the server holds them, keeping newer ones", () => {
    const server = mergeMarks(view.students, { s1: { status: "present", absenceReason: null, note: null } });
    expect(
      pruneSaved(
        { s1: { status: "present", absenceReason: null, note: null }, s2: { status: "late", absenceReason: null, note: null } },
        server,
      ),
    ).toEqual({ s2: { status: "late", absenceReason: null, note: null } });
  });

  it("counts parents: every absent on a first submit, only the newly absent on a resubmit, or the server's number", () => {
    const merged = mergeMarks(view.students, {
      s1: { status: "absent", absenceReason: null, note: null },
      s2: { status: "absent", absenceReason: null, note: null },
    });
    expect(parentsToNotify(merged, [])).toBe(2);
    expect(parentsToNotify(merged, ["s1"])).toBe(1);
    expect(parentsToNotify(merged, [], 5)).toBe(5);
    expect(submittedMessage("JSS1 A", 2)).toBe("Register for JSS1 A submitted. 2 absent parents have been notified.");
    expect(submittedMessage("JSS1 A", 1)).toBe("Register for JSS1 A submitted. 1 absent parent has been notified.");
  });
});

describe("409 missing", () => {
  it("reads `missing` from the top level of the error envelope", () => {
    const error = ApiError.fromResponse(
      { status: 409 },
      { success: false, statusCode: 409, message: "3 students are not marked", error: { code: "CONFLICT" }, missing: 3 } as never,
    );
    expect(error.code).toBe("CONFLICT");
    expect(missingFromError(error)).toBe(3);
  });

  it("is null for any other error", () => {
    expect(missingFromError(ApiError.fromResponse({ status: 409 }, { message: "Duplicate" }))).toBeNull();
    expect(missingFromError(ApiError.fromResponse({ status: 403 }, { message: "No", missing: 2 } as never))).toBeNull();
    expect(missingFromError(new Error("boom"))).toBeNull();
  });
});

describe("dates", () => {
  const bounds = { min: "2026-09-07", max: "2026-09-25" };

  it("steps school days, skipping the weekend, inside the term and up to today", () => {
    expect(stepSchoolDay("2026-09-21", -1, bounds)).toBe("2026-09-18");
    expect(stepSchoolDay("2026-09-18", 1, bounds)).toBe("2026-09-21");
    expect(stepSchoolDay("2026-09-25", 1, bounds)).toBeNull();
    expect(stepSchoolDay("2026-09-07", -1, bounds)).toBeNull();
    expect(stepSchoolDay("2026-09-25", 1, {})).toBe("2026-09-28");
  });

  it("snaps a weekend back to Friday and clamps to the term and today", () => {
    expect(clampRegisterDate("2026-09-19", bounds)).toEqual({ date: "2026-09-18", snapped: true });
    expect(clampRegisterDate("2026-09-20", bounds)).toEqual({ date: "2026-09-18", snapped: true });
    expect(clampRegisterDate("2026-09-23", bounds)).toEqual({ date: "2026-09-23", snapped: false });
    expect(clampRegisterDate("2026-10-30", bounds)).toEqual({ date: "2026-09-25", snapped: false });
    expect(clampRegisterDate("2026-08-01", bounds)).toEqual({ date: "2026-09-07", snapped: false });
    expect(clampRegisterDate("", bounds)).toBeNull();
  });

  it("heads the register with class, day and 'today'", () => {
    expect(registerHeading(makeRegisterFixture("c1"))).toBe("JSS1 A · Friday 25 September · today");
    expect(registerHeading(makeRegisterFixture("c1", "2026-09-24"))).toBe("JSS1 A · Thursday 24 September");
  });
});
