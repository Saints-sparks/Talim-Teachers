/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/app/context/AuthContext";
import { makeMockAuthValue, mockTeacher } from "@/test-utils/render";
import { ApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { gradingWorkspaceService } from "@/app/services/grading-workspace/grading-workspace.service";
import type {
  AssessmentOverviewRow,
  CourseGradeRecord,
  StudentAssessmentHistoryRow,
  StudentCumulativeRecord,
} from "@/app/services/grading-workspace/types";
import { useStudentCourseGrades } from "@/hooks/grading/useStudentCourseGrades";

jest.mock("@/app/services/grading-workspace/grading-workspace.service", () => ({
  ...jest.requireActual("@/app/services/grading-workspace/grading-workspace.service"),
  gradingWorkspaceService: {
    getAssessmentOverview: jest.fn(),
    getStudentCourseGrades: jest.fn(),
    getStudentTermGrade: jest.fn(),
    getStudentAssessmentHistory: jest.fn(),
    generateStudentTermGrade: jest.fn(),
  },
}));

const service = gradingWorkspaceService as jest.Mocked<typeof gradingWorkspaceService>;

const SCHOOL = mockTeacher.schoolId as string;
const STUDENT = "stu1";
const CLASS = "cls1";
const TERM = "term1";

const overview: AssessmentOverviewRow[] = [
  { courseId: "c1", courseName: "Maths", teacherName: "Mr A", requiredAssessments: 2, completedAssessments: 2, missingGrades: 0, status: "complete" },
  { courseId: "c2", courseName: "English", teacherName: "Mrs B", requiredAssessments: 2, completedAssessments: 2, missingGrades: 0, status: "complete" },
];

/**
 * A course grade record.
 *
 * @param courseId - The course it is for.
 * @returns The record.
 */
const courseGrade = (courseId: string): CourseGradeRecord => ({
  _id: `g-${courseId}`,
  courseId,
  studentId: STUDENT,
  gradeLevel: "A",
  cumulativeScore: 90,
  maxScore: 100,
  percentage: 90,
});

const history: StudentAssessmentHistoryRow[] = [
  { assessmentGradeRecordId: "a1", assessmentId: "as1", assessmentName: "Quiz 1", actualScore: 8, maxScore: 10, percentage: 80 },
];

const termRecord: StudentCumulativeRecord = { _id: "t1", studentId: STUDENT, percentage: 90, grade: "A", position: 2 };

/**
 * Renders the hook under a fresh QueryClient and a signed-in teacher.
 *
 * @param initial - Options to override.
 * @returns The hook result, the client and the `onGenerated` spy.
 */
function setup(initial: { enabled?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onGenerated = jest.fn();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={makeMockAuthValue(mockTeacher)}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
  const hook = renderHook(
    (props: { enabled: boolean }) =>
      useStudentCourseGrades({ studentId: STUDENT, classId: CLASS, termId: TERM, enabled: props.enabled, onGenerated }),
    { wrapper, initialProps: { enabled: initial.enabled ?? true } },
  );
  return { client, onGenerated, ...hook };
}

beforeEach(() => {
  jest.clearAllMocks();
  service.getAssessmentOverview.mockResolvedValue(overview);
  service.getStudentCourseGrades.mockResolvedValue([courseGrade("c1"), courseGrade("c2")]);
  service.getStudentTermGrade.mockResolvedValue(null);
  service.getStudentAssessmentHistory.mockResolvedValue(history);
  service.generateStudentTermGrade.mockResolvedValue(termRecord);
});

describe("useStudentCourseGrades — loading", () => {
  it("fires the three independent reads together, before any has answered", async () => {
    const never = new Promise<never>(() => undefined);
    service.getAssessmentOverview.mockReturnValue(never);
    service.getStudentCourseGrades.mockReturnValue(never);
    service.getStudentTermGrade.mockReturnValue(never);

    const { result } = setup();

    await waitFor(() => {
      expect(service.getAssessmentOverview).toHaveBeenCalledWith(CLASS, TERM);
      expect(service.getStudentCourseGrades).toHaveBeenCalledWith(STUDENT, TERM);
      expect(service.getStudentTermGrade).toHaveBeenCalledWith(STUDENT, TERM);
    });
    expect(result.current.isLoading).toBe(true);
    expect(service.getStudentAssessmentHistory).not.toHaveBeenCalled();
  });

  it("merges the class courses with the student's grades once loaded", async () => {
    service.getStudentCourseGrades.mockResolvedValue([courseGrade("c1")]);
    const { result } = setup();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.courses.map((c) => [c.courseName, c.grade ? "graded" : "ungraded"])).toEqual([
      ["Maths", "graded"],
      ["English", "ungraded"],
    ]);
    expect(result.current.gradedCount).toBe(1);
    expect(result.current.allCoursesGraded).toBe(false);
    expect(result.current.termGrade).toBeNull();
  });

  it("fetches nothing while the modal is closed", () => {
    setup({ enabled: false });
    expect(service.getAssessmentOverview).not.toHaveBeenCalled();
    expect(service.getStudentCourseGrades).not.toHaveBeenCalled();
    expect(service.getStudentTermGrade).not.toHaveBeenCalled();
  });
});

describe("useStudentCourseGrades — lazy assessments", () => {
  it("loads a course's assessments only when it is expanded, and caches them", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(service.getStudentAssessmentHistory).not.toHaveBeenCalled();

    act(() => result.current.toggleCourse("c1"));
    await waitFor(() => expect(result.current.history.data).toEqual(history));
    expect(service.getStudentAssessmentHistory).toHaveBeenCalledWith(STUDENT, "c1", TERM);
    expect(result.current.expandedCourseId).toBe("c1");

    act(() => result.current.toggleCourse("c1"));
    expect(result.current.expandedCourseId).toBeNull();
    act(() => result.current.toggleCourse("c1"));
    await waitFor(() => expect(result.current.history.data).toEqual(history));
    expect(service.getStudentAssessmentHistory).toHaveBeenCalledTimes(1);

    act(() => result.current.toggleCourse("c2"));
    await waitFor(() => expect(service.getStudentAssessmentHistory).toHaveBeenCalledWith(STUDENT, "c2", TERM));
    expect(service.getStudentAssessmentHistory).toHaveBeenCalledTimes(2);
  });

  it("collapses again when the modal closes", async () => {
    const { result, rerender } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleCourse("c1"));
    expect(result.current.expandedCourseId).toBe("c1");

    rerender({ enabled: false });
    await waitFor(() => expect(result.current.expandedCourseId).toBeNull());
  });
});

describe("useStudentCourseGrades — generating the term grade", () => {
  it("invalidates the term-grade and course-grade queries and leaves the rest alone", async () => {
    const { result, client, onGenerated } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const invalidate = jest.spyOn(client, "invalidateQueries");

    service.getStudentTermGrade.mockResolvedValue(termRecord);
    let finish: (record: StudentCumulativeRecord) => void = () => undefined;
    service.generateStudentTermGrade.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    act(() => result.current.generate.run());
    await waitFor(() => expect(result.current.generate.isPending).toBe(true));
    expect(service.getStudentTermGrade).toHaveBeenCalledTimes(1);
    await act(async () => finish(termRecord));

    await waitFor(() => expect(result.current.termGrade).toEqual(termRecord));
    await waitFor(() => expect(result.current.generate.isSuccess).toBe(true));

    expect(service.generateStudentTermGrade).toHaveBeenCalledWith(STUDENT, TERM);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.grades.studentCumulative(SCHOOL, STUDENT, TERM) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.grades.studentCourseGrades(SCHOOL, STUDENT, TERM) });
    expect(service.getStudentTermGrade).toHaveBeenCalledTimes(2);
    expect(service.getStudentCourseGrades).toHaveBeenCalledTimes(2);
    expect(service.getAssessmentOverview).toHaveBeenCalledTimes(1);
    expect(onGenerated).toHaveBeenCalledWith(termRecord);
  });

  it("stays pending until the refreshed term grade is in, then reports the refresh", async () => {
    const { result, onGenerated } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    service.getStudentTermGrade.mockResolvedValue(termRecord);
    act(() => result.current.generate.run());
    await waitFor(() => expect(onGenerated).toHaveBeenCalled());

    expect(result.current.termGrade).toEqual(termRecord);
  });

  it("ignores a second run while one is in flight", async () => {
    let finish: (record: StudentCumulativeRecord) => void = () => undefined;
    service.generateStudentTermGrade.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.generate.run();
      result.current.generate.run();
    });
    act(() => result.current.generate.run());
    await waitFor(() => expect(service.generateStudentTermGrade).toHaveBeenCalledTimes(1));
    expect(result.current.generate.isPending).toBe(true);

    await act(async () => finish(termRecord));
    await waitFor(() => expect(result.current.generate.isPending).toBe(false));
  });

  it("surfaces a failed generation as the ApiError and allows another attempt", async () => {
    service.generateStudentTermGrade.mockRejectedValueOnce(new ApiError("FORBIDDEN", "Teacher is not assigned to this class", 403));
    const { result, onGenerated } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.generate.run());
    await waitFor(() => expect(result.current.generate.error).toBeInstanceOf(ApiError));

    expect((result.current.generate.error as ApiError).code).toBe("FORBIDDEN");
    expect(onGenerated).not.toHaveBeenCalled();
    expect(result.current.termGrade).toBeNull();

    act(() => result.current.generate.run());
    await waitFor(() => expect(result.current.generate.isSuccess).toBe(true));
    expect(service.generateStudentTermGrade).toHaveBeenCalledTimes(2);
  });
});

describe("useStudentCourseGrades — errors", () => {
  it("exposes the ApiError of a failed initial read, keyed on its code", async () => {
    service.getStudentCourseGrades.mockRejectedValue(ApiError.offline());
    const { result } = setup();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).code).toBe("NETWORK_OFFLINE");
    expect(result.current.isLoading).toBe(false);
  });

  it("retries only the reads that failed", async () => {
    service.getStudentTermGrade.mockRejectedValueOnce(new ApiError("INTERNAL_ERROR", "boom", 500));
    const { result } = setup();
    await waitFor(() => expect(result.current.isError).toBe(true));

    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(service.getStudentTermGrade).toHaveBeenCalledTimes(2);
    expect(service.getAssessmentOverview).toHaveBeenCalledTimes(1);
    expect(service.getStudentCourseGrades).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed assessments read separate from the main data", async () => {
    service.getStudentAssessmentHistory.mockRejectedValue(new ApiError("NOT_FOUND", "gone", 404));
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.toggleCourse("c1"));
    await waitFor(() => expect(result.current.history.isError).toBe(true));

    expect((result.current.history.error as ApiError).code).toBe("NOT_FOUND");
    expect(result.current.isError).toBe(false);
    expect(result.current.courses).toHaveLength(2);
  });
});
