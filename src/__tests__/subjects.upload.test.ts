import {
  DEFAULT_MAX_UPLOAD_MB,
  buildResourcePayload,
  isUploadAborted,
  maxUploadBytes,
  maxUploadMb,
  megabytes,
  mimeTypeOf,
  uploadErrorMessage,
  uploadStatusText,
  validateUpload,
  type UploadDraft,
} from "@/hooks/subjects/upload.logic";
import { ApiError } from "@/lib/apiError";

const MB = 1024 * 1024;

/**
 * A file-like object of a given size (jsdom-free: only name, type and size are read).
 *
 * @param name - File name.
 * @param size - Bytes.
 * @param type - MIME type.
 * @returns The fake file.
 */
function fakeFile(name: string, size: number, type = ""): File {
  return { name, size, type } as File;
}

const draft = (over: Partial<UploadDraft> = {}): UploadDraft => ({
  name: "Fractions worksheet",
  file: fakeFile("fractions.pdf", 400 * 1024, "application/pdf"),
  courseId: "k1",
  classId: "c1",
  termId: "term-1",
  week: 3,
  ...over,
});

describe("upload size cap", () => {
  const original = process.env.NEXT_PUBLIC_MAX_UPLOAD_MB;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_MAX_UPLOAD_MB;
    else process.env.NEXT_PUBLIC_MAX_UPLOAD_MB = original;
  });

  it("defaults to 50 MB", () => {
    delete process.env.NEXT_PUBLIC_MAX_UPLOAD_MB;
    expect(DEFAULT_MAX_UPLOAD_MB).toBe(50);
    expect(maxUploadMb()).toBe(50);
    expect(maxUploadBytes()).toBe(50 * MB);
  });

  it("reads NEXT_PUBLIC_MAX_UPLOAD_MB", () => {
    process.env.NEXT_PUBLIC_MAX_UPLOAD_MB = "20";
    expect(maxUploadMb()).toBe(20);
    expect(maxUploadBytes()).toBe(20 * MB);
    expect(maxUploadBytes("2.5")).toBe(Math.round(2.5 * MB));
  });

  it("ignores empty, zero, negative and non-numeric values", () => {
    for (const bad of ["", "0", "-5", "lots", "NaN", "Infinity"]) expect(maxUploadMb(bad)).toBe(50);
  });

  it("prints the cap in whole megabytes", () => {
    expect(megabytes(50 * MB)).toBe("50");
    expect(megabytes(2.5 * MB)).toBe("2.5");
  });
});

describe("validateUpload", () => {
  it("passes a complete draft", () => {
    expect(validateUpload(draft(), 50 * MB)).toBeNull();
    expect(validateUpload(draft({ week: undefined }), 50 * MB)).toBeNull();
  });

  it("asks for the name first, then the file", () => {
    expect(validateUpload(draft({ name: "   ", file: null }), 50 * MB)).toBe("Give the resource a name.");
    expect(validateUpload(draft({ file: null }), 50 * MB)).toBe("Choose a file to upload.");
  });

  it("rejects an empty file and one over the cap", () => {
    expect(validateUpload(draft({ file: fakeFile("blank.pdf", 0) }), 50 * MB)).toBe("blank.pdf is empty.");
    expect(validateUpload(draft({ file: fakeFile("lesson.mp4", 51 * MB) }), 50 * MB)).toBe("lesson.mp4 is larger than 50 MB.");
    expect(validateUpload(draft({ file: fakeFile("lesson.mp4", 50 * MB) }), 50 * MB)).toBeNull();
  });

  it("needs the course, class and term", () => {
    expect(validateUpload(draft({ courseId: "" }), 50 * MB)).toBe("Choose the subject and class.");
    expect(validateUpload(draft({ classId: "" }), 50 * MB)).toBe("Choose the subject and class.");
    expect(validateUpload(draft({ termId: "" }), 50 * MB)).toMatch(/term/);
    expect(validateUpload(draft({ week: 31 }), 50 * MB)).toBe("Choose a week.");
  });
});

describe("mimeTypeOf", () => {
  it("uses the browser's type, else guesses from the extension", () => {
    expect(mimeTypeOf(fakeFile("a.pdf", 1, "application/pdf"))).toBe("application/pdf");
    expect(mimeTypeOf(fakeFile("slides.PPTX", 1))).toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    expect(mimeTypeOf(fakeFile("notes.docx", 1))).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(mimeTypeOf(fakeFile("clip.mov", 1))).toBe("video/quicktime");
    expect(mimeTypeOf(fakeFile("photo.jpg", 1))).toBe("image/jpeg");
    expect(mimeTypeOf(fakeFile("archive", 1))).toBe("application/octet-stream");
  });
});

describe("buildResourcePayload", () => {
  it("sends visibility, kind, mimeType, sizeBytes, week, image and files", () => {
    const body = buildResourcePayload({
      name: "  Fractions worksheet ",
      courseId: "k1",
      classId: "c1",
      termId: "term-1",
      week: 3,
      visibility: "students_and_parents",
      file: fakeFile("fractions.docx", 1234),
      url: "https://res.cloudinary.test/fractions.docx",
      uploadDate: "2026-09-25T09:30:00.000Z",
    });
    expect(body).toEqual({
      name: "Fractions worksheet",
      classId: "c1",
      courseId: "k1",
      termId: "term-1",
      uploadDate: "2026-09-25T09:30:00.000Z",
      image: "https://res.cloudinary.test/fractions.docx",
      files: ["https://res.cloudinary.test/fractions.docx"],
      week: 3,
      visibility: "students_and_parents",
      kind: "doc",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 1234,
    });
  });

  it("leaves the week out when none is chosen and dates the upload now", () => {
    const body = buildResourcePayload({
      name: "Clip",
      courseId: "k3",
      classId: "c2",
      termId: "term-1",
      week: undefined,
      visibility: "students",
      file: fakeFile("clip.mp4", 10, "video/mp4"),
      url: "u",
    });
    expect(body).not.toHaveProperty("week");
    expect(body.kind).toBe("video");
    expect(Number.isNaN(Date.parse(body.uploadDate ?? ""))).toBe(false);
  });
});

describe("upload status and errors", () => {
  it("announces progress and the save", () => {
    expect(uploadStatusText("uploading", 0.42)).toBe("Uploading… 42%");
    expect(uploadStatusText("uploading", 1.3)).toBe("Uploading… 100%");
    expect(uploadStatusText("saving", 1)).toBe("Saving…");
    expect(uploadStatusText("idle", 0)).toBe("");
  });

  it("recognises a cancelled upload without importing the Cloudinary helper", () => {
    const aborted = Object.assign(new Error("Upload cancelled."), { name: "UploadError", aborted: true });
    const failed = Object.assign(new Error("Network error while uploading."), { name: "UploadError", aborted: false });
    expect(isUploadAborted(aborted)).toBe(true);
    expect(isUploadAborted(failed)).toBe(false);
    expect(isUploadAborted(new Error("x"))).toBe(false);
    expect(uploadErrorMessage(failed)).toBe("Network error while uploading.");
    expect(uploadErrorMessage(ApiError.fromResponse({ status: 403 }, { message: "You do not teach this course" }))).toBe("You do not teach this course");
    expect(uploadErrorMessage("boom")).toBe("The resource was not saved. Please try again.");
  });
});
