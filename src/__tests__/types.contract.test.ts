/**
 * Compile-time contract guard. Each payload below is built with an alias of
 * the backend's generated contract (`src/types/api.d.ts`), so `tsc` (run by
 * `npm run type-check`, not only jest) fails when a DTO renames, removes or
 * retypes a field, or adds a required one, until the portal follows it.
 * Refresh the contract with `npm run types:api`.
 *
 * The `@ts-expect-error` lines prove the guard is live: if an alias ever
 * degraded to `any`/`unknown` the unused directive would itself fail `tsc`.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RequestBody } from "@/types/apiContract";
import type {
  BulkCourseGradesBody,
  ChangePasswordPayload,
  MarkAttendancePayload,
  NotificationPreferencesPayload,
  ResetPasswordPayload,
  SaveAssessmentScoresBody,
  TeacherPreferencesPayload,
  WebPushSubscribePayload,
} from "@/types/apiPayloads";
import { syncApiTypes } from "../../scripts/sync-api-types-core.mjs";

describe("teacher write payloads type-check against the backend DTOs", () => {
  it("POST /attendance", () => {
    const payload = {
      studentId: "665f0000000000000000a001",
      classId: "665f0000000000000000b001",
      termId: "665f0000000000000000c001",
      date: "2026-09-19T00:00:00.000Z",
      status: "Absent",
      absenceReason: "Sick",
    } satisfies MarkAttendancePayload;
    // @ts-expect-error a field the DTO does not declare is a 400
    const extra: MarkAttendancePayload = { ...payload, note: "late bus" };
    // @ts-expect-error a status outside the enum is a 400
    const badStatus: MarkAttendancePayload = { ...payload, status: "Sick" };
    expect(payload.status).toBe("Absent");
    expect([extra, badStatus]).toHaveLength(2);
  });

  it("POST /grade-records/grading/assessments/:id/scores", () => {
    const payload = {
      courseId: "665f0000000000000000d001",
      scores: [{ studentId: "665f0000000000000000a001", score: 17, maxScore: 20 }],
    } satisfies SaveAssessmentScoresBody;
    // @ts-expect-error `score` is a number
    const badScore: SaveAssessmentScoresBody = { ...payload, scores: [{ studentId: "x", score: "17" }] };
    expect(payload.scores[0].score).toBe(17);
    expect(badScore).toBeDefined();
  });

  it("POST /grade-records/course-grade-records/bulk", () => {
    const payload = {
      grades: [
        {
          courseId: "665f0000000000000000d001",
          studentId: "665f0000000000000000a001",
          classId: "665f0000000000000000b001",
          termId: "665f0000000000000000c001",
          assessmentGradeRecords: ["665f0000000000000000e001"],
          cumulativeScore: 34,
          maxScore: 40,
          percentage: 85,
        },
      ],
    } satisfies BulkCourseGradesBody;
    expect(payload.grades[0].percentage).toBe(85);
  });

  it("POST /auth/change-password and /auth/reset-password", () => {
    const change = {
      currentPassword: "Temp#1234",
      newPassword: "Str0ng!Pass",
      confirmPassword: "Str0ng!Pass",
    } satisfies ChangePasswordPayload;
    const reset = { email: "teacher@school.test", token: "123456", newPassword: "Str0ng!Pass" } satisfies ResetPasswordPayload;
    // @ts-expect-error `confirmPassword` is required by ChangePasswordDto
    const missing: ChangePasswordPayload = { currentPassword: "a", newPassword: "b" };
    expect(change.confirmPassword).toBe(reset.newPassword);
    expect(missing).toBeDefined();
  });

  it("POST /notifications/web-push/subscribe", () => {
    const payload = {
      endpoint: "https://push.example.test/send/abc",
      keys: { p256dh: "BPub", auth: "secret" },
      userAgent: "jest",
    } satisfies WebPushSubscribePayload;
    // @ts-expect-error `keys` is required
    const missing: WebPushSubscribePayload = { endpoint: payload.endpoint };
    expect(payload.keys.auth).toBe("secret");
    expect(missing).toBeDefined();
  });

  it("PATCH /teacher/settings/preferences and /notifications/preferences", () => {
    const preferences = {
      notifications: { announcements: true, quietStart: "22:00", quietEnd: "07:00" },
      messages: { defaultFilter: "groups" },
      theme: "dark",
    } satisfies TeacherPreferencesPayload;
    const switches = { pushEnabled: true, webPushEnabled: false, quietHoursStart: "22:00" } satisfies NotificationPreferencesPayload;
    // @ts-expect-error `theme` is an enum
    const badTheme: TeacherPreferencesPayload = { theme: "sepia" };
    expect(preferences.theme).toBe("dark");
    expect([switches, badTheme]).toHaveLength(2);
  });

  it("resolves a real body, not `never` or `any`", () => {
    // `never` for an endpoint with no JSON body proves the helper is not `any`.
    // (`/auth/logout` used to be this example; it now takes an optional
    // `{ refreshToken }` body for native apps.)
    type NoBody = RequestBody<"/notifications/read-all", "patch">;
    const noBody: [NoBody] extends [never] ? true : false = true;
    expect(noBody).toBe(true);
  });
});

describe("scripts/sync-api-types-core", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "api-types-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("creates, reports unchanged, then updates the copy", () => {
    const source = join(dir, "backend", "api-types.d.ts");
    const target = join(dir, "app", "types", "api.d.ts");
    // `backend/` does not exist yet: a missing checkout is reported, not thrown.
    expect(syncApiTypes(source, target)).toBe("missing-source");
    expect(existsSync(target)).toBe(false);

    mkdirSync(join(dir, "backend"));
    writeFileSync(source, "export interface paths {}\n");
    expect(syncApiTypes(source, target)).toBe("created");
    expect(readFileSync(target, "utf8")).toBe("export interface paths {}\n");
    expect(syncApiTypes(source, target)).toBe("unchanged");

    writeFileSync(source, "export interface paths { '/x': never }\n");
    expect(syncApiTypes(source, target)).toBe("updated");
    expect(readFileSync(target, "utf8")).toContain("'/x'");
  });
});
