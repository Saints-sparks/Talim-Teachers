/**
 * @jest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/app/context/AuthContext";
import { makeMockAuthValue, mockSubAdmin, mockTeacher } from "@/test-utils/render";
import { ApiError } from "@/lib/apiError";
import { gradingWorkspaceService } from "@/app/services/grading-workspace/grading-workspace.service";
import type { StudentCumulativeRecord } from "@/app/services/grading-workspace/types";
import type { User } from "@/types/auth";
import { StudentCourseGradesModal } from "@/components/grading/workspace/StudentCourseGradesModal";

jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
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

let classTeacherClasses: Array<{ _id: string }> = [];
jest.mock("@/app/context/AppContext", () => ({
  useAppContext: () => ({ teacherData: { classTeacherClasses } }),
}));

const service = gradingWorkspaceService as jest.Mocked<typeof gradingWorkspaceService>;
const termRecord: StudentCumulativeRecord = { _id: "t1", studentId: "stu1", percentage: 88.5, grade: "A", position: 3 };

/**
 * Renders the modal for one student of class `cls1`.
 *
 * @param user - Who is signed in.
 * @param open - Whether the modal is open.
 * @returns The render result.
 */
function renderModal(user: User = mockTeacher, open = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const ui = (isOpen: boolean) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={makeMockAuthValue(user)}>
        <StudentCourseGradesModal
          open={isOpen}
          onOpenChange={jest.fn()}
          studentId="stu1"
          studentName="Ada Obi"
          classId="cls1"
          termId="term1"
        />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
  const view = render(ui(open));
  return { ...view, setOpen: (isOpen: boolean) => view.rerender(ui(isOpen)) };
}

beforeEach(() => {
  jest.clearAllMocks();
  classTeacherClasses = [{ _id: "cls1" }];
  service.getAssessmentOverview.mockResolvedValue([
    { courseId: "c1", courseName: "Maths", teacherName: "Mr A", requiredAssessments: 1, completedAssessments: 1, missingGrades: 0, status: "complete" },
  ]);
  service.getStudentCourseGrades.mockResolvedValue([
    { _id: "g1", courseId: "c1", studentId: "stu1", gradeLevel: "A", cumulativeScore: 90, maxScore: 100, percentage: 90 },
  ]);
  service.getStudentTermGrade.mockResolvedValue(null);
  service.getStudentAssessmentHistory.mockResolvedValue([]);
  service.generateStudentTermGrade.mockResolvedValue(termRecord);
  document.body.style.overflow = "";
});

describe("StudentCourseGradesModal", () => {
  it("shows a loading state, then the courses", async () => {
    renderModal();
    expect(screen.getByRole("status")).toHaveTextContent(/loading course grades/i);

    expect(await screen.findByText("Maths")).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/1\/1 courses\s*graded/);
  });

  it("maps a failed load to the error state, keyed on the error code", async () => {
    service.getStudentCourseGrades.mockRejectedValue(new ApiError("FORBIDDEN", "Teacher is not assigned to this class", 403));
    renderModal();

    expect(await screen.findByText("You don't have access to this")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate term grade/i })).not.toBeInTheDocument();
  });

  it("shows an empty state for a class with no courses", async () => {
    service.getAssessmentOverview.mockResolvedValue([]);
    service.getStudentCourseGrades.mockResolvedValue([]);
    renderModal();

    expect(await screen.findByText(/no courses found for this class and term/i)).toBeInTheDocument();
  });

  it("loads a course's assessments only once it is opened", async () => {
    renderModal();
    const row = await screen.findByRole("button", { name: /maths/i });
    expect(service.getStudentAssessmentHistory).not.toHaveBeenCalled();

    fireEvent.click(row);

    expect(await screen.findByText(/no assessment records found/i)).toBeInTheDocument();
    expect(service.getStudentAssessmentHistory).toHaveBeenCalledWith("stu1", "c1", "term1");
  });

  it("locks body scroll while open and restores it on close", async () => {
    document.body.style.overflow = "auto";
    const { setOpen } = renderModal();
    await screen.findByText("Maths");
    expect(document.body.style.overflow).toBe("hidden");

    setOpen(false);
    await waitFor(() => expect(document.body.style.overflow).toBe("auto"));
  });

  it("asks for confirmation before generating, and generates once", async () => {
    renderModal();
    fireEvent.click(await screen.findByRole("button", { name: /generate term grade/i }));
    expect(service.generateStudentTermGrade).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/teachers and students will see it/i);

    service.getStudentTermGrade.mockResolvedValue(termRecord);
    fireEvent.click(screen.getByRole("button", { name: /yes, generate/i }));

    expect(await screen.findByText(/Term Grade: A/)).toBeInTheDocument();
    expect(service.generateStudentTermGrade).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /generate term grade/i })).not.toBeInTheDocument();
  });

  it("cancelling the confirmation writes nothing", async () => {
    renderModal();
    fireEvent.click(await screen.findByRole("button", { name: /generate term grade/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(service.generateStudentTermGrade).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /generate term grade/i })).toBeEnabled();
  });

  it("disables the button while generating so it cannot be clicked twice", async () => {
    service.generateStudentTermGrade.mockReturnValue(new Promise(() => undefined));
    renderModal();
    fireEvent.click(await screen.findByRole("button", { name: /generate term grade/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes, generate/i }));

    const busy = await screen.findByRole("button", { name: /generating/i });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    expect(service.generateStudentTermGrade).toHaveBeenCalledTimes(1);
  });

  it("shows a failed generation as an error keyed on its code, and offers to retry", async () => {
    service.generateStudentTermGrade.mockRejectedValue(new ApiError("FORBIDDEN", "Teacher is not assigned to this class", 403));
    renderModal();
    fireEvent.click(await screen.findByRole("button", { name: /generate term grade/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes, generate/i }));

    expect(await screen.findByText("You don't have access to this")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate term grade/i })).toBeEnabled();
  });

  it("hides the action from a teacher who is not the class teacher, and says why", async () => {
    classTeacherClasses = [{ _id: "another-class" }];
    renderModal();

    expect(await screen.findByText(/only the class teacher can generate/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate term grade/i })).not.toBeInTheDocument();
  });

  it("offers a sub-admin the action, since the server checks their permission", async () => {
    classTeacherClasses = [];
    renderModal(mockSubAdmin);

    expect(await screen.findByRole("button", { name: /generate term grade/i })).toBeInTheDocument();
  });

  it("explains what is missing when a course is still ungraded", async () => {
    service.getStudentCourseGrades.mockResolvedValue([]);
    renderModal();

    expect(await screen.findByText(/cannot generate term grade yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate term grade/i })).not.toBeInTheDocument();
  });
});
