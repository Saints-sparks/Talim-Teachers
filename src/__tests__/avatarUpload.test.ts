/**
 * The avatar upload spans two systems: Cloudinary (plain fetch, no
 * credentials) and our API (through the client, so the token refreshes).
 */
import { uploadProfileAvatar } from "@/app/lib/avatarUpload";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";

jest.mock("@/lib/apiClient", () => ({ api: { put: jest.fn().mockResolvedValue({}) } }));
jest.mock("@/app/lib/cloudinary", () => ({
  CLOUDINARY_UPLOAD_PRESET: "preset-x",
  cloudinaryUploadUrl: () => "https://api.cloudinary.test/upload",
}));

const file = new File(["x"], "me.png", { type: "image/png" });

function stubFetch(result: unknown, ok = true): jest.Mock {
  const fn = jest.fn().mockResolvedValue({ ok, json: async () => result });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe("uploadProfileAvatar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uploads to Cloudinary without credentials, then saves the URL through our API", async () => {
    const fetchMock = stubFetch({ secure_url: "https://cdn.test/me.png" });

    await expect(uploadProfileAvatar(file)).resolves.toBe("https://cdn.test/me.png");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.cloudinary.test/upload");
    expect((init as RequestInit).headers).toBeUndefined(); // no Authorization to a third party
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
    expect(((init as RequestInit).body as FormData).get("upload_preset")).toBe("preset-x");
    expect(api.put).toHaveBeenCalledWith("/auth/profile/avatar", { avatarUrl: "https://cdn.test/me.png" });
  });

  it("does not touch our API when Cloudinary rejects the image, and keeps its message", async () => {
    stubFetch({ error: { message: "File size too large" } });

    await expect(uploadProfileAvatar(file)).rejects.toThrow("File size too large");
    expect(api.put).not.toHaveBeenCalled();
  });

  it("reports an unreachable network as a typed ApiError", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;

    await expect(uploadProfileAvatar(file)).rejects.toBeInstanceOf(ApiError);
    expect(api.put).not.toHaveBeenCalled();
  });

  it("lets our API's refusal through, so the page can show its message", async () => {
    stubFetch({ secure_url: "https://cdn.test/me.png" });
    (api.put as jest.Mock).mockRejectedValueOnce(ApiError.offline());

    await expect(uploadProfileAvatar(file)).rejects.toBeInstanceOf(ApiError);
  });
});
