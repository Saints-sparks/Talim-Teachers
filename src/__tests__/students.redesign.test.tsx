/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@/test-utils/render";
import { StudentsScreen } from "@/components/students/StudentsScreen";
import { StudentRecordScreen } from "@/components/students/StudentRecordScreen";
import { classroomService } from "@/app/services/classroom/classroom.service";
import { startDirectChat } from "@/app/services/chat.service";
import { downloadCsv } from "@/app/services/grading-workspace/grade-csv";
import { ApiError } from "@/lib/apiError";
import {
  makeEmptyRosterFixture,
  makeMyClassesFixture,
  makeRosterFixture,
  makeStudentRecordFixture,
  resetClassroomFixtureStore,
} from "@/lib/fixtures/classroom.fixture";
import { courseSummary, filterRoster, formatDob, guardianDetails, ordinal, rosterCsv, rosterTiles, scoreBar, telHref } from "@/hooks/students/students.logic";
import type { StudentCourseScores } from "@/types/classroom";

const push = jest.fn();
const replace = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }), usePathname: () => "/students" }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/classroom/classroom.service", () => ({
  classroomService: { getMyClasses: jest.fn(), getRegister: jest.fn(), saveRegister: jest.fn(), getRoster: jest.fn(), getStudentRecord: jest.fn() },
}));
jest.mock("@/app/services/chat.service", () => ({ startDirectChat: jest.fn() }));
jest.mock("@/app/services/grading-workspace/grade-csv", () => ({
  ...jest.requireActual("@/app/services/grading-workspace/grade-csv"),
  downloadCsv: jest.fn(),
}));

const service = classroomService as jest.Mocked<typeof classroomService>;

beforeEach(() => {
  jest.clearAllMocks();
  resetClassroomFixtureStore();
  service.getMyClasses.mockResolvedValue(makeMyClassesFixture());
  service.getRoster.mockImplementation(async (id) => makeRosterFixture(id));
  service.getStudentRecord.mockImplementation(async (id) => {
    const record = makeStudentRecordFixture(id);
    if (!record) throw ApiError.fromResponse({ status: 404 }, { message: "Student not found" });
    return record;
  });
});

describe("students logic", () => {
  it("builds the class-list CSV with the design's columns", () => {
    const { filename, csv } = rosterCsv(makeRosterFixture("c1"));
    expect(filename).toBe("jss1-a-class-list.csv");
    const [head, first] = csv.split("\r\n");
    expect(head).toBe("Name,Admission number,Email,Class,Attendance rate,Guardian,Relationship,Guardian phone,Guardian email");
    expect(first).toBe("Aisha Bello,26010007,aisha.bello@easysparks.edu.ng,JSS1 A,100%,Mrs. Hauwa Bello,Mother,+234 816 553 0198,hauwa.bello@gmail.com");
    const quoted = rosterCsv({ ...makeRosterFixture("c1"), students: [{ ...makeRosterFixture("c1").students[0], name: 'Bello, "Aisha"' }] }).csv;
    expect(quoted.split("\r\n")[1].startsWith('"Bello, ""Aisha""",')).toBe(true);
  });

  it("fills the four tiles, with 'Register pending' until today's register is in", () => {
    expect(rosterTiles(makeRosterFixture("c1")).map((t) => [t.label, t.value])).toEqual([
      ["Students", "12 of 30"],
      ["Attendance this term", "94%"],
      ["Absent today", "Register pending"],
      ["You teach here", "Mathematics"],
    ]);
    expect(rosterTiles(makeRosterFixture("c2")).map((t) => t.value)).toEqual(["10 of 30", "96%", "1", "Mathematics · Further Mathematics"]);
    expect(rosterTiles(makeEmptyRosterFixture())[1].value).toBe("No records yet");
  });

  it("searches name, admission number, email and guardian", () => {
    const students = makeRosterFixture("c1").students;
    expect(filterRoster(students, "obi").map((s) => s.name)).toEqual(["Chiamaka Obi"]);
    expect(filterRoster(students, "26010012").map((s) => s.name)).toEqual(["Samuel Ogun"]);
    expect(filterRoster(students, "Hauwa").map((s) => s.name)).toEqual(["Aisha Bello"]);
    expect(filterRoster(students, "  ")).toHaveLength(12);
  });

  it("draws score bars against the maximum with the class-average marker", () => {
    const bar = scoreBar({ id: "a1", name: "1st CA", maxScore: 20, score: 16, classAverage: 14.4, status: "draft" }, "Musa");
    expect(bar).toMatchObject({ fillPercent: 80, averagePercent: 72, score: "16", average: "14.4", max: "out of 20", tip: "Musa 16 of 20 · class average 14.4" });
    const empty = scoreBar({ id: "a2", name: "2nd CA", maxScore: 20, score: null, classAverage: null, status: "not_entered" }, "Musa");
    expect(empty).toMatchObject({ fillPercent: 0, averagePercent: null, score: "—", average: "—", tip: "Not entered yet" });
    expect(scoreBar({ id: "x", name: "x", maxScore: 20, score: 25, classAverage: null, status: "draft" }, "M").fillPercent).toBe(100);
    expect(scoreBar({ id: "x", name: "x", maxScore: null, score: 5, classAverage: 4, status: "draft" }, "M")).toMatchObject({ fillPercent: 0, averagePercent: null, max: "No maximum set" });
  });

  it("shows total always, and grade and position only once complete", () => {
    const partial = makeStudentRecordFixture("s1")!.scores[0];
    expect(courseSummary(partial)).toEqual({
      total: "16",
      grade: "—",
      position: "—",
      note: "1 of 3 assessments entered. Grade and position appear once all three are in.",
    });
    const complete = makeStudentRecordFixture("s13")!.scores.find((c) => c.course.id === "k2")!;
    expect(complete.complete).toBe(true);
    const summary = courseSummary(complete);
    expect(summary.grade).toMatch(/^[A-F]$/);
    expect(summary.position).toMatch(/^\d+(st|nd|rd|th) of 10$/);
    expect(summary.note).toBe("Total out of 100 across all three assessments.");
    const none: StudentCourseScores = { ...partial, assessments: [], total: null, complete: false };
    expect(courseSummary(none).note).toBe("No assessments have been set for this course yet.");
  });

  it("hides the guardian's occupation and address rows while the API answers null", () => {
    const base = { userId: "u1", name: "Kemi Femi", relationship: "Mother", email: null, phone: null, occupation: null, address: null };
    expect(guardianDetails(base).map((r) => r.label)).toEqual(["Full name", "Relationship", "Email", "Phone"]);
    const full = guardianDetails({ ...base, occupation: "Nurse", address: "7 Allen Avenue" }).map((r) => r.label);
    expect(full).toEqual(["Full name", "Relationship", "Occupation", "Email", "Phone", "Home address"]);
  });

  it("formats ordinals, dates of birth and phone links", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st"]);
    expect(formatDob("2013-03-01")).toBe("1 March 2013");
    expect(formatDob(null)).toBe("Not recorded");
    expect(telHref("+234 803 112 4410")).toBe("tel:+2348031124410");
    expect(telHref(null)).toBeNull();
  });
});

describe("Students list", () => {
  it("opens the first class with its role, tiles, and one row per student linking to the record", async () => {
    render(<StudentsScreen />);
    expect(await screen.findByText("12 of 30")).toBeInTheDocument();
    const tabs = screen.getByRole("group", { name: "Class" });
    expect(within(tabs).getByRole("button", { name: /JSS1 A\s*Class teacher/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(tabs).getByRole("button", { name: /JSS2 B\s*Subject teacher/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Register pending")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(13);
    expect(within(table).getByRole("link", { name: "Musa Adele" })).toHaveAttribute("href", "/students/s1");
    expect(within(table).getByText("Mr. Ibrahim Adele")).toBeInTheDocument();
    expect(within(table).getAllByText("Father").length).toBeGreaterThan(0);
    fireEvent.click(within(table).getByText("26010003"));
    expect(push).toHaveBeenCalledWith("/students/s3");
    expect(replace).toHaveBeenCalledWith("/students?classId=c1", { scroll: false });
  });

  it("switches tab with ?classId= and by clicking, and searches", async () => {
    render(<StudentsScreen initialClassId="c2" />);
    expect(await screen.findByText("Mathematics · Further Mathematics")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Search students/), { target: { value: "zzz" } });
    expect(screen.getByText("No students match that search.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /JSS1 A/ }));
    expect(await screen.findByText("12 of 30")).toBeInTheDocument();
    expect((screen.getByLabelText(/Search students/) as HTMLInputElement).value).toBe("");
  });

  it("exports the class list as CSV", async () => {
    render(<StudentsScreen />);
    await screen.findByText("12 of 30");
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(downloadCsv).toHaveBeenCalledWith("jss1-a-class-list.csv", expect.stringContaining("Name,Admission number,Email,Class,Attendance rate"));
  });

  it("says so for an empty class and disables Export", async () => {
    service.getRoster.mockResolvedValue(makeEmptyRosterFixture());
    render(<StudentsScreen />);
    expect(await screen.findByText(/There are no students in JSS1 A yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });

  it("says a class the teacher does not teach is not theirs, without a pointless retry", async () => {
    service.getRoster.mockRejectedValue(ApiError.fromResponse({ status: 403 }, { message: "You do not teach this class" }));
    render(<StudentsScreen initialClassId="other-class" />);
    expect(await screen.findByRole("heading", { name: "Not one of your classes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });

  it("says so when the teacher has no classes", async () => {
    service.getMyClasses.mockResolvedValue([]);
    render(<StudentsScreen />);
    expect(await screen.findByRole("heading", { name: "No classes yet" })).toBeInTheDocument();
  });
});

describe("Student record", () => {
  it("shows details, guardian, attendance and scores", async () => {
    render(<StudentRecordScreen studentId="s1" />);
    expect(await screen.findByRole("heading", { level: 1, name: "Musa Adele" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Students · JSS1 A/ })).toHaveAttribute("href", "/students?classId=c1");
    expect(screen.getByText("Student · JSS1 A · Easy Sparks Education Center")).toBeInTheDocument();
    expect(screen.getByText("MUSA ADELE")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:+2348031124410");
    const attendance = screen.getByRole("region", { name: "Attendance this term" });
    expect(within(attendance).getByText("100%")).toBeInTheDocument();
    expect(within(attendance).getByText("14 school days so far. Approved leave does not count against the rate.")).toBeInTheDocument();
    const maths = screen.getByRole("region", { name: "Mathematics · JSS1 A" });
    expect(within(maths).getByText("Draft")).toBeInTheDocument();
    expect(within(maths).getAllByText("Not entered")).toHaveLength(2);
    expect(within(maths).getByRole("img", { name: /Musa 16 of 20 · class average/ })).toBeInTheDocument();
    expect(within(maths).getAllByTestId("score-average")).toHaveLength(1);
    expect(within(maths).getByText("1 of 3 assessments entered. Grade and position appear once all three are in.")).toBeInTheDocument();
  });

  it("messages the guardian through a direct chat and opens it", async () => {
    (startDirectChat as jest.Mock).mockResolvedValue("room-42");
    render(<StudentRecordScreen studentId="s1" />);
    await screen.findByRole("heading", { level: 1, name: "Musa Adele" });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Message" }));
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/messages?room=room-42"));
    expect(startDirectChat).toHaveBeenCalledWith("u-guardian-s1", "68c0a1b2c3d4e5f600000001");
  });

  it("disables Message when the guardian has no account, and explains a missing guardian", async () => {
    const { unmount } = render(<StudentRecordScreen studentId="s12" />);
    await screen.findByRole("heading", { level: 1, name: "Samuel Ogun" });
    expect(screen.getByRole("button", { name: "Message" })).toBeDisabled();
    unmount();
    render(<StudentRecordScreen studentId="s22" />);
    await screen.findByRole("heading", { level: 1, name: "Victor Ade" });
    expect(screen.getByText("No guardian is on record for Victor. Ask the school office to add one.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Message" })).not.toBeInTheDocument();
  });

  it("shows grade and position once every assessment is in", async () => {
    render(<StudentRecordScreen studentId="s13" />);
    const maths = await screen.findByRole("region", { name: "Mathematics · JSS2 B" });
    expect(within(maths).getAllByText("Published")).toHaveLength(2);
    expect(within(maths).getByText(/^\d+(st|nd|rd|th) of 10$/)).toBeInTheDocument();
    expect(within(maths).getByText("Total out of 100 across all three assessments.")).toBeInTheDocument();
  });

  it("tells a 404 from a 403", async () => {
    const { unmount } = render(<StudentRecordScreen studentId="nobody" />);
    expect(await screen.findByRole("heading", { name: "Student not found" })).toBeInTheDocument();
    unmount();
    service.getStudentRecord.mockRejectedValue(ApiError.fromResponse({ status: 403 }, { message: "Forbidden" }));
    render(<StudentRecordScreen studentId="s5" />);
    expect(await screen.findByRole("heading", { name: "Not one of your students" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Students" })).toHaveAttribute("href", "/students");
  });
});
