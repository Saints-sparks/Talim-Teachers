/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/app/context/AuthContext";
import { makeMockAuthValue, mockTeacher } from "@/test-utils/render";
import { ApiError } from "@/lib/apiError";
import { attendanceService } from "@/app/services/attendance/attendance.service";
import { classAttendanceKey } from "@/hooks/attendance/useClassAttendanceStatus";
import { useAttendanceMarking } from "@/hooks/attendance/useAttendanceMarking";
import { toast } from "@/components/CustomToast";
import type { ClassAttendanceStatus, MarkedAttendance } from "@/types/attendance";

jest.mock("@/app/services/attendance/attendance.service", () => ({
  attendanceService: { getClassStatus: jest.fn(), mark: jest.fn(), getStudentKpis: jest.fn() },
}));
jest.mock("@/hooks/academic/useCurrentTerm", () => ({
  useCurrentTerm: () => ({ data: { _id: "term-1" }, isError: false, refetch: jest.fn() }),
}));
const markStepComplete = jest.fn();
jest.mock("@/app/context/OnboardingContext", () => ({ useTeacherOnboarding: () => ({ markStepComplete }) }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));

const mockedService = attendanceService as jest.Mocked<typeof attendanceService>;
const SCHOOL_ID = "68c0a1b2c3d4e5f6000000aa";
const CLASS_ID = "class-1";

const roster = (marked: string[] = []): ClassAttendanceStatus => ({
  classId: CLASS_ID,
  className: "JSS 1A",
  date: "2026-09-18T00:00:00.000Z",
  totalStudents: 2,
  attendanceMarked: marked.length,
  attendanceNotMarked: 2 - marked.length,
  presentCount: marked.length,
  absentCount: 0,
  lateCount: 0,
  excusedCount: 0,
  students: ["s1", "s2"].map((id) => ({
    studentId: id,
    firstName: `First${id}`,
    lastName: `Last${id}`,
    email: `${id}@school.test`,
    attendanceMarked: marked.includes(id),
    attendanceStatus: marked.includes(id) ? ("Present" as const) : undefined,
  })),
});

const stored = (studentId: string): MarkedAttendance => ({
  _id: "att-1",
  studentId,
  classId: CLASS_ID,
  termId: "term-1",
  status: "Present",
  date: "2026-09-18T00:00:00.000Z",
});

/** Renders the hook with a real QueryClient seeded with the roster. */
function setup(initial: ClassAttendanceStatus = roster()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  client.setQueryData(classAttendanceKey(SCHOOL_ID, CLASS_ID), initial);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={makeMockAuthValue(mockTeacher)}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
  const view = renderHook(() => useAttendanceMarking(CLASS_ID, client.getQueryData(classAttendanceKey(SCHOOL_ID, CLASS_ID))), {
    wrapper,
  });
  return { client, ...view };
}

const cached = (client: QueryClient) => client.getQueryData<ClassAttendanceStatus>(classAttendanceKey(SCHOOL_ID, CLASS_ID));

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

describe("useAttendanceMarking submit", () => {
  it("sends exactly the DTO fields, stores the mark in the cached roster and clears the draft", async () => {
    mockedService.mark.mockResolvedValue(stored("s1"));
    const { result, client } = setup();

    act(() => result.current.setStatus("s1", "Present"));
    await act(async () => {
      await result.current.submit("s1");
    });

    expect(mockedService.mark).toHaveBeenCalledTimes(1);
    const payload = mockedService.mark.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(["classId", "date", "status", "studentId", "termId"]);
    expect(payload).toMatchObject({ studentId: "s1", classId: CLASS_ID, status: "Present", termId: "term-1" });
    expect(Number.isNaN(Date.parse(payload.date))).toBe(false);

    expect(cached(client)?.students[0]).toMatchObject({ attendanceMarked: true, attendanceStatus: "Present" });
    expect(cached(client)?.presentCount).toBe(1);
    expect(result.current.drafts.s1).toBeUndefined();
    expect(result.current.rows.s1).toBeUndefined();
    expect(markStepComplete).toHaveBeenCalledWith("mark-attendance");
    expect(toast.success).toHaveBeenCalled();
  });

  it("sends a trimmed reason for an absence and refuses a blank one without a request", async () => {
    mockedService.mark.mockResolvedValue({ ...stored("s2"), status: "Absent" });
    const { result } = setup();

    act(() => result.current.setStatus("s2", "Absent"));
    await act(async () => {
      await result.current.submit("s2");
    });
    expect(mockedService.mark).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/reason for absence/i));

    act(() => result.current.setReason("s2", "  Sick leave "));
    await act(async () => {
      await result.current.submit("s2");
    });
    expect(mockedService.mark.mock.calls[0][0]).toMatchObject({ status: "Absent", absenceReason: "Sick leave" });
  });

  it("blocks a double submit: two taps in the same tick send one request", async () => {
    let resolveMark: (value: MarkedAttendance) => void = () => {};
    mockedService.mark.mockReturnValue(new Promise((resolve) => (resolveMark = resolve)));
    const { result } = setup();

    act(() => result.current.setStatus("s1", "Present"));
    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.submit("s1");
      second = result.current.submit("s1");
    });
    expect(result.current.rows.s1?.phase).toBe("submitting");

    await act(async () => {
      resolveMark(stored("s1"));
      await Promise.all([first, second]);
    });
    expect(mockedService.mark).toHaveBeenCalledTimes(1);
  });

  it("keeps the marked state on a failed request, then retries with the same payload", async () => {
    mockedService.mark.mockRejectedValueOnce(ApiError.offline());
    const { result, client } = setup();

    act(() => result.current.setStatus("s1", "Present"));
    await act(async () => {
      await result.current.submit("s1");
    });

    expect(result.current.drafts.s1).toEqual({ status: "Present" });
    expect(result.current.rows.s1).toMatchObject({ phase: "failed", retryable: true });
    expect(result.current.failedCount).toBe(1);
    expect(cached(client)?.students[0].attendanceMarked).toBe(false);
    expect(mockedService.getClassStatus).not.toHaveBeenCalled(); // offline: nothing to reconcile

    mockedService.mark.mockResolvedValueOnce(stored("s1"));
    await act(async () => {
      await result.current.retryFailed();
    });

    expect(mockedService.mark).toHaveBeenCalledTimes(2);
    expect(mockedService.mark.mock.calls[1][0]).toMatchObject({ studentId: "s1", status: "Present", termId: "term-1" });
    expect(cached(client)?.students[0].attendanceMarked).toBe(true);
    expect(result.current.failedCount).toBe(0);
    expect(result.current.drafts.s1).toBeUndefined();
  });

  it("treats a timeout that the server actually stored as done, not as an error", async () => {
    mockedService.mark.mockRejectedValueOnce(ApiError.timeout());
    mockedService.getClassStatus.mockResolvedValueOnce(roster(["s1"]));
    const { result } = setup();

    act(() => result.current.setStatus("s1", "Present"));
    await act(async () => {
      await result.current.submit("s1");
    });

    expect(mockedService.getClassStatus).toHaveBeenCalledWith(CLASS_ID);
    expect(result.current.rows.s1).toBeUndefined();
    expect(result.current.drafts.s1).toBeUndefined();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("keeps the mark when the roster cannot be re-read either", async () => {
    mockedService.mark.mockRejectedValueOnce(ApiError.timeout());
    mockedService.getClassStatus.mockRejectedValueOnce(ApiError.offline());
    const { result } = setup();

    act(() => result.current.setStatus("s1", "Present"));
    await act(async () => {
      await result.current.submit("s1");
    });

    expect(result.current.rows.s1?.phase).toBe("failed");
    expect(result.current.drafts.s1).toEqual({ status: "Present" });
  });

  it("does not offer a retry when the server says the teacher is not allowed (403)", async () => {
    mockedService.mark.mockRejectedValueOnce(
      ApiError.fromResponse({ status: 403 }, { error: { code: "FORBIDDEN", message: "Teacher is not assigned to this class" } }),
    );
    const { result } = setup();

    act(() => result.current.setStatus("s1", "Present"));
    await act(async () => {
      await result.current.submit("s1");
    });
    expect(result.current.rows.s1).toMatchObject({ phase: "failed", retryable: false });

    await act(async () => {
      await result.current.retryFailed();
    });
    expect(mockedService.mark).toHaveBeenCalledTimes(1);
  });

  it("re-enables the row when the teacher changes their choice after a failure", async () => {
    mockedService.mark.mockRejectedValueOnce(ApiError.offline());
    const { result } = setup();

    act(() => result.current.setStatus("s1", "Present"));
    await act(async () => {
      await result.current.submit("s1");
    });
    act(() => result.current.setStatus("s1", "Absent"));

    expect(result.current.rows.s1).toBeUndefined();
    expect(result.current.drafts.s1?.status).toBe("Absent");
  });
});

describe("useAttendanceMarking drafts", () => {
  it("survives a reload: unsent marks are restored from session storage", async () => {
    const first = setup();
    act(() => first.result.current.setStatus("s2", "Absent"));
    act(() => first.result.current.setReason("s2", "Sick"));
    await waitFor(() => expect(sessionStorage.length).toBe(1));
    first.unmount();

    const second = setup();
    await waitFor(() => expect(second.result.current.drafts.s2).toEqual({ status: "Absent", reason: "Sick" }));
  });

  it("drops a restored draft for a student the server has since marked", async () => {
    const first = setup();
    act(() => first.result.current.setStatus("s1", "Present"));
    await waitFor(() => expect(sessionStorage.length).toBe(1));
    first.unmount();

    const second = setup(roster(["s1"]));
    await waitFor(() => expect(second.result.current.drafts.s1).toBeUndefined());
  });
});
