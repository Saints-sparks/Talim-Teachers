import { ApiError } from "@/lib/apiError";
import {
  applyMarkToStatus,
  attendanceBand,
  buildAttendancePayload,
  canMarkAttendance,
  classifySubmitFailure,
  computeAttendanceStats,
  filterRoster,
  initialsOf,
  localDayKey,
  orderForMarking,
  percentOf,
  pruneDrafts,
} from "@/app/services/attendance/attendance.helpers";
import type { ClassAttendanceStatus, StudentAttendanceStatus } from "@/types/attendance";

const student = (id: string, over: Partial<StudentAttendanceStatus> = {}): StudentAttendanceStatus => ({
  studentId: id,
  firstName: `First${id}`,
  lastName: `Last${id}`,
  email: `${id}@school.test`,
  attendanceMarked: false,
  ...over,
});

const NOW = new Date("2026-09-18T08:30:00.000Z");
const IDS = { studentId: "64aef4d2c7d2b7a91d12eabc", classId: "64aef4d2c7d2b7a91d12efgh", termId: "64aef4d2c7d2b7a91d12mnop" };

describe("canMarkAttendance", () => {
  it("admits only the role the server accepts on POST /attendance", () => {
    expect(canMarkAttendance("teacher")).toBe(true);
    expect(canMarkAttendance("school_sub_admin")).toBe(false);
    expect(canMarkAttendance("school_admin")).toBe(false);
    expect(canMarkAttendance("parent")).toBe(false);
    expect(canMarkAttendance(undefined)).toBe(false);
    expect(canMarkAttendance(null)).toBe(false);
  });
});

describe("buildAttendancePayload", () => {
  it("sends exactly the CreateAttendanceDto fields for a present student", () => {
    const result = buildAttendancePayload({ ...IDS, status: "Present", now: NOW });
    expect(result).toEqual({
      ok: true,
      payload: {
        studentId: IDS.studentId,
        classId: IDS.classId,
        date: "2026-09-18T08:30:00.000Z",
        status: "Present",
        termId: IDS.termId,
      },
    });
    // forbidNonWhitelisted: no absenceReason key at all, not even undefined.
    expect(Object.keys((result as { payload: object }).payload)).not.toContain("absenceReason");
  });

  it("ignores a stale reason typed before switching back to Present", () => {
    const result = buildAttendancePayload({ ...IDS, status: "Present", absenceReason: "was sick", now: NOW });
    expect(result.ok && "absenceReason" in result.payload).toBe(false);
  });

  it("requires a non-blank reason for Absent, and trims it", () => {
    expect(buildAttendancePayload({ ...IDS, status: "Absent", now: NOW })).toMatchObject({ ok: false, problem: "no-reason" });
    expect(buildAttendancePayload({ ...IDS, status: "Absent", absenceReason: "   ", now: NOW })).toMatchObject({
      ok: false,
      problem: "no-reason",
    });
    const ok = buildAttendancePayload({ ...IDS, status: "Absent", absenceReason: "  Sick leave  ", now: NOW });
    expect(ok).toMatchObject({ ok: true, payload: { status: "Absent", absenceReason: "Sick leave" } });
  });

  it("refuses to build without a status, term, class or student", () => {
    expect(buildAttendancePayload({ ...IDS, status: undefined })).toMatchObject({ ok: false, problem: "no-status" });
    expect(buildAttendancePayload({ ...IDS, termId: undefined, status: "Present" })).toMatchObject({ ok: false, problem: "no-term" });
    expect(buildAttendancePayload({ ...IDS, classId: "", status: "Present" })).toMatchObject({ ok: false, problem: "no-class" });
    expect(buildAttendancePayload({ ...IDS, studentId: "", status: "Present" })).toMatchObject({ ok: false, problem: "no-student" });
  });
});

describe("computeAttendanceStats", () => {
  it("counts each status and the students still pending", () => {
    const stats = computeAttendanceStats([
      student("1", { attendanceMarked: true, attendanceStatus: "Present" }),
      student("2", { attendanceMarked: true, attendanceStatus: "Present" }),
      student("3", { attendanceMarked: true, attendanceStatus: "Absent" }),
      student("4", { attendanceMarked: true, attendanceStatus: "Late" }),
      student("5", { attendanceMarked: true, attendanceStatus: "Excused" }),
      student("6"),
    ]);
    expect(stats).toEqual({ total: 6, present: 2, absent: 1, late: 1, excused: 1, marked: 5, pending: 1 });
  });

  it("reports zeroes for an empty class, never NaN", () => {
    expect(computeAttendanceStats([])).toEqual({ total: 0, present: 0, absent: 0, late: 0, excused: 0, marked: 0, pending: 0 });
  });
});

describe("percentOf", () => {
  it("rounds, clamps and never divides by zero", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(5, 0)).toBe(0);
    expect(percentOf(9, 3)).toBe(100);
    expect(percentOf(-1, 3)).toBe(0);
  });
});

describe("attendanceBand", () => {
  it("bands at 90 and 75", () => {
    expect(attendanceBand(100)).toBe("excellent");
    expect(attendanceBand(90)).toBe("excellent");
    expect(attendanceBand(89.9)).toBe("good");
    expect(attendanceBand(75)).toBe("good");
    expect(attendanceBand(74.9)).toBe("poor");
    expect(attendanceBand(undefined)).toBe("poor");
  });
});

describe("applyMarkToStatus", () => {
  const base: ClassAttendanceStatus = {
    classId: "c1",
    className: "JSS 1A",
    date: "2026-09-18T00:00:00.000Z",
    totalStudents: 3,
    attendanceMarked: 1,
    attendanceNotMarked: 2,
    presentCount: 1,
    absentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    students: [student("1", { attendanceMarked: true, attendanceStatus: "Present" }), student("2"), student("3")],
  };

  it("records the mark and re-derives every counter", () => {
    const next = applyMarkToStatus(base, "2", { status: "Absent", absenceReason: "Sick", recordedAt: "2026-09-18T09:00:00.000Z" });
    expect(next.students[1]).toMatchObject({ attendanceMarked: true, attendanceStatus: "Absent", absenceReason: "Sick" });
    expect(next).toMatchObject({ attendanceMarked: 2, attendanceNotMarked: 1, presentCount: 1, absentCount: 1 });
  });

  it("does not mutate the cached status", () => {
    const snapshot = JSON.stringify(base);
    applyMarkToStatus(base, "3", { status: "Present", recordedAt: "2026-09-18T09:00:00.000Z" });
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it("leaves the status alone for a student who is not on the roster", () => {
    expect(applyMarkToStatus(base, "nope", { status: "Present", recordedAt: "x" })).toBe(base);
  });
});

describe("roster helpers", () => {
  const roster = [
    student("1", { firstName: "Ada", lastName: "Bello", attendanceMarked: true, attendanceStatus: "Present" }),
    student("2", { firstName: "Chidi", lastName: "Okafor" }),
    student("3", { firstName: "Bola", lastName: "Adeyemi" }),
  ];

  it("puts unmarked students first and keeps each group's order", () => {
    expect(orderForMarking(roster).map((s) => s.studentId)).toEqual(["2", "3", "1"]);
    expect(roster.map((s) => s.studentId)).toEqual(["1", "2", "3"]);
  });

  it("filters by full name, ignoring case and padding", () => {
    expect(filterRoster(roster, "  ada ").map((s) => s.studentId)).toEqual(["1"]);
    expect(filterRoster(roster, "ok").map((s) => s.studentId)).toEqual(["2"]);
    expect(filterRoster(roster, "")).toHaveLength(3);
  });

  it("builds initials without crashing on blank names", () => {
    expect(initialsOf("ada", "bello")).toBe("AB");
    expect(initialsOf("", "")).toBe("?");
    expect(initialsOf(undefined, "Bello")).toBe("B");
  });
});

describe("pruneDrafts", () => {
  it("drops drafts for students the server already has a mark for", () => {
    const drafts = { "1": { status: "Present" as const }, "2": { status: "Absent" as const, reason: "Sick" } };
    const students = [student("1", { attendanceMarked: true, attendanceStatus: "Present" }), student("2")];
    expect(pruneDrafts(drafts, students)).toEqual({ "2": { status: "Absent", reason: "Sick" } });
  });

  it("returns the same object when nothing changed, so React does not re-render", () => {
    const drafts = { "2": { status: "Present" as const } };
    expect(pruneDrafts(drafts, [student("2")])).toBe(drafts);
  });
});

describe("classifySubmitFailure", () => {
  it("keeps the mark and says so when offline, without re-reading the roster", () => {
    const failure = classifySubmitFailure(ApiError.offline());
    expect(failure).toMatchObject({ kind: "offline", retryable: true, reconcile: false });
    expect(failure.message).toMatch(/saved here/i);
  });

  it("re-reads the roster after a timeout, because the server may have stored the mark", () => {
    expect(classifySubmitFailure(ApiError.timeout())).toMatchObject({ retryable: true, reconcile: true });
    expect(classifySubmitFailure(ApiError.unreachable())).toMatchObject({ retryable: true, reconcile: true });
  });

  it("treats a 400 as possibly 'already recorded' and asks for a re-read", () => {
    const err = ApiError.fromResponse({ status: 400 }, { error: { code: "BAD_REQUEST", message: "Attendance already recorded" } });
    expect(classifySubmitFailure(err)).toMatchObject({ kind: "rejected", reconcile: true });
  });

  it("does not offer a retry for a 403", () => {
    const err = ApiError.fromResponse({ status: 403 }, { error: { code: "FORBIDDEN", message: "Only teachers can mark attendance" } });
    expect(classifySubmitFailure(err)).toMatchObject({ kind: "forbidden", retryable: false, reconcile: false });
  });

  it("keys on the code, not the message text", () => {
    const err = ApiError.fromResponse({ status: 500 }, { error: { code: "INTERNAL_ERROR", message: "already recorded" } });
    expect(classifySubmitFailure(err).kind).toBe("server");
  });

  it("handles a thrown value that is not an ApiError", () => {
    expect(classifySubmitFailure(new Error("boom"))).toMatchObject({ retryable: true, reconcile: true });
  });
});

describe("localDayKey", () => {
  it("zero-pads month and day from the local calendar", () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDayKey(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });
});
