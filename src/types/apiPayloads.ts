/**
 * Request payloads of every write endpoint the Teachers portal calls, taken
 * from the backend contract (`./api.d.ts`) instead of written by hand.
 *
 * The API runs `whitelist + forbidNonWhitelisted`: a field the DTO does not
 * declare is a 400, and a renamed one is silently dropped or rejected. Building
 * a body against one of these aliases makes `tsc` compare the client's payload
 * with the DTO, so a backend change that the portal has not followed fails the
 * type-check instead of failing in production.
 *
 * Where the portal deliberately sends a narrower shape than the DTO allows
 * (never sets `classId`, only creates class/course groups, ...) the alias is
 * derived with `Omit`/`Extract` here so the narrowing is visible and still
 * anchored to the contract.
 */
import type { MultipartBody, RequestBody } from "./apiContract";

// ─── Authentication ─────────────────────────────────────────────────────────

/** `POST /auth/login`. */
export type LoginPayload = RequestBody<"/auth/login">;
/** `POST /auth/introspect`. */
export type IntrospectPayload = RequestBody<"/auth/introspect">;
/** `POST /auth/forgot-password`. */
export type ForgotPasswordPayload = RequestBody<"/auth/forgot-password">;
/** `POST /auth/verify-reset-code`. */
export type VerifyResetCodePayload = RequestBody<"/auth/verify-reset-code">;
/** `POST /auth/reset-password`. */
export type ResetPasswordPayload = RequestBody<"/auth/reset-password">;
/** `POST /auth/change-password`. */
export type ChangePasswordPayload = RequestBody<"/auth/change-password">;
/**
 * `PUT /auth/profile/avatar` with a hosted image URL. The contract publishes
 * this endpoint as multipart only (`avatar` file + `avatarUrl`), so the JSON
 * form is derived from the multipart field rather than from a JSON body.
 */
export type AvatarUrlPayload = Required<Pick<MultipartBody<"/auth/profile/avatar", "put">, "avatarUrl">>;

// ─── Settings and notifications ─────────────────────────────────────────────

/** `PATCH /teacher/settings/preferences`. */
export type TeacherPreferencesPayload = RequestBody<"/teacher/settings/preferences", "patch">;
/** `PATCH /teacher/settings/profile`. */
export type TeacherProfilePayload = RequestBody<"/teacher/settings/profile", "patch">;
/** `PATCH /notifications/preferences`. */
export type NotificationPreferencesPayload = RequestBody<"/notifications/preferences", "patch">;
/** `POST /notifications/web-push/subscribe`. */
export type WebPushSubscribePayload = RequestBody<"/notifications/web-push/subscribe">;
/** `DELETE /notifications/web-push/subscribe` (the endpoint travels in the body). */
export type WebPushUnsubscribePayload = RequestBody<"/notifications/web-push/subscribe", "delete">;

// ─── Attendance ─────────────────────────────────────────────────────────────

/** `POST /attendance`. */
export type MarkAttendancePayload = RequestBody<"/attendance">;

// ─── Grading ────────────────────────────────────────────────────────────────

/**
 * `POST /grade-records/grading/assessments/:id/scores` and `.../scores/batch-upload`
 * (the same DTO). `classId` is accepted but ignored by the server, so the
 * portal never sends it.
 */
export type SaveAssessmentScoresBody = Omit<
  RequestBody<"/grade-records/grading/assessments/{assessmentId}/scores">,
  "classId"
>;
/** One row of {@link SaveAssessmentScoresBody}. */
export type AssessmentScoreBody = SaveAssessmentScoresBody["scores"][number];
/** `PUT /grade-records/:id`. */
export type UpdateAssessmentScoreBody = RequestBody<"/grade-records/{id}", "put">;
/** `POST /grade-records/assessment/:assessmentId/course/:courseId/publish`. */
export type PublishAssessmentBody = RequestBody<"/grade-records/assessment/{assessmentId}/course/{courseId}/publish">;
/** `POST /grade-records/course-grade-records/bulk`. */
export type BulkCourseGradesBody = RequestBody<"/grade-records/course-grade-records/bulk">;
/** One row of {@link BulkCourseGradesBody}. */
export type BulkCourseGradeRow = BulkCourseGradesBody["grades"][number];
/** `POST /grade-records/grading/classes/:classId/generate-summary`. */
export type GenerateClassSummaryBody = RequestBody<"/grade-records/grading/classes/{classId}/generate-summary">;
/** `POST /grade-records/grading/classes/:classId/generate-summary/retry`. */
export type RetryClassSummaryBody = RequestBody<"/grade-records/grading/classes/{classId}/generate-summary/retry">;

// ─── Resources and curriculum ───────────────────────────────────────────────

/** `POST /resources`. The portal never sets `uploadedBy`: the server derives it from the token. */
export type CreateResourceBody = Omit<RequestBody<"/resources">, "uploadedBy">;
/** `PUT /resources/:id`. */
export type UpdateResourceBody = Omit<RequestBody<"/resources/{id}", "put">, "uploadedBy">;
/** `POST /curriculum`. */
export type CreateCurriculumBody = RequestBody<"/curriculum">;
/** `PATCH /curriculum/:id`. */
export type UpdateCurriculumBody = RequestBody<"/curriculum/{id}", "patch">;
/** `POST /curriculum/by-course-term`. */
export type CurriculumByCourseTermBody = RequestBody<"/curriculum/by-course-term">;

// ─── Chat ───────────────────────────────────────────────────────────────────

/** `POST /chat/groups`. */
export type CreateGroupChatBody = RequestBody<"/chat/groups">;
/** `PATCH /chat/rooms/:roomId`. */
export type UpdateChatRoomBody = RequestBody<"/chat/rooms/{roomId}", "patch">;
/** `POST /chat/rooms/:roomId/participants/batch`. */
export type AddChatParticipantsBody = RequestBody<"/chat/rooms/{roomId}/participants/batch">;
