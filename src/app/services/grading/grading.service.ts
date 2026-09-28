/**
 * The redesigned Grading page's endpoints ("Round 3", §17–23 of
 * `talimBE-V2/docs/redesign-teachers-today-timetable.md`):
 *
 * - `GET /grading/course/:courseId?termId=` and
 *   `PUT /grading/course/:courseId/assessments/:assessmentId/scores`
 * - `POST …/assessments/:assessmentId/publish` and `…/unlock`
 * - `GET /grading/classes/:classId/readiness?termId=` and `POST …/reminders`
 * - `GET /grading/classes/:classId/broadsheet?termId=&basis=`
 * - `GET` and `PUT /grading/classes/:classId/remarks`
 * - `GET` and `POST /grading/classes/:classId/term-results`
 *
 * Shapes are the hand-written types in `src/types/grading.ts` (the backend
 * is not in the generated contract yet). Every call goes through the typed
 * client, which unwraps the success envelope either way. With
 * `NEXT_PUBLIC_USE_FIXTURES=true` in a dev build the calls answer from
 * `src/lib/fixtures/grading.fixture.ts`.
 */
import { api } from "@/lib/apiClient";
import { fixturesEnabled } from "@/lib/fixtures/flag";
import type {
  Broadsheet,
  ClassReadiness,
  CourseGradingSheet,
  PublishResult,
  ReminderBody,
  ReminderResult,
  SaveRemarksBody,
  SaveScoresBody,
  SubmitTermResultsBody,
  TermRemarks,
  TermResultSubmission,
  UnlockBody,
} from "@/types/grading";

/**
 * Loads the fixture module (dev builds with fixtures on, and tests).
 *
 * @returns The module.
 */
const fixture = () => import("@/lib/fixtures/grading.fixture");

/**
 * The path segment for an id.
 *
 * @param id - An id.
 * @returns It, URL-encoded.
 */
const seg = (id: string) => encodeURIComponent(id);

export const gradingService = {
  /**
   * `GET /grading/course/:courseId?termId=`: the course's score sheet.
   *
   * @param courseId - The course.
   * @param termId - The term; omitted for the current one.
   * @returns Every assessment of the term, the scale and every student's scores.
   * @throws ApiError: 403 for a course the caller does not teach, 404 for another school's.
   */
  getSheet: async (courseId: string, termId?: string): Promise<CourseGradingSheet> => {
    if (fixturesEnabled()) return (await fixture()).makeCourseSheetFixture(courseId, termId);
    return api.get<CourseGradingSheet>(`/grading/course/${seg(courseId)}`, { params: { termId } });
  },

  /**
   * `PUT …/assessments/:assessmentId/scores`: upserts scores; null deletes one.
   *
   * @param courseId - The course.
   * @param assessmentId - The assessment.
   * @param body - The scores (and the term).
   * @returns The sheet after the save.
   * @throws ApiError: 409 `{ code: 'LOCKED' }` while published; 400 for a score out of range.
   */
  saveScores: async (courseId: string, assessmentId: string, body: SaveScoresBody): Promise<CourseGradingSheet> => {
    if (fixturesEnabled()) return (await fixture()).saveScoresFixture(courseId, assessmentId, body);
    return api.put<CourseGradingSheet>(`/grading/course/${seg(courseId)}/assessments/${seg(assessmentId)}/scores`, body);
  },

  /**
   * `POST …/assessments/:assessmentId/publish`: shows the scores to students
   * and parents and locks them.
   *
   * @param courseId - The course.
   * @param assessmentId - The assessment.
   * @returns When, who changed since an unlock, and how many people were notified.
   * @throws ApiError: 409 `{ missing }` while a student has no score.
   */
  publish: async (courseId: string, assessmentId: string): Promise<PublishResult> => {
    if (fixturesEnabled()) return (await fixture()).publishFixture(courseId, assessmentId);
    return api.post<PublishResult>(`/grading/course/${seg(courseId)}/assessments/${seg(assessmentId)}/publish`, {});
  },

  /**
   * `POST …/assessments/:assessmentId/unlock`: reopens published scores to correct a mistake.
   *
   * @param courseId - The course.
   * @param assessmentId - The assessment.
   * @param body - An optional reason.
   * @returns Resolves once unlocked.
   * @throws ApiError: 409 unless the assessment is published.
   */
  unlock: async (courseId: string, assessmentId: string, body: UnlockBody = {}): Promise<void> => {
    if (fixturesEnabled()) return (await fixture()).unlockFixture(courseId, assessmentId);
    await api.post(`/grading/course/${seg(courseId)}/assessments/${seg(assessmentId)}/unlock`, body);
  },

  /**
   * `GET /grading/classes/:classId/readiness?termId=`: which subjects have published what.
   *
   * @param classId - The class.
   * @param termId - The term; omitted for the current one.
   * @returns The readiness table.
   * @throws ApiError: 403 unless the caller is the class teacher (or staff).
   */
  getReadiness: async (classId: string, termId?: string): Promise<ClassReadiness> => {
    if (fixturesEnabled()) return (await fixture()).makeReadinessFixture(classId);
    return api.get<ClassReadiness>(`/grading/classes/${seg(classId)}/readiness`, { params: { termId } });
  },

  /**
   * `POST /grading/classes/:classId/reminders`: nudges a colleague about an assessment.
   *
   * @param classId - The class.
   * @param body - The course and assessment.
   * @returns When it was sent.
   * @throws ApiError: 409 when a reminder was already sent today.
   */
  sendReminder: async (classId: string, body: ReminderBody): Promise<ReminderResult> => {
    if (fixturesEnabled()) return (await fixture()).sendReminderFixture(classId, body);
    return api.post<ReminderResult>(`/grading/classes/${seg(classId)}/reminders`, body);
  },

  /**
   * `GET /grading/classes/:classId/broadsheet?termId=&basis=`: published scores, one column per subject.
   *
   * @param classId - The class.
   * @param basis - An assessment id or `total`.
   * @param termId - The term; omitted for the current one.
   * @returns The broadsheet.
   * @throws ApiError: 403 unless the caller is the class teacher (or staff).
   */
  getBroadsheet: async (classId: string, basis: string, termId?: string): Promise<Broadsheet> => {
    if (fixturesEnabled()) return (await fixture()).makeBroadsheetFixture(classId, basis);
    return api.get<Broadsheet>(`/grading/classes/${seg(classId)}/broadsheet`, { params: { termId, basis } });
  },

  /**
   * `GET /grading/classes/:classId/remarks?termId=`.
   *
   * @param classId - The class.
   * @param termId - The term; omitted for the current one.
   * @returns One row per student.
   * @throws ApiError: 403 unless the caller is the class teacher (or staff).
   */
  getRemarks: async (classId: string, termId?: string): Promise<TermRemarks> => {
    if (fixturesEnabled()) return (await fixture()).makeRemarksFixture(classId);
    return api.get<TermRemarks>(`/grading/classes/${seg(classId)}/remarks`, { params: { termId } });
  },

  /**
   * `PUT /grading/classes/:classId/remarks`: the class teacher's remarks.
   *
   * @param classId - The class.
   * @param body - The remarks (at most 500 characters each).
   * @returns The rows after the save.
   * @throws ApiError: 409 while the term results are submitted or published.
   */
  saveRemarks: async (classId: string, body: SaveRemarksBody): Promise<TermRemarks> => {
    if (fixturesEnabled()) return (await fixture()).saveRemarksFixture(classId, body);
    return api.put<TermRemarks>(`/grading/classes/${seg(classId)}/remarks`, body);
  },

  /**
   * `GET /grading/classes/:classId/term-results?termId=`: the class's submissions.
   *
   * @param classId - The class.
   * @param termId - The term; omitted for the current one.
   * @returns The submissions (one per basis).
   * @throws ApiError: 403 unless the caller is the class teacher (or staff).
   */
  getTermResults: async (classId: string, termId?: string): Promise<TermResultSubmission[]> => {
    if (fixturesEnabled()) return (await fixture()).makeTermResultsFixture(classId);
    const list = await api.get<TermResultSubmission[]>(`/grading/classes/${seg(classId)}/term-results`, { params: { termId } });
    return Array.isArray(list) ? list : [];
  },

  /**
   * `POST /grading/classes/:classId/term-results`: sends the summary to the school office.
   *
   * @param classId - The class.
   * @param body - The basis (and the term).
   * @returns The submission.
   * @throws ApiError: 409 `{ waitingOn }` until every subject has published the basis.
   */
  submitTermResults: async (classId: string, body: SubmitTermResultsBody): Promise<TermResultSubmission> => {
    if (fixturesEnabled()) return (await fixture()).submitTermResultsFixture(classId, body.basis);
    return api.post<TermResultSubmission>(`/grading/classes/${seg(classId)}/term-results`, body);
  },
};
