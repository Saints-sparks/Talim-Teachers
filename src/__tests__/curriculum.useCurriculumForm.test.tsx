/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { AllProviders } from "@/test-utils/render";
import { ApiError } from "@/lib/apiError";
import { saveErrorMessage, useCurriculumForm, type CurriculumFormInput } from "@/hooks/curriculum/useCurriculumForm";
import type { Curriculum } from "@/hooks/curriculum/types";

const mutateAsync = jest.fn();
jest.mock("@/hooks/curriculum/useCurriculumMutations", () => ({
  useSaveCurriculum: () => ({ mutateAsync, isPending: false }),
}));

const toast = { success: jest.fn(), error: jest.fn() };
jest.mock("@/components/CustomToast", () => ({
  toast: { success: (m: string) => toast.success(m), error: (m: string) => toast.error(m) },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <AllProviders>{children}</AllProviders>;
const TEACHER_ID = "68c0a1b2c3d4e5f600000001";

const base: CurriculumFormInput = {
  initialCourseId: "c1",
  curriculum: null,
  currentTermId: "t1",
  html: "<p>Week 1</p>",
  attachments: ["https://cdn.test/a.pdf"],
  onSaved: jest.fn(),
};

beforeEach(() => {
  mutateAsync.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  (base.onSaved as jest.Mock).mockReset();
});

describe("useCurriculumForm", () => {
  it("creates under the current term, credited to the signed-in teacher", async () => {
    mutateAsync.mockResolvedValue({ _id: "cur1" });
    const { result } = renderHook(() => useCurriculumForm(base), { wrapper });

    await act(async () => result.current.save());

    expect(mutateAsync).toHaveBeenCalledWith({
      mode: "create",
      payload: { course: "c1", term: "t1", content: "<p>Week 1</p>", teacherId: TEACHER_ID, attachments: ["https://cdn.test/a.pdf"] },
    });
    expect(toast.success).toHaveBeenCalledWith("Curriculum created successfully");
    expect(base.onSaved).toHaveBeenCalled();
  });

  it("updates without teacherId, so editing a colleague's curriculum does not reassign it", async () => {
    mutateAsync.mockResolvedValue({ _id: "cur1" });
    const curriculum: Curriculum = { _id: "cur1", course: { _id: "c1" }, term: { _id: "t0" }, content: "<p>old</p>" };
    const { result } = renderHook(() => useCurriculumForm({ ...base, curriculum, currentTermId: "t9" }), { wrapper });

    await act(async () => result.current.save());

    const call = mutateAsync.mock.calls[0][0];
    expect(call.mode).toBe("update");
    expect(call.id).toBe("cur1");
    expect(call.payload).toEqual({ course: "c1", term: "t0", content: "<p>Week 1</p>", attachments: ["https://cdn.test/a.pdf"] });
    expect(call.payload).not.toHaveProperty("teacherId");
  });

  it("refuses to save without content and says why", async () => {
    const { result } = renderHook(() => useCurriculumForm({ ...base, html: "<p>Enter curriculum content here...</p>" }), { wrapper });

    await act(async () => result.current.save());

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Please enter curriculum content");
    expect(result.current.isComplete).toBe(false);
  });

  it("refuses to save before the term has loaded", async () => {
    const { result } = renderHook(() => useCurriculumForm({ ...base, currentTermId: undefined }), { wrapper });
    await act(async () => result.current.save());
    expect(toast.error).toHaveBeenCalledWith("Term information is not loaded yet");
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("uses the course the teacher picked when the page did not fix one", async () => {
    mutateAsync.mockResolvedValue({ _id: "cur1" });
    const { result } = renderHook(() => useCurriculumForm({ ...base, initialCourseId: null }), { wrapper });
    expect(result.current.courseId).toBe("");

    act(() => result.current.selectCourse("c7"));
    await act(async () => result.current.save());

    expect(mutateAsync.mock.calls[0][0].payload.course).toBe("c7");
  });

  it("toasts the API's message and does not close when the save fails", async () => {
    mutateAsync.mockRejectedValue(new ApiError("FORBIDDEN", "You can only change curricula you wrote or for courses you teach", 403));
    const { result } = renderHook(() => useCurriculumForm(base), { wrapper });

    await act(async () => result.current.save());

    expect(toast.error).toHaveBeenCalledWith("You can only change curricula you wrote or for courses you teach");
    expect(base.onSaved).not.toHaveBeenCalled();
  });
});

describe("saveErrorMessage", () => {
  it("explains a duplicate course/term curriculum", () => {
    expect(saveErrorMessage(new ApiError("CONFLICT", "dup key", 409))).toMatch(/already exists/);
  });

  it("falls back for errors that are not ApiErrors", () => {
    expect(saveErrorMessage(undefined)).toBe("Failed to save curriculum");
  });
});
