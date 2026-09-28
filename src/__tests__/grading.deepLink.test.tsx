/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react";
import { useCourseGradingWorkspace } from "@/hooks/grading/useCourseGradingWorkspace";
import { gradingWorkspaceService } from "@/app/services/grading-workspace/grading-workspace.service";

jest.mock("@/app/context/AppContext", () => {
  const courses = [
    { _id: "k1", title: "Mathematics", classId: { _id: "c1", name: "JSS1 A" } },
    { _id: "k3", title: "Further Mathematics", classId: { _id: "c2", name: "JSS2 B" } },
  ];
  const classes = [
    { _id: "c1", name: "JSS1 A" },
    { _id: "c2", name: "JSS2 B" },
  ];
  return { useAppContext: () => ({ courses, classes, isLoading: false }) };
});
jest.mock("@/app/services/grading-workspace/grading-workspace.service", () => ({
  resolveId: (v: unknown) => (typeof v === "string" ? v : ((v as { _id?: string } | null)?._id ?? "")),
  gradingWorkspaceService: {
    getTerms: jest.fn(),
    getBatchUploadCapability: jest.fn(),
    getAssessmentsForTerm: jest.fn(),
    getPublicationStatuses: jest.fn(),
    getAssessmentGradeRows: jest.fn(),
    getPublicationStatus: jest.fn(),
  },
}));

const service = gradingWorkspaceService as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  service.getTerms.mockResolvedValue([{ _id: "term-1", name: "First term", isActive: true, academicYearName: "2026/2027" }]);
  service.getBatchUploadCapability.mockResolvedValue({ supported: false });
  service.getAssessmentsForTerm.mockResolvedValue([
    { _id: "a1", name: "1st CA" },
    { _id: "a2", name: "2nd CA" },
  ]);
  service.getPublicationStatuses.mockResolvedValue({});
  service.getAssessmentGradeRows.mockResolvedValue([]);
  service.getPublicationStatus.mockResolvedValue({ published: false });
});

describe("grading deep link (?courseId=&assessmentId=)", () => {
  it("opens the linked course and assessment instead of the first ones", async () => {
    const { result } = renderHook(() => useCourseGradingWorkspace(jest.fn(), jest.fn(), { courseId: "k3", assessmentId: "a2" }));
    await waitFor(() => expect(result.current.selectedCourse).toBe("k3"));
    await waitFor(() => expect(result.current.selectedAssessment).toBe("a2"));
    await waitFor(() =>
      expect(service.getAssessmentGradeRows).toHaveBeenCalledWith(expect.objectContaining({ courseId: "k3", assessmentId: "a2", classId: "c2" })),
    );
  });

  it("ignores a course the teacher does not teach", async () => {
    const { result } = renderHook(() => useCourseGradingWorkspace(jest.fn(), jest.fn(), { courseId: "nope", assessmentId: "a2" }));
    await waitFor(() => expect(service.getAssessmentsForTerm).toHaveBeenCalled());
    expect(result.current.selectedCourse).toBe("");
  });

  it("keeps the old behaviour without a link: first assessment once a course is picked", async () => {
    const { result } = renderHook(() => useCourseGradingWorkspace(jest.fn(), jest.fn()));
    await waitFor(() => expect(service.getAssessmentsForTerm).toHaveBeenCalled());
    expect(result.current.selectedCourse).toBe("");
  });
});
