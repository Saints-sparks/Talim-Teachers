/**
 * Curriculum REST calls. Every request goes through the one typed client
 * (`api`), which attaches the bearer token, refreshes it once on 401 and
 * raises `ApiError`.
 *
 * Pages read curricula through the TanStack hooks in `src/hooks/curriculum`,
 * which cache and invalidate; these functions are the transport under them.
 * The `token` argument some functions still accept is ignored: it is kept only
 * so call sites written before the single client (subject cards, onboarding
 * sync) compile unchanged.
 */
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import type { CurriculumByCourseTermBody } from "@/types/apiPayloads";
import type {
  CreateCurriculumPayload,
  Curriculum,
  CurriculumFilters,
  UpdateCurriculumPayload,
} from "@/hooks/curriculum/types";

/**
 * Creates a curriculum.
 *
 * @param curriculumData - Exactly what `CreateCurriculumDto` declares.
 * @param _token - Ignored; the client holds the session token.
 * @returns The created curriculum.
 * @throws ApiError when the server rejects the payload (400) or the teacher may not write it (403).
 */
export const createCurriculum = async (
  curriculumData: CreateCurriculumPayload,
  _token?: string,
): Promise<Curriculum> => api.post<Curriculum>("/curriculum", curriculumData);

/**
 * Lists the school's curricula, optionally filtered by course, term or teacher.
 *
 * @param filters - `course`, `term` and/or `teacherId`.
 * @param _token - Ignored; the client holds the session token.
 * @returns The curricula, newest first.
 * @throws ApiError when the request fails.
 */
export const getCurricula = async (filters: CurriculumFilters = {}, _token?: string): Promise<Curriculum[]> => {
  const body = await api.get<Curriculum[]>("/curriculum", { params: { ...filters } });
  return Array.isArray(body) ? body : [];
};

/**
 * Reads one curriculum.
 *
 * @param id - The curriculum id.
 * @param _token - Ignored; the client holds the session token.
 * @returns The curriculum.
 * @throws ApiError with code `NOT_FOUND` when it is not in the caller's school.
 */
export const getCurriculumById = async (id: string, _token?: string): Promise<Curriculum> =>
  api.get<Curriculum>(`/curriculum/${id}`);

/**
 * Updates a curriculum.
 *
 * @param id - The curriculum id.
 * @param updatedData - The fields to change (`UpdateCurriculumDto`).
 * @param _token - Ignored; the client holds the session token.
 * @returns The updated curriculum.
 * @throws ApiError with code `FORBIDDEN` when a teacher does not own it.
 */
export const updateCurriculum = async (
  id: string,
  updatedData: UpdateCurriculumPayload,
  _token?: string,
): Promise<Curriculum> => api.patch<Curriculum>(`/curriculum/${id}`, updatedData);

/**
 * Deletes a curriculum.
 *
 * @param id - The curriculum id.
 * @param _token - Ignored; the client holds the session token.
 * @returns The server's confirmation message.
 * @throws ApiError with code `FORBIDDEN` when a teacher does not own it.
 */
export const deleteCurriculum = async (id: string, _token?: string): Promise<{ message: string }> =>
  api.delete<{ message: string }>(`/curriculum/${id}`);

/** Arguments of {@link getCurriculumByCourseAndTerm}. */
export interface CourseTermQuery {
  courseId: string;
  termId: string;
  /** Ignored; the client holds the session token. */
  token?: string;
}

/**
 * The curriculum of one course in one term. A course has at most one per term
 * (the collection has a unique index on course + term + school).
 *
 * @param query - The course and term.
 * @param query.courseId - The course id.
 * @param query.termId - The term id.
 * @returns The curriculum, or `null` when none has been written yet (empty list or 404).
 * @throws ApiError on any other failure.
 */
export const getCurriculumByCourseAndTerm = async ({ courseId, termId }: CourseTermQuery): Promise<Curriculum | null> => {
  try {
    const request: CurriculumByCourseTermBody = { courseId, termId };
    const body = await api.post<Curriculum | Curriculum[] | null>("/curriculum/by-course-term", request);
    if (Array.isArray(body)) return body[0] ?? null;
    return body ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") return null;
    throw error;
  }
};
