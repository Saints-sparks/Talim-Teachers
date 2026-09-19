/**
 * @jest-environment jsdom
 */
import { ApiError } from "@/lib/apiError";
import {
  createCurriculum,
  deleteCurriculum,
  getCurricula,
  getCurriculumByCourseAndTerm,
  updateCurriculum,
} from "@/app/services/curriculum.services";

jest.mock("@/lib/apiClient", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { api } from "@/lib/apiClient";

const mocked = api as unknown as Record<"get" | "post" | "patch" | "delete", jest.Mock>;

beforeEach(() => {
  Object.values(mocked).forEach((fn) => fn.mockReset());
});

describe("getCurriculumByCourseAndTerm", () => {
  const query = { courseId: "c1", termId: "t1" };

  it("posts exactly what GetCurriculumByCourseAndTermDto declares", async () => {
    mocked.post.mockResolvedValue([]);
    await getCurriculumByCourseAndTerm({ ...query, token: "ignored" });
    expect(mocked.post).toHaveBeenCalledWith("/curriculum/by-course-term", { courseId: "c1", termId: "t1" });
  });

  it("returns the first curriculum when the API sends a list", async () => {
    mocked.post.mockResolvedValue([{ _id: "cur1" }, { _id: "cur2" }]);
    expect(await getCurriculumByCourseAndTerm(query)).toEqual({ _id: "cur1" });
  });

  it("returns null for an empty list", async () => {
    mocked.post.mockResolvedValue([]);
    expect(await getCurriculumByCourseAndTerm(query)).toBeNull();
  });

  it("returns null when the API answers NOT_FOUND", async () => {
    mocked.post.mockRejectedValue(new ApiError("NOT_FOUND", "Curriculum not found", 404));
    expect(await getCurriculumByCourseAndTerm(query)).toBeNull();
  });

  it("does not swallow any other failure into an empty result", async () => {
    mocked.post.mockRejectedValue(new ApiError("SERVICE_UNAVAILABLE", "down", 503));
    await expect(getCurriculumByCourseAndTerm(query)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});

describe("curriculum writes", () => {
  it("creates with the DTO payload only", async () => {
    mocked.post.mockResolvedValue({ _id: "cur1" });
    const payload = { course: "c1", term: "t1", content: "<p>x</p>", teacherId: "u1", attachments: [] };
    await createCurriculum(payload);
    expect(mocked.post).toHaveBeenCalledWith("/curriculum", payload);
  });

  it("updates through PATCH", async () => {
    mocked.patch.mockResolvedValue({ _id: "cur1" });
    await updateCurriculum("cur1", { content: "<p>y</p>" });
    expect(mocked.patch).toHaveBeenCalledWith("/curriculum/cur1", { content: "<p>y</p>" });
  });

  it("deletes by id", async () => {
    mocked.delete.mockResolvedValue({ message: "ok" });
    await deleteCurriculum("cur1");
    expect(mocked.delete).toHaveBeenCalledWith("/curriculum/cur1");
  });

  it("lists with the filters as query params, and always returns an array", async () => {
    mocked.get.mockResolvedValue(null);
    expect(await getCurricula({ teacherId: "t1" })).toEqual([]);
    expect(mocked.get).toHaveBeenCalledWith("/curriculum", { params: { teacherId: "t1" } });
  });
});
