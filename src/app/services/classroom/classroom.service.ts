/**
 * The Attendance and Students screens' endpoints ("Round 2", sections 11–14
 * of `talimBE-V2/docs/redesign-teachers-today-timetable.md`):
 *
 * - `GET /teachers/me/classes`
 * - `GET /registers/:classId?date=` and `PUT /registers/:classId?date=`
 * - `GET /teachers/me/classes/:classId/students`
 * - `GET /teachers/me/students/:studentId`
 *
 * Shapes are the generated-contract aliases in `src/types/classroom.ts`.
 * Every call goes through the typed client, which unwraps the success
 * envelope either way. With `NEXT_PUBLIC_USE_FIXTURES=true` in a dev build
 * the calls answer from `src/lib/fixtures/classroom.fixture.ts`.
 */
import { api } from "@/lib/apiClient";
import { ApiError, type ApiErrorBody } from "@/lib/apiError";
import { fixturesEnabled } from "@/lib/fixtures/flag";
import type { ClassRoster, MyClass, RegisterMissingBody, RegisterSaved, RegisterView, SaveRegisterBody, StudentRecord } from "@/types/classroom";

/**
 * The fixture's 404 for an unknown id, shaped like the API's.
 *
 * @param what - What was not found.
 * @returns The error to throw.
 */
function fixtureNotFound(what: string): ApiError {
  return ApiError.fromResponse({ status: 404 }, { success: false, statusCode: 404, message: `${what} not found`, error: { code: "NOT_FOUND" } });
}

export const classroomService = {
  /**
   * `GET /teachers/me/classes`: the class pickers on Attendance and Students.
   *
   * @returns Class-teacher classes first, then the rest by name.
   * @throws ApiError when it cannot be read.
   */
  getMyClasses: async (): Promise<MyClass[]> => {
    if (fixturesEnabled()) {
      const { makeMyClassesFixture } = await import("@/lib/fixtures/classroom.fixture");
      return makeMyClassesFixture();
    }
    const classes = await api.get<MyClass[]>("/teachers/me/classes");
    return Array.isArray(classes) ? classes : [];
  },

  /**
   * `GET /registers/:classId?date=`: one class's morning register.
   *
   * @param classId - The class.
   * @param date - `YYYY-MM-DD`; omitted for today in the school's timezone.
   * @returns The register, with the caller's access.
   * @throws ApiError when it cannot be read (403 for a class the caller does not teach).
   */
  getRegister: async (classId: string, date?: string): Promise<RegisterView> => {
    if (fixturesEnabled()) {
      const { makeRegisterFixture } = await import("@/lib/fixtures/classroom.fixture");
      return makeRegisterFixture(classId, date);
    }
    return api.get<RegisterView>(`/registers/${encodeURIComponent(classId)}`, { params: { date } });
  },

  /**
   * `PUT /registers/:classId?date=`: saves marks as a draft (`submit: false`)
   * or submits the register (`submit: true`).
   *
   * @param classId - The class.
   * @param date - `YYYY-MM-DD`; omitted for today.
   * @param body - The marks and whether to submit.
   * @returns The register after the save (same shape as the GET).
   * @throws ApiError: 409 with a top-level `missing` count when a submit leaves students unmarked (read it with `missingFromError`); 403 when the caller may only view.
   */
  saveRegister: async (classId: string, date: string | undefined, body: SaveRegisterBody): Promise<RegisterSaved> => {
    if (fixturesEnabled()) {
      const { saveRegisterFixture, FixtureRegisterIncomplete } = await import("@/lib/fixtures/classroom.fixture");
      try {
        return saveRegisterFixture(classId, date, body);
      } catch (error) {
        if (error instanceof FixtureRegisterIncomplete) {
          const conflict: RegisterMissingBody = {
            success: false,
            statusCode: 409,
            message: error.message,
            error: { code: "CONFLICT", message: error.message },
            missing: error.missing,
          };
          throw ApiError.fromResponse({ status: 409 }, conflict as ApiErrorBody);
        }
        throw error;
      }
    }
    return api.put<RegisterSaved>(`/registers/${encodeURIComponent(classId)}`, body, { params: { date } });
  },

  /**
   * `GET /teachers/me/classes/:classId/students`: the Students tab of one class.
   *
   * @param classId - The class.
   * @returns The roster with its stats and the caller's courses there.
   * @throws ApiError when it cannot be read.
   */
  getRoster: async (classId: string): Promise<ClassRoster> => {
    if (fixturesEnabled()) {
      const { makeRosterFixture } = await import("@/lib/fixtures/classroom.fixture");
      return makeRosterFixture(classId);
    }
    return api.get<ClassRoster>(`/teachers/me/classes/${encodeURIComponent(classId)}/students`);
  },

  /**
   * `GET /teachers/me/students/:studentId`: one student's record.
   *
   * @param studentId - The student.
   * @returns Details, guardian, term attendance and scores in the caller's courses.
   * @throws ApiError: 404 for another school's student, 403 for one outside the caller's classes.
   */
  getStudentRecord: async (studentId: string): Promise<StudentRecord> => {
    if (fixturesEnabled()) {
      const { makeStudentRecordFixture } = await import("@/lib/fixtures/classroom.fixture");
      const record = makeStudentRecordFixture(studentId);
      if (!record) throw fixtureNotFound("Student");
      return record;
    }
    return api.get<StudentRecord>(`/teachers/me/students/${encodeURIComponent(studentId)}`);
  },
};
