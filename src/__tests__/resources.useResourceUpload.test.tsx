/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useResourceUpload } from "@/hooks/resources/useResourceUpload";
import { UploadError } from "@/hooks/resources/cloudinaryUpload";
import { ApiError } from "@/lib/apiError";

jest.mock("@/app/lib/cloudinary", () => ({
  CLOUDINARY_UPLOAD_PRESET: "test-preset",
  cloudinaryUploadUrl: () => "https://api.cloudinary.test/v1_1/demo/upload",
}));

const uploadToCloudinary = jest.fn();
jest.mock("@/hooks/resources/cloudinaryUpload", () => {
  const actual = jest.requireActual("@/hooks/resources/cloudinaryUpload");
  return { ...actual, uploadToCloudinary: (...args: unknown[]) => uploadToCloudinary(...args) };
});

const mutateAsync = jest.fn();
jest.mock("@/hooks/resources/useResources", () => ({
  useCreateResource: () => ({ mutateAsync }),
}));

jest.mock("@/hooks/resources/useTeacherRoster", () => ({
  useTeacherRoster: () => ({
    isLoading: false,
    classes: [{ _id: "cl1", name: "SS2 A" }],
    courses: [{ _id: "co1", title: "Mathematics", courseCode: "MTH101", classId: "cl1" }],
  }),
}));

jest.mock("@/hooks/academic/useCurrentTerm", () => ({
  useCurrentTerm: () => ({ data: { _id: "tm1", name: "First term" }, isLoading: false, isError: false }),
}));

const toast = { success: jest.fn(), error: jest.fn() };
jest.mock("@/components/CustomToast", () => ({
  toast: { success: (m: string) => toast.success(m), error: (m: string) => toast.error(m) },
}));

const file = new File(["hello"], "notes.pdf", { type: "application/pdf" });
const onClose = jest.fn();

/** Fills the form the way a teacher would. */
function fill(result: { current: ReturnType<typeof useResourceUpload> }) {
  act(() => result.current.setName("Algebra notes"));
  act(() => result.current.selectCourse("co1"));
  act(() => result.current.pickFile(file));
}

beforeEach(() => {
  jest.useFakeTimers();
  uploadToCloudinary.mockReset();
  mutateAsync.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  onClose.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useResourceUpload", () => {
  it("fills the class in from the course", () => {
    const { result } = renderHook(() => useResourceUpload({ isOpen: true, onClose }));
    act(() => result.current.selectCourse("co1"));
    expect(result.current.classId).toBe("cl1");
  });

  it("cannot submit until name, class, course and file are all present", () => {
    const { result } = renderHook(() => useResourceUpload({ isOpen: true, onClose }));
    expect(result.current.canSubmit).toBe(false);
    fill(result);
    expect(result.current.canSubmit).toBe(true);
  });

  it("uploads the file, then creates the resource with exactly the DTO's fields", async () => {
    uploadToCloudinary.mockResolvedValue("https://cdn.test/notes.pdf");
    mutateAsync.mockResolvedValue({ _id: "r1" });
    const { result } = renderHook(() => useResourceUpload({ isOpen: true, onClose }));
    fill(result);

    await act(async () => result.current.submit());

    const payload = mutateAsync.mock.calls[0][0];
    expect(payload).toEqual({
      name: "Algebra notes",
      classId: "cl1",
      courseId: "co1",
      termId: "tm1",
      uploadDate: expect.any(String),
      image: "https://cdn.test/notes.pdf",
      files: ["https://cdn.test/notes.pdf"],
    });
    expect(result.current.phase).toBe("done");

    act(() => jest.advanceTimersByTime(2000));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns to an editable form and says why when the file upload fails", async () => {
    uploadToCloudinary.mockRejectedValue(new UploadError("Network error while uploading."));
    const { result } = renderHook(() => useResourceUpload({ isOpen: true, onClose }));
    fill(result);

    await act(async () => result.current.submit());

    expect(result.current.phase).toBe("idle");
    expect(toast.error).toHaveBeenCalledWith("Network error while uploading.");
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("does not upload the file a second time when only the save failed", async () => {
    uploadToCloudinary.mockResolvedValue("https://cdn.test/notes.pdf");
    mutateAsync.mockRejectedValueOnce(new ApiError("FORBIDDEN", "You can only change resources for courses you teach", 403));
    mutateAsync.mockResolvedValueOnce({ _id: "r1" });
    const { result } = renderHook(() => useResourceUpload({ isOpen: true, onClose }));
    fill(result);

    await act(async () => result.current.submit());
    expect(result.current.phase).toBe("idle");
    expect(toast.error).toHaveBeenCalledWith("You can only change resources for courses you teach");

    await act(async () => result.current.submit());
    expect(uploadToCloudinary).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe("done");
  });

  it("stays quiet when the teacher cancels", async () => {
    uploadToCloudinary.mockRejectedValue(new UploadError("Upload cancelled.", true));
    const { result } = renderHook(() => useResourceUpload({ isOpen: true, onClose }));
    fill(result);

    await act(async () => result.current.submit());

    expect(result.current.phase).toBe("idle");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("rejects an oversized file before any request is made", () => {
    const { result } = renderHook(() => useResourceUpload({ isOpen: true, onClose }));
    const big = new File(["x"], "big.mp4");
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });

    act(() => result.current.pickFile(big));

    expect(result.current.file).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/larger than 10 MB/));
  });

  it("resets the form when the modal closes", () => {
    const { result, rerender } = renderHook(({ open }) => useResourceUpload({ isOpen: open, onClose }), { initialProps: { open: true } });
    fill(result);
    rerender({ open: false });
    expect(result.current.name).toBe("");
    expect(result.current.file).toBeNull();
    expect(result.current.courseId).toBe("");
  });
});
