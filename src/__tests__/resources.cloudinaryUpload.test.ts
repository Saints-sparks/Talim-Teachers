/**
 * @jest-environment jsdom
 */
import { MAX_UPLOAD_BYTES, UploadError, uploadToCloudinary, validateUploadFile } from "@/hooks/resources/cloudinaryUpload";

jest.mock("@/app/lib/cloudinary", () => ({
  CLOUDINARY_UPLOAD_PRESET: "test-preset",
  cloudinaryUploadUrl: () => "https://api.cloudinary.test/v1_1/demo/upload",
}));

/** A controllable stand-in for XMLHttpRequest. */
class FakeXhr {
  static last: FakeXhr;
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = "";
  timeout = 0;
  method = "";
  url = "";
  body: FormData | null = null;

  constructor() {
    FakeXhr.last = this;
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send(body: FormData) {
    this.body = body;
  }

  abort() {
    this.onabort?.();
  }
}

const OriginalXhr = global.XMLHttpRequest;
beforeAll(() => {
  (global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXhr;
});
afterAll(() => {
  global.XMLHttpRequest = OriginalXhr;
});

const file = new File(["hello"], "notes.pdf", { type: "application/pdf" });

describe("uploadToCloudinary", () => {
  it("posts the file and the env preset to the configured endpoint, never the bearer token", async () => {
    const promise = uploadToCloudinary(file);
    const xhr = FakeXhr.last;
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("https://api.cloudinary.test/v1_1/demo/upload");
    expect(xhr.body?.get("upload_preset")).toBe("test-preset");
    expect((xhr.body?.get("file") as File).name).toBe("notes.pdf");

    xhr.status = 200;
    xhr.responseText = JSON.stringify({ secure_url: "https://cdn.test/notes.pdf" });
    xhr.onload?.();
    await expect(promise).resolves.toBe("https://cdn.test/notes.pdf");
  });

  it("reports progress, stopping short of 1 until the response arrives", async () => {
    const onProgress = jest.fn();
    const promise = uploadToCloudinary(file, { onProgress });
    const xhr = FakeXhr.last;

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([0.5, 0.99]);

    xhr.status = 200;
    xhr.responseText = JSON.stringify({ secure_url: "https://cdn.test/x" });
    xhr.onload?.();
    await promise;
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  it("rejects with Cloudinary's own message when the file is refused", async () => {
    const promise = uploadToCloudinary(file);
    FakeXhr.last.status = 400;
    FakeXhr.last.responseText = JSON.stringify({ error: { message: "File size too large" } });
    FakeXhr.last.onload?.();
    await expect(promise).rejects.toThrow("File size too large");
  });

  it("rejects on a network error, so the caller can clear its spinner", async () => {
    const promise = uploadToCloudinary(file);
    FakeXhr.last.onerror?.();
    await expect(promise).rejects.toBeInstanceOf(UploadError);
  });

  it("rejects on a timeout", async () => {
    const promise = uploadToCloudinary(file);
    FakeXhr.last.ontimeout?.();
    await expect(promise).rejects.toThrow(/too long/);
  });

  it("rejects when the response has no file address", async () => {
    const promise = uploadToCloudinary(file);
    FakeXhr.last.status = 200;
    FakeXhr.last.responseText = "{}";
    FakeXhr.last.onload?.();
    await expect(promise).rejects.toBeInstanceOf(UploadError);
  });

  it("marks an abort as cancelled, not failed", async () => {
    const controller = new AbortController();
    const promise = uploadToCloudinary(file, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ aborted: true });
  });

  it("does not start when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(uploadToCloudinary(file, { signal: controller.signal })).rejects.toMatchObject({ aborted: true });
  });
});

describe("validateUploadFile", () => {
  it("accepts an ordinary file", () => {
    expect(validateUploadFile(file)).toBeNull();
  });

  it("rejects an empty file and one over the limit", () => {
    expect(validateUploadFile(new File([], "empty.pdf"))).toMatch(/empty/);
    const big = new File(["x"], "big.pdf");
    Object.defineProperty(big, "size", { value: MAX_UPLOAD_BYTES + 1 });
    expect(validateUploadFile(big)).toMatch(/larger than 10 MB/);
  });
});
