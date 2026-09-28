/**
 * The redesigned Subjects page's endpoints (§6, §7 and "Round 3" §24–25 of
 * `talimBE-V2/docs/redesign-teachers-today-timetable.md`):
 *
 * - `GET /scheme-of-work/me?termId=` (the subject cards)
 * - `GET /scheme-of-work/course/:courseId?termId=`
 * - `PUT /scheme-of-work/course/:courseId/weeks/:week`
 * - `POST /scheme-of-work/course/:courseId/weeks/:week/taught`
 * - `GET /resources/course/:courseId`, `POST /resources`, `DELETE /resources/:id`
 * - `POST /resources/:id/view` (students and parents only; see {@link shouldRecordResourceView})
 * - `GET /curriculum/:id` (the read-only "Earlier notes")
 *
 * Every call goes through the typed client, which unwraps the success
 * envelope. With `NEXT_PUBLIC_USE_FIXTURES=true` in a dev build the calls
 * answer from `src/lib/fixtures/subjects.fixture.ts`, and file uploads are
 * simulated instead of going to Cloudinary.
 */
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { fixturesEnabled } from "@/lib/fixtures/flag";
import { logger } from "@/lib/logger";
import { getCurriculumById } from "@/app/services/curriculum.services";
import { todayService } from "@/app/services/today/today.service";
import { resourcesForTerm } from "@/hooks/subjects/scheme.logic";
import type { Curriculum } from "@/hooks/curriculum/types";
import type {
  CourseResource,
  CreateCourseResourceBody,
  MarkWeekTaughtBody,
  SaveSchemeWeekBody,
  SchemeOfWork,
  SubjectCard,
  WeekTaughtResult,
} from "@/types/subjects";

/**
 * The fixture's refusal, shaped like the API's.
 *
 * @param status - 403 (another teacher's course) or 404.
 * @param what - What was refused or not found.
 * @returns The error to throw.
 */
function fixtureError(status: 403 | 404, what: string): ApiError {
  return ApiError.fromResponse(
    { status },
    status === 403
      ? { success: false, statusCode: 403, message: `You do not teach this ${what}`, error: { code: "FORBIDDEN" } }
      : { success: false, statusCode: 404, message: `${what} not found`, error: { code: "NOT_FOUND" } },
  );
}

/** Options for {@link subjectsService.uploadFile}. */
export interface UploadFileOptions {
  /** Called with a 0-1 fraction as bytes are sent. */
  onProgress?: (fraction: number) => void;
  /** Aborts the upload. */
  signal?: AbortSignal;
}

/**
 * A pretend upload for fixture mode: a second of progress, then a fake URL.
 *
 * @param file - The file.
 * @param options - Progress and abort.
 * @returns A URL that looks like Cloudinary's.
 */
function simulateUpload(file: File, options: UploadFileOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    let step = 0;
    const aborted = () => {
      const error = new Error("Upload cancelled.") as Error & { aborted: boolean };
      error.name = "UploadError";
      error.aborted = true;
      return error;
    };
    if (options.signal?.aborted) return reject(aborted());
    const timer = setInterval(() => {
      step++;
      options.onProgress?.(Math.min(1, step / 5));
      if (step >= 5) {
        clearInterval(timer);
        resolve(`https://res.cloudinary.com/talim-fixture/raw/upload/${encodeURIComponent(file.name)}`);
      }
    }, 200);
    options.signal?.addEventListener("abort", () => {
      clearInterval(timer);
      reject(aborted());
    });
  });
}

/**
 * Whether opening a resource should be recorded as a view. §24: the backend
 * counts unique views by students and parents only, so a teacher opening the
 * resources they shared must not call `POST /resources/:id/view`. The teacher
 * app therefore never records views; the check stays explicit so a shared
 * component cannot start counting teachers by accident.
 *
 * @param role - The signed-in user's role.
 * @returns True only for students and parents.
 */
export function shouldRecordResourceView(role: string | null | undefined): boolean {
  const r = (role ?? "").toLowerCase();
  return r === "student" || r === "parent";
}

export const subjectsService = {
  /**
   * `GET /scheme-of-work/me?termId=`: one card per course the teacher teaches.
   *
   * @param termId - The term; the current one when omitted.
   * @returns The cards.
   * @throws ApiError when they cannot be read.
   */
  getMySubjects: async (termId?: string): Promise<SubjectCard[]> => {
    if (fixturesEnabled()) {
      const { makeSubjectCardsFixture } = await import("@/lib/fixtures/subjects.fixture");
      return makeSubjectCardsFixture(termId);
    }
    const cards = await api.get<SubjectCard[]>("/scheme-of-work/me", { params: { termId } });
    return Array.isArray(cards) ? cards : [];
  },

  /**
   * `GET /scheme-of-work/course/:courseId?termId=`: every week of a course's scheme.
   *
   * @param courseId - The course.
   * @param termId - The term; the current one when omitted.
   * @returns The scheme with the current week (null outside the term).
   * @throws ApiError: 403 for another teacher's course, 404 for another school's.
   */
  getScheme: async (courseId: string, termId?: string): Promise<SchemeOfWork> => {
    if (fixturesEnabled()) {
      const { makeSchemeFixture } = await import("@/lib/fixtures/subjects.fixture");
      const scheme = makeSchemeFixture(courseId, termId);
      if (!scheme) throw fixtureError(403, "course");
      return scheme;
    }
    return api.get<SchemeOfWork>(`/scheme-of-work/course/${encodeURIComponent(courseId)}`, { params: { termId } });
  },

  /**
   * `PUT /scheme-of-work/course/:courseId/weeks/:week`: one week's topic and objectives.
   *
   * @param courseId - The course.
   * @param week - The week, 1..30.
   * @param body - `{ topic, objectives, termId? }`.
   * @returns The whole scheme after the save.
   * @throws ApiError when the save is refused.
   */
  saveWeek: async (courseId: string, week: number, body: SaveSchemeWeekBody): Promise<SchemeOfWork> => {
    if (fixturesEnabled()) {
      const { saveSchemeWeekFixture } = await import("@/lib/fixtures/subjects.fixture");
      const scheme = saveSchemeWeekFixture(courseId, week, body);
      if (!scheme) throw fixtureError(403, "course");
      return scheme;
    }
    return api.put<SchemeOfWork>(`/scheme-of-work/course/${encodeURIComponent(courseId)}/weeks/${week}`, body);
  },

  /**
   * `POST /scheme-of-work/course/:courseId/weeks/:week/taught`, through the
   * same call Today uses (so fixture mode keeps both screens in step).
   *
   * @param courseId - The course.
   * @param week - The week.
   * @param body - `{ taught, termId? }`.
   * @returns `{ week, taughtAt }`.
   * @throws ApiError when the toggle is refused.
   */
  setTaught: async (courseId: string, week: number, body: MarkWeekTaughtBody): Promise<WeekTaughtResult> => {
    if (fixturesEnabled()) {
      const { setWeekTaughtFixture } = await import("@/lib/fixtures/subjects.fixture");
      const result = setWeekTaughtFixture(courseId, week, body);
      if (!result) throw fixtureError(403, "course");
      await todayService.setTaught(courseId, week, body);
      return result;
    }
    return todayService.setTaught(courseId, week, body);
  },

  /**
   * `GET /resources/course/:courseId`: the course's resources, with the §24 fields.
   *
   * @param courseId - The course.
   * @param termId - When given, only that term's resources (and any without a term) are returned.
   * @returns The resources.
   * @throws ApiError when they cannot be read.
   */
  getCourseResources: async (courseId: string, termId?: string): Promise<CourseResource[]> => {
    let list: CourseResource[];
    if (fixturesEnabled()) {
      const { makeCourseResourcesFixture } = await import("@/lib/fixtures/subjects.fixture");
      list = makeCourseResourcesFixture(courseId);
    } else {
      const body = await api.get<CourseResource[]>(`/resources/course/${encodeURIComponent(courseId)}`);
      list = Array.isArray(body) ? body : [];
    }
    return resourcesForTerm(list, termId);
  },

  /**
   * Sends a file to Cloudinary (simulated in fixture mode). The Cloudinary
   * helper is loaded only when needed, since it reads the Cloudinary settings
   * when it loads.
   *
   * @param file - The file.
   * @param options - Progress and abort.
   * @returns The hosted URL.
   * @throws UploadError when the upload fails or is cancelled.
   */
  uploadFile: async (file: File, options: UploadFileOptions = {}): Promise<string> => {
    if (fixturesEnabled()) return simulateUpload(file, options);
    const { uploadToCloudinary } = await import("@/hooks/resources/cloudinaryUpload");
    return uploadToCloudinary(file, options);
  },

  /**
   * `POST /resources` with the §24 fields.
   *
   * @param body - The resource.
   * @returns The created resource.
   * @throws ApiError: 400 for a bad body, 403 when the teacher does not teach the course.
   */
  createResource: async (body: CreateCourseResourceBody): Promise<CourseResource> => {
    if (fixturesEnabled()) {
      const { createResourceFixture } = await import("@/lib/fixtures/subjects.fixture");
      return createResourceFixture(body);
    }
    return api.post<CourseResource>("/resources", body);
  },

  /**
   * `DELETE /resources/:id`.
   *
   * @param id - The resource.
   * @returns Resolves once removed.
   * @throws ApiError when the removal is refused.
   */
  removeResource: async (id: string): Promise<void> => {
    if (fixturesEnabled()) {
      const { removeResourceFixture } = await import("@/lib/fixtures/subjects.fixture");
      if (!removeResourceFixture(id)) throw fixtureError(404, "Resource");
      return;
    }
    await api.delete(`/resources/${encodeURIComponent(id)}`);
  },

  /**
   * `POST /resources/:id/view`, fire and forget: failures are logged, never
   * shown. The backend counts only students and parents (§24), so callers
   * must check {@link shouldRecordResourceView} first; the teacher app never
   * calls this.
   *
   * @param id - The resource.
   */
  recordResourceView: (id: string): void => {
    if (fixturesEnabled()) return;
    api.post(`/resources/${encodeURIComponent(id)}/view`).catch((error: unknown) => logger.warn("subjects", "resource view not recorded", error));
  },

  /**
   * `GET /curriculum/:id`: the old text curriculum shown under "Earlier notes".
   *
   * @param id - The curriculum.
   * @returns The curriculum (its `content` is editor HTML: sanitise before showing).
   * @throws ApiError: 404 when it no longer exists.
   */
  getLegacyCurriculum: async (id: string): Promise<Curriculum> => {
    if (fixturesEnabled()) {
      const { makeLegacyCurriculumFixture } = await import("@/lib/fixtures/subjects.fixture");
      const curriculum = makeLegacyCurriculumFixture(id);
      if (!curriculum) throw fixtureError(404, "Curriculum");
      return curriculum;
    }
    return getCurriculumById(id);
  },
};
