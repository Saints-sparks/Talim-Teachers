/**
 * Attendance endpoints, typed against the backend DTOs
 * (`talimBE-V2/src/modules/user/data/dtos/attendance.dto.ts`).
 *
 * Unlike the older helpers in `api.service.ts`, nothing here swallows a
 * failure: a request that fails throws `ApiError`, so the screen can show the
 * error, keep the teacher's marks and offer a retry instead of rendering an
 * empty roster as if the class had no students.
 */
import { api } from "@/lib/apiClient";
import type {
  ClassAttendanceStatus,
  CreateAttendancePayload,
  MarkedAttendance,
  StudentAttendanceKpis,
  StudentKpiFilter,
} from "@/types/attendance";

export const attendanceService = {
  /**
   * A class's whole roster with today's mark for each student. The server
   * returns up to 1000 students in this one response, so no paging is needed.
   *
   * @param classId - The class to read.
   * @returns The roster and the day's counters.
   * @throws ApiError when the class cannot be read (404 for a class the caller is not on).
   */
  getClassStatus: (classId: string): Promise<ClassAttendanceStatus> =>
    api.get<ClassAttendanceStatus>(`/attendance/class/${classId}/status`),

  /**
   * Records one student's attendance. The server accepts one mark per student
   * per day and answers 400 to a second.
   *
   * @param payload - Exactly the fields `CreateAttendanceDto` declares.
   * @returns The stored record.
   * @throws ApiError when the request fails or the server rejects the mark.
   */
  mark: (payload: CreateAttendancePayload): Promise<MarkedAttendance> =>
    api.post<MarkedAttendance>("/attendance", payload),

  /**
   * One student's attendance figures over a term or date range.
   *
   * @param studentId - The student to read.
   * @param filter - Optional term or date-range filter.
   * @returns The student's KPIs.
   * @throws ApiError when the student cannot be read.
   */
  getStudentKpis: (studentId: string, filter: StudentKpiFilter = {}): Promise<StudentAttendanceKpis> =>
    api.get<StudentAttendanceKpis>(`/attendance/student/${studentId}/kpis`, {
      params: { termId: filter.termId, startDate: filter.startDate, endDate: filter.endDate },
    }),
};
