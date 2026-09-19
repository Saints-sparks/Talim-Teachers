/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useCurriculumPage } from "@/hooks/curriculum/useCurriculumPage";
import type { Curriculum } from "@/hooks/curriculum/types";

const push = jest.fn();
const back = jest.fn();
let search = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
  useSearchParams: () => search,
}));

jest.mock("@/app/context/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: true, user: { userId: "u1" } }) }));
jest.mock("@/app/context/AppContext", () => ({
  useAppContext: () => ({ teacherData: { assignedCourses: [{ _id: "c1", title: "Mathematics" }] } }),
}));
jest.mock("@/hooks/academic/useCurrentTerm", () => ({
  useCurrentTerm: () => ({ data: { _id: "t1", name: "First term" }, isLoading: false, error: null, refetch: jest.fn() }),
}));

const existing: Curriculum = { _id: "cur1", course: { _id: "c1" }, term: { _id: "t1" }, content: "<p>x</p>" };
let queryResult: { data: Curriculum | null | undefined; isLoading: boolean; error: unknown; refetch: () => void } = {
  data: existing,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};
jest.mock("@/hooks/curriculum/useCurriculumQueries", () => ({ useCurriculumByCourseTerm: () => queryResult }));
jest.mock("@/hooks/curriculum/useCurriculumAccess", () => ({
  useCurriculumAccess: () => ({ canCreate: true, canModify: true, isReady: true }),
}));
const deleteAsync = jest.fn();
jest.mock("@/hooks/curriculum/useCurriculumMutations", () => ({
  useDeleteCurriculum: () => ({ mutateAsync: deleteAsync, isPending: false }),
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => {
  push.mockReset();
  back.mockReset();
  deleteAsync.mockReset();
  queryResult = { data: existing, isLoading: false, error: null, refetch: jest.fn() };
});

describe("useCurriculumPage", () => {
  it("opens no editor for a plain visit", () => {
    search = new URLSearchParams("courseId=c1&termId=t1");
    const { result } = renderHook(() => useCurriculumPage());
    expect(result.current.editorTarget).toBeNull();
    expect(result.current.course?._id).toBe("c1");
  });

  it("opens a blank editor straight away for ?mode=create", () => {
    search = new URLSearchParams("courseId=c1&termId=t1&mode=create");
    const { result } = renderHook(() => useCurriculumPage());
    expect(result.current.editorTarget).toEqual({ curriculum: null });
  });

  it("opens the curriculum the URL points at for ?mode=edit, once it has loaded", () => {
    search = new URLSearchParams("courseId=c1&termId=t1&mode=edit&curriculumId=cur1");
    queryResult = { data: undefined, isLoading: true, error: null, refetch: jest.fn() };
    const { result, rerender } = renderHook(() => useCurriculumPage());
    expect(result.current.editorTarget).toBeNull();

    queryResult = { data: existing, isLoading: false, error: null, refetch: jest.fn() };
    rerender();
    expect(result.current.editorTarget).toEqual({ curriculum: existing });
  });

  it("sends the teacher to the view page after closing an editor opened from the URL, and does not reopen it", () => {
    search = new URLSearchParams("courseId=c1&termId=t1&mode=edit&curriculumId=cur1");
    const { result } = renderHook(() => useCurriculumPage());
    expect(result.current.editorTarget).not.toBeNull();

    act(() => result.current.closeEditor());

    expect(push).toHaveBeenCalledWith("/curriculum/view?courseId=c1&termId=t1&curriculumId=cur1");
    expect(result.current.editorTarget).toBeNull();
  });

  it("stays on the list after closing an editor opened from a card", () => {
    search = new URLSearchParams("courseId=c1&termId=t1");
    const { result } = renderHook(() => useCurriculumPage());
    act(() => result.current.openEdit(existing));
    expect(result.current.editorTarget).toEqual({ curriculum: existing });

    act(() => result.current.closeEditor());

    expect(push).not.toHaveBeenCalled();
    expect(result.current.editorTarget).toBeNull();
  });

  it("deletes only after confirmation, and clears the pending delete on success", async () => {
    search = new URLSearchParams("courseId=c1&termId=t1");
    deleteAsync.mockResolvedValue({ message: "ok" });
    const { result } = renderHook(() => useCurriculumPage());

    act(() => result.current.requestDelete(existing));
    expect(deleteAsync).not.toHaveBeenCalled();
    expect(result.current.pendingDelete).toBe(existing);

    await act(async () => result.current.confirmDelete());
    expect(deleteAsync).toHaveBeenCalledWith("cur1");
    expect(result.current.pendingDelete).toBeNull();
  });

  it("keeps the confirmation open when the delete fails", async () => {
    search = new URLSearchParams("courseId=c1&termId=t1");
    deleteAsync.mockRejectedValue(new Error("forbidden"));
    const { result } = renderHook(() => useCurriculumPage());

    act(() => result.current.requestDelete(existing));
    await act(async () => result.current.confirmDelete());

    expect(result.current.pendingDelete).toBe(existing);
  });
});
