/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@/test-utils/render";
import { AttendanceScreen } from "@/components/attendance/AttendanceScreen";
import { classroomService } from "@/app/services/classroom/classroom.service";
import { todayService } from "@/app/services/today/today.service";
import { toast } from "@/components/CustomToast";
import { ApiError } from "@/lib/apiError";
import {
  makeMyClassesFixture,
  makeRegisterFixture,
  resetClassroomFixtureStore,
  saveRegisterFixture,
} from "@/lib/fixtures/classroom.fixture";
import { makeTodayFixture } from "@/lib/fixtures/today.fixture";
import { DRAFT_DEBOUNCE_MS } from "@/hooks/attendance/useRegister";

const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => "/attendance",
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/classroom/classroom.service", () => ({
  classroomService: { getMyClasses: jest.fn(), getRegister: jest.fn(), saveRegister: jest.fn(), getRoster: jest.fn(), getStudentRecord: jest.fn() },
}));
jest.mock("@/app/services/today/today.service", () => ({
  todayService: { getToday: jest.fn(), getMyWeek: jest.fn(), setTaught: jest.fn(), completeTour: jest.fn() },
}));

const service = classroomService as jest.Mocked<typeof classroomService>;
const today = todayService as jest.Mocked<typeof todayService>;
const toastMock = toast as unknown as { success: jest.Mock; error: jest.Mock; info: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  resetClassroomFixtureStore();
  service.getMyClasses.mockResolvedValue(makeMyClassesFixture());
  service.getRegister.mockImplementation(async (classId, date) => makeRegisterFixture(classId, date));
  service.saveRegister.mockImplementation(async (classId, date, body) => saveRegisterFixture(classId, date, body));
  today.getToday.mockResolvedValue(makeTodayFixture());
});

/**
 * Renders the screen and waits for JSS1 A's register.
 *
 * @param props - Screen props.
 * @returns Nothing.
 */
async function open(props: React.ComponentProps<typeof AttendanceScreen> = {}) {
  render(<AttendanceScreen {...props} />);
  await screen.findByRole("heading", { name: /^JSS[12] [AB] · / });
}

describe("Attendance, JSS1 A this morning", () => {
  it("labels the class picker by role and opens the first class", async () => {
    await open();
    const picker = screen.getByLabelText("Class") as HTMLSelectElement;
    expect(Array.from(picker.options).map((o) => o.textContent)).toEqual(["JSS1 A · class teacher", "JSS2 B · subject teacher"]);
    expect(picker.value).toBe("c1");
    expect(screen.getByRole("heading", { name: "JSS1 A · Friday 25 September · today" })).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/attendance?classId=c1", { scroll: false });
  });

  it("shows the five counts, one row per student and Zainab locked on leave", async () => {
    await open();
    const stats = document.querySelector('[data-guide="attendance-stats"]') as HTMLElement;
    expect(within(stats).getByText("Not marked").nextSibling).toHaveTextContent("11");
    expect(within(stats).getByText("On leave").nextSibling).toHaveTextContent("1");
    expect(screen.getAllByRole("radiogroup")).toHaveLength(11);
    const zainab = document.querySelector('[data-student="s9"]') as HTMLElement;
    expect(within(zainab).queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(within(zainab).getByText("Approved leave")).toBeInTheDocument();
    expect(within(zainab).getByText("Leave approved by the school office · requested by Mr. Aliyu Yusuf")).toBeInTheDocument();
    expect(screen.getByText("0 of 11 marked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit register" })).toBeDisabled();
  });

  it("marks with the keyboard: arrows move and select within the radiogroup", async () => {
    await open();
    const group = screen.getByRole("radiogroup", { name: "Attendance for Musa Adele" });
    const [present, late, absent] = within(group).getAllByRole("radio");
    expect(present).toHaveAttribute("tabindex", "0");
    expect(late).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(present, { key: "ArrowRight" });
    expect(late).toHaveAttribute("aria-checked", "true");
    expect(late).toHaveFocus();
    fireEvent.keyDown(late, { key: "ArrowLeft" });
    expect(present).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(present, { key: "End" });
    expect(absent).toHaveAttribute("aria-checked", "true");
  });

  it("asks an absent student's reason and an optional note", async () => {
    await open();
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Attendance for Musa Adele" })).getByRole("radio", { name: "Absent" }));
    const reason = screen.getByLabelText("Why is Musa absent?") as HTMLSelectElement;
    expect(Array.from(reason.options).map((o) => o.value)).toEqual(["", "Sick", "Medical appointment", "Family matter", "Travel", "No reason given"]);
    fireEvent.change(reason, { target: { value: "Sick" } });
    expect(reason.value).toBe("Sick");
    expect(screen.getByLabelText("Note for the school office about Musa (optional)")).toBeInTheDocument();
  });

  it("filters by name or admission number", async () => {
    await open();
    const search = screen.getByLabelText("Search the register by name or admission number");
    fireEvent.change(search, { target: { value: "26010003" } });
    expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
    expect(screen.getByText("Chiamaka Obi")).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "nobody" } });
    expect(screen.getByText("No students match that search.")).toBeInTheDocument();
  });

  it("saves a draft after the last change, then submits and tells the teacher how many parents were notified", async () => {
    jest.useFakeTimers();
    try {
      await open();
      fireEvent.click(within(screen.getByRole("radiogroup", { name: "Attendance for Musa Adele" })).getByRole("radio", { name: "Absent" }));
      fireEvent.click(within(screen.getByRole("radiogroup", { name: "Attendance for Jaye Femi" })).getByRole("radio", { name: "Late" }));
      expect(service.saveRegister).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(DRAFT_DEBOUNCE_MS + 10);
      });
      await waitFor(() => expect(screen.getByText("Draft saved")).toBeInTheDocument());
      expect(service.saveRegister).toHaveBeenCalledTimes(1);
      const draftBody = service.saveRegister.mock.calls[0][2];
      expect(draftBody.submit).toBe(false);
      expect(draftBody.marks).toEqual(
        expect.arrayContaining([
          { studentId: "s1", status: "absent" },
          { studentId: "s2", status: "late" },
        ]),
      );

      fireEvent.click(screen.getByRole("button", { name: "Mark the rest present" }));
      expect(screen.getByText("11 of 11 marked")).toBeInTheDocument();
      expect(screen.getByText("Ready to submit. 1 absent parent will be notified.")).toBeInTheDocument();
      const submit = screen.getByRole("button", { name: "Submit register" });
      expect(submit).toBeEnabled();
      await act(async () => {
        fireEvent.click(submit);
      });
      await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Register for JSS1 A submitted. 1 absent parent has been notified."));
      const submitBody = service.saveRegister.mock.calls.at(-1)![2];
      expect(submitBody.submit).toBe(true);
      expect(submitBody.marks).toHaveLength(11);
      expect(await screen.findByRole("button", { name: "Edit register" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Submit register/ })).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("reopens a submitted register with Edit register, resubmits, and Cancel discards", async () => {
    saveRegisterFixture("c1", undefined, {
      submit: true,
      marks: makeRegisterFixture("c1").students.filter((s) => s.id !== "s9").map((s) => ({ studentId: s.id, status: s.id === "s1" ? "absent" : "present" })),
    });
    await open();
    expect(screen.getByText(/^Submitted at .*Parents of absent students were notified/)).toBeInTheDocument();
    expect(screen.queryAllByRole("radiogroup")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Edit register" }));
    expect(screen.getByText("You are editing a submitted register. Resubmit to save your changes.")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Attendance for Jaye Femi" })).getByRole("radio", { name: "Absent" }));
    expect(screen.getByText("Ready to submit. 1 absent parent will be notified.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryAllByRole("radiogroup")).toHaveLength(0);
    expect(service.saveRegister).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Edit register" }));
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Attendance for Jaye Femi" })).getByRole("radio", { name: "Absent" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Resubmit register" }));
    });
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Register for JSS1 A submitted. 1 absent parent has been notified."));
  });

  it("handles a 409 with `missing` by saying how many are still unmarked and reloading", async () => {
    service.saveRegister.mockRejectedValueOnce(
      ApiError.fromResponse({ status: 409 }, { success: false, statusCode: 409, message: "Not everyone is marked", error: { code: "CONFLICT" }, missing: 2 } as never),
    );
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Mark the rest present" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Submit register" }));
    });
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("2 students still need a mark before you can submit."));
    await waitFor(() => expect(service.getRegister.mock.calls.length).toBeGreaterThan(1));
  });
});

describe("Attendance, other states", () => {
  it("is view only on a class the teacher only teaches, with who submitted it", async () => {
    await open({ initialClassId: "c2" });
    expect(screen.getByText("View only. Only the class teacher can take this register. Submitted at 8:44am by Bola Ajayi.")).toBeInTheDocument();
    expect(screen.queryAllByRole("radiogroup")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /Submit register/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark the rest present" })).not.toBeInTheDocument();
    const ibrahim = document.querySelector('[data-student="s16"]') as HTMLElement;
    expect(within(ibrahim).getByText("Absent")).toBeInTheDocument();
    expect(within(ibrahim).getByText("Reason: Sick")).toBeInTheDocument();
  });

  it("shows a past day read-only, steps back and forward, and goes back to today", async () => {
    await open({ initialClassId: "c1", initialDate: "2026-09-21" });
    expect(screen.getByText("Past registers are read-only. Ask the school office if a record needs correcting.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous school day" }));
    expect(await screen.findByRole("heading", { name: "JSS1 A · Friday 18 September" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next school day" }));
    expect(await screen.findByRole("heading", { name: "JSS1 A · Monday 21 September" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to today" }));
    expect(await screen.findByRole("heading", { name: "JSS1 A · Friday 25 September · today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next school day" })).toBeDisabled();
  });

  it("snaps a weekend date back to Friday with a toast", async () => {
    await open({ initialClassId: "c1", initialDate: "2026-09-22" });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-09-20" } });
    expect(toastMock.info).toHaveBeenCalledWith("There is no register at weekends. Showing Friday instead.");
    expect(await screen.findByRole("heading", { name: "JSS1 A · Friday 18 September" })).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveAttribute("min", "2026-09-07");
    expect(screen.getByLabelText("Date")).toHaveAttribute("max", "2026-09-25");
  });

  it("explains a holiday", async () => {
    service.getRegister.mockImplementation(async (classId, date) => makeRegisterFixture(classId, date, { holiday: "Founders' Day" }));
    await open();
    expect(screen.getByText("Founders' Day: the school is closed, so there is no register today.")).toBeInTheDocument();
    expect(screen.queryAllByRole("radiogroup")).toHaveLength(0);
  });

  it("says so when the teacher has no classes", async () => {
    service.getMyClasses.mockResolvedValue([]);
    render(<AttendanceScreen />);
    expect(await screen.findByRole("heading", { name: "No classes yet" })).toBeInTheDocument();
  });

  it("says so for a class with no students", async () => {
    service.getRegister.mockImplementation(async (classId, date) => ({ ...makeRegisterFixture(classId, date), students: [] }));
    await open();
    expect(screen.getByText(/There are no students in this class yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit register/ })).not.toBeInTheDocument();
  });
});
