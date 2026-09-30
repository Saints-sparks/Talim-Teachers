/**
 * @jest-environment jsdom
 *
 * Attendance history (`/analytics/attendance`): its period and range logic,
 * the class totals, and the screen's class and date-range filters, tiles and
 * per-student rows against mocked services.
 */
import React from "react";
import { act, render, screen, waitFor, within } from "@/test-utils/render";
import userEvent from "@testing-library/user-event";
import { AttendanceHistoryScreen } from "@/components/attendance/AttendanceHistoryScreen";
import { classroomService } from "@/app/services/classroom/classroom.service";
import { attendanceService } from "@/app/services/attendance/attendance.service";
import { todayService } from "@/app/services/today/today.service";
import { getCurrentTerm } from "@/app/services/api.service";
import { makeMyClassesFixture } from "@/lib/fixtures/classroom.fixture";
import { makeTodayFixture } from "@/lib/fixtures/today.fixture";
import { createLimiter } from "@/hooks/attendance/useStudentAttendanceKpis";
import {
  filterRows,
  historyHref,
  historyRow,
  historyTotals,
  matchPreset,
  mondayOf,
  parseHistoryParams,
  presetRange,
  rangeProblem,
  rangeText,
  rateOf,
  rateTone,
  sortRows,
} from "@/hooks/attendance/history.logic";
import type { ClassRoster } from "@/types/classroom";
import type { StudentAttendanceKpis, StudentKpiFilter } from "@/types/attendance";

const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace }),
  usePathname: () => "/analytics/attendance",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/classroom/classroom.service", () => ({
  classroomService: { getMyClasses: jest.fn(), getRoster: jest.fn(), getRegister: jest.fn(), saveRegister: jest.fn(), getStudentRecord: jest.fn() },
}));
jest.mock("@/app/services/attendance/attendance.service", () => ({ attendanceService: { getStudentKpis: jest.fn() } }));
jest.mock("@/app/services/today/today.service", () => ({ todayService: { getToday: jest.fn() } }));
jest.mock("@/app/services/api.service", () => ({ getCurrentTerm: jest.fn() }));

const classroom = classroomService as jest.Mocked<typeof classroomService>;
const attendance = attendanceService as jest.Mocked<typeof attendanceService>;
const today = todayService as jest.Mocked<typeof todayService>;
const currentTerm = getCurrentTerm as jest.Mock;

/** Present, late, absent and leave days per student over any range. */
const DAYS: Record<string, [number, number, number, number]> = {
  a1: [18, 1, 1, 2], // 95%
  a2: [12, 2, 6, 0], // 70%
  a3: [0, 0, 0, 0], // no records
};

/**
 * A three-student roster for a class.
 *
 * @param classId - The class.
 * @returns The roster.
 */
function roster(classId: string): ClassRoster {
  const name = classId === "c2" ? "JSS2 B" : "JSS1 A";
  return {
    class: { id: classId, name, role: "class_teacher", capacity: 30, studentCount: 3 },
    stats: { attendanceRateTerm: 85, absentToday: null, registerSubmitted: false },
    courses: [],
    students: [
      { id: "a1", name: "Ada Obi", firstName: "Ada", admissionNumber: "26010001", email: null, avatarUrl: null, attendanceRateTerm: 95, guardian: null },
      { id: "a2", name: "Bayo Ade", firstName: "Bayo", admissionNumber: "26010002", email: null, avatarUrl: null, attendanceRateTerm: 70, guardian: null },
      { id: "a3", name: "Chi Eze", firstName: "Chi", admissionNumber: null, email: null, avatarUrl: null, attendanceRateTerm: null, guardian: null },
    ],
  };
}

/**
 * The KPI endpoint's answer for a student.
 *
 * @param id - The student.
 * @returns The figures.
 */
function kpis(id: string): StudentAttendanceKpis {
  const [p, l, a, e] = DAYS[id] ?? [0, 0, 0, 0];
  return {
    studentId: id,
    firstName: "F",
    lastName: "L",
    email: "",
    classInfo: { id: "c2", name: "JSS2 B" },
    attendanceRate: 0,
    totalDays: p + l + a + e,
    presentDays: p,
    lateDays: l,
    absentDays: a,
    excusedDays: e,
  };
}

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  classroom.getMyClasses.mockResolvedValue(makeMyClassesFixture());
  classroom.getRoster.mockImplementation(async (classId) => roster(classId));
  today.getToday.mockResolvedValue(makeTodayFixture()); // Friday 25 September 2026
  currentTerm.mockResolvedValue({ _id: "t1", name: "First Term", startDate: "2026-09-07T00:00:00.000Z" });
  attendance.getStudentKpis.mockImplementation(async (id: string) => kpis(id));
});

/**
 * The start and end each KPI request asked for.
 *
 * @returns One `from..to` per call.
 */
const requestedRanges = () => attendance.getStudentKpis.mock.calls.map(([, f]) => `${(f as StudentKpiFilter).startDate}..${(f as StudentKpiFilter).endDate}`);

describe("history logic", () => {
  it("builds the quick periods, ending today", () => {
    expect(mondayOf("2026-09-25")).toBe("2026-09-21");
    expect(mondayOf("2026-09-27")).toBe("2026-09-21"); // a Sunday belongs to the week before
    expect(presetRange("week", "2026-09-25")).toEqual({ from: "2026-09-21", to: "2026-09-25" });
    expect(presetRange("month", "2026-09-25")).toEqual({ from: "2026-09-01", to: "2026-09-25" });
    expect(presetRange("term", "2026-09-25", "2026-09-07T00:00:00.000Z")).toEqual({ from: "2026-09-07", to: "2026-09-25" });
    expect(presetRange("term", "2026-09-25", null)).toBeNull();
    expect(presetRange("custom", "2026-09-25")).toBeNull();
    expect(matchPreset({ from: "2026-09-01", to: "2026-09-25" }, "2026-09-25", "2026-09-07")).toBe("month");
    expect(matchPreset({ from: "2026-09-02", to: "2026-09-25" }, "2026-09-25", "2026-09-07")).toBe("custom");
  });

  it("explains a range it cannot load", () => {
    expect(rangeProblem({ from: "2026-09-10", to: "2026-09-01" }, "2026-09-25")).toBe("The start date is after the end date.");
    expect(rangeProblem({ from: "2026-09-10", to: "2026-10-01" }, "2026-09-25")).toBe("The end date is after today.");
    expect(rangeProblem({ from: "", to: "2026-09-01" }, "2026-09-25")).toBe("Choose a start date.");
    expect(rangeProblem({ from: "2026-02-30", to: "2026-03-01" }, "2026-09-25")).toBe("Choose a start date.");
    expect(rangeProblem({ from: "2026-09-01", to: "2026-09-25" }, "2026-09-25")).toBeNull();
  });

  it("writes the range the short way", () => {
    expect(rangeText({ from: "2026-09-25", to: "2026-09-25" })).toBe("25 Sep 2026");
    expect(rangeText({ from: "2026-09-01", to: "2026-09-25" })).toBe("1 – 25 Sep 2026");
    expect(rangeText({ from: "2026-09-07", to: "2026-10-02" })).toBe("7 Sep – 2 Oct 2026");
    expect(rangeText({ from: "2025-12-15", to: "2026-01-09" })).toBe("15 Dec 2025 – 9 Jan 2026");
  });

  it("counts late as attended and leaves leave out of the rate", () => {
    expect(rateOf({ present: 18, late: 1, absent: 1 })).toBe(95);
    expect(rateOf({ present: 2, late: 0, absent: 1 })).toBe(66.7);
    expect(rateOf({ present: 0, late: 0, absent: 0 })).toBeNull();
    expect([rateTone(95), rateTone(80), rateTone(60), rateTone(null)]).toEqual(["success", "warning", "danger", "muted"]);
  });

  it("totals the loaded rows and counts who is below 90%", () => {
    const rows = [historyRow({ id: "a1", name: "Ada Obi" }, kpis("a1")), historyRow({ id: "a2", name: "Bayo Ade" }, kpis("a2")), historyRow({ id: "a3", name: "Chi Eze" }, kpis("a3")), historyRow({ id: "a4", name: "Dan" })];
    expect(rows[3]).toMatchObject({ counts: null, rate: null });
    expect(historyTotals(rows)).toEqual({ present: 30, late: 3, absent: 7, onLeave: 2, rate: 82.5, below: 1, loaded: 3 });
    expect(sortRows(rows, "lowest").map((r) => r.id)).toEqual(["a2", "a1", "a3", "a4"]);
    expect(sortRows(rows, "name").map((r) => r.name)).toEqual(["Ada Obi", "Bayo Ade", "Chi Eze", "Dan"]);
    expect(filterRows([historyRow({ id: "a1", name: "Ada Obi", admissionNumber: "26010001" })], "0001")).toHaveLength(1);
    expect(filterRows([historyRow({ id: "a1", name: "Ada Obi" })], "bayo")).toHaveLength(0);
  });

  it("reads and writes the page's address", () => {
    const params = new URLSearchParams("classId=c2&from=2026-09-01&to=2026-13-01&studentId=a1");
    expect(parseHistoryParams(params)).toEqual({ classId: "c2", from: "2026-09-01", studentId: "a1" });
    expect(historyHref({ classId: "c2", from: "2026-09-01", to: "2026-09-25" })).toBe("/analytics/attendance?classId=c2&from=2026-09-01&to=2026-09-25");
    expect(historyHref({})).toBe("/analytics/attendance");
  });

  it("keeps at most the limit of requests in flight", async () => {
    const limit = createLimiter(2);
    let running = 0;
    let peak = 0;
    const job = () =>
      limit(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 5));
        running -= 1;
        return running;
      });
    await Promise.all(Array.from({ length: 7 }, job));
    expect(peak).toBe(2);
  });
});

describe("AttendanceHistoryScreen", () => {
  /**
   * Renders the screen and waits for every student's figures.
   *
   * @param initial - The page's query.
   * @returns The user-event instance.
   */
  async function renderHistory(initial = {}) {
    const user = userEvent.setup();
    render(<AttendanceHistoryScreen initial={initial} />);
    await screen.findByRole("table");
    await waitFor(() => expect(screen.queryByText(/^Loading \d+ of \d+/)).not.toBeInTheDocument());
    return user;
  }

  it("opens on the first class for this term, with the class totals and a row per student", async () => {
    await renderHistory();
    expect(screen.getByRole("heading", { level: 1, name: "Attendance history" })).toBeInTheDocument();
    expect(screen.getByLabelText("Class")).toHaveValue("c1");
    expect(screen.getByRole("heading", { level: 2, name: "JSS1 A · 7 – 25 Sep 2026" })).toBeInTheDocument();
    expect(new Set(requestedRanges())).toEqual(new Set(["2026-09-07..2026-09-25"]));
    expect(screen.getByRole("button", { name: "This term" })).toHaveAttribute("aria-pressed", "true");

    const tile = (label: string) => screen.getByText(label, { selector: "div" }).parentElement!;
    expect(tile("Attendance rate")).toHaveTextContent("83%");
    expect(tile("Present")).toHaveTextContent("30");
    expect(tile("Late")).toHaveTextContent("3");
    expect(tile("Absent")).toHaveTextContent("7");
    expect(tile("On leave")).toHaveTextContent("2");
    expect(tile("Below 90%")).toHaveTextContent("1");

    const table = screen.getByRole("table");
    const ada = within(table).getByRole("row", { name: /Ada Obi/ });
    expect(ada).toHaveTextContent("95%");
    expect(within(ada).getAllByRole("cell").map((c) => c.textContent)).toEqual(["95%", "18", "1", "1", "2"]);
    expect(within(table).getByRole("row", { name: /Chi Eze/ })).toHaveTextContent("No records");
    expect(within(ada).getByRole("link", { name: "Ada Obi" })).toHaveAttribute("href", "/students/a1");
  });

  it("switches to this week, keeps the dates in the address, and reloads for them", async () => {
    const user = await renderHistory();
    attendance.getStudentKpis.mockClear();
    await user.click(screen.getByRole("button", { name: "This week" }));
    await waitFor(() => expect(new Set(requestedRanges())).toEqual(new Set(["2026-09-21..2026-09-25"])));
    expect(screen.getByLabelText("From")).toHaveValue("2026-09-21");
    expect(screen.getByLabelText("To")).toHaveValue("2026-09-25");
    await waitFor(() => expect(replace).toHaveBeenLastCalledWith("/analytics/attendance?classId=c1&from=2026-09-21&to=2026-09-25", { scroll: false }));
    expect(screen.getByRole("button", { name: "This week" })).toHaveAttribute("aria-pressed", "true");
  });

  it("takes any From and To, and flags a start after the end without loading it", async () => {
    const user = await renderHistory({ from: "2026-09-14", to: "2026-09-18" });
    expect(new Set(requestedRanges())).toEqual(new Set(["2026-09-14..2026-09-18"]));
    expect(screen.getByRole("heading", { level: 2, name: "JSS1 A · 14 – 18 Sep 2026" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Period" }).querySelector('[aria-pressed="true"]')).toBeNull();

    attendance.getStudentKpis.mockClear();
    const from = screen.getByLabelText("From");
    await act(async () => {
      await user.clear(from);
      await user.type(from, "2026-09-20");
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("The start date is after the end date.");
    expect(from).toHaveAttribute("aria-invalid", "true");
    expect(from).toHaveAccessibleDescription("The start date is after the end date.");
    expect(screen.getByRole("heading", { name: "Check the dates" })).toBeInTheDocument();
    expect(attendance.getStudentKpis).not.toHaveBeenCalled();
  });

  it("changes class", async () => {
    const user = await renderHistory();
    await user.selectOptions(screen.getByLabelText("Class"), "c2");
    expect(await screen.findByRole("heading", { level: 2, name: /^JSS2 B · / })).toBeInTheDocument();
    expect(classroom.getRoster).toHaveBeenLastCalledWith("c2");
    await waitFor(() => expect(replace).toHaveBeenLastCalledWith("/analytics/attendance?classId=c2", { scroll: false }));
  });

  it("sorts lowest first and searches", async () => {
    const user = await renderHistory();
    const names = () => within(screen.getByRole("table")).getAllByRole("link").map((l) => l.textContent);
    expect(names()).toEqual(["Ada Obi", "Bayo Ade", "Chi Eze"]);
    await user.selectOptions(screen.getByLabelText("Order"), "lowest");
    expect(names()).toEqual(["Bayo Ade", "Ada Obi", "Chi Eze"]);
    await user.type(screen.getByRole("searchbox", { name: /Search students/ }), "26010002");
    expect(names()).toEqual(["Bayo Ade"]);
  });

  it("highlights the student a record linked to", async () => {
    await renderHistory({ classId: "c1", studentId: "a2" });
    const row = within(screen.getByRole("table")).getByRole("row", { name: /Bayo Ade/ });
    expect(row).toHaveAttribute("aria-current", "true");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(replace).toHaveBeenLastCalledWith("/analytics/attendance?classId=c1&studentId=a2", { scroll: false });
  });

  it("finds the class of a link that names only a student", async () => {
    await renderHistory({ studentId: "a1" });
    expect(attendance.getStudentKpis).toHaveBeenCalledWith("a1", {});
    expect(screen.getByLabelText("Class")).toHaveValue("c2");
    expect(classroom.getRoster).toHaveBeenCalledWith("c2");
    expect(classroom.getRoster).not.toHaveBeenCalledWith("c1");
  });

  it("says which students could not be loaded and retries them", async () => {
    attendance.getStudentKpis.mockImplementation(async (id: string) => {
      if (id === "a2") throw new Error("offline");
      return kpis(id);
    });
    const user = await renderHistory();
    expect(await screen.findByText("We could not load the attendance of 1 student.")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByRole("row", { name: /Bayo Ade/ })).toHaveTextContent("Not loaded");

    attendance.getStudentKpis.mockImplementation(async (id: string) => kpis(id));
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByText(/could not load the attendance/)).not.toBeInTheDocument());
    expect(within(screen.getByRole("table")).getByRole("row", { name: /Bayo Ade/ })).toHaveTextContent("70%");
  });

  it("links back to the class's register", async () => {
    await renderHistory();
    expect(screen.getByRole("link", { name: "Today's register" })).toHaveAttribute("href", "/attendance?classId=c1");
  });
});
