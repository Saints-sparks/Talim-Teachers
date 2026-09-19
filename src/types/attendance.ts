/**
 * Attendance contract, mirrored from `talimBE-V2/src/modules/user/data/dtos/attendance.dto.ts`.
 * The API runs `whitelist + forbidNonWhitelisted`, so anything sent must be a
 * field these types declare.
 */

/** Every status the API accepts on `CreateAttendanceDto.status`. */
export const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "Excused"] as const;

/** One attendance status, exactly as the API spells it. */
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** The two statuses a teacher can choose on the marking screen. */
export type MarkableStatus = Extract<AttendanceStatus, "Present" | "Absent">;

/** Body of `POST /attendance` (`CreateAttendanceDto`). */
export interface CreateAttendancePayload {
  /** Student document id (Mongo id). */
  studentId: string;
  /** Class document id (Mongo id). */
  classId: string;
  /** ISO timestamp; the server buckets it to the start of the day. */
  date: string;
  status: AttendanceStatus;
  /** The current term's id (Mongo id). */
  termId: string;
  /** Required by the server when `status` is `Absent`. */
  absenceReason?: string;
}

/** The record `POST /attendance` returns once stored. */
export interface MarkedAttendance {
  _id: string;
  studentId: string;
  classId: string;
  termId: string;
  status: AttendanceStatus;
  date: string;
  recordedBy?: string;
  absenceReason?: string;
}

/** One roster row of `GET /attendance/class/:classId/status` (`StudentAttendanceStatusDto`). */
export interface StudentAttendanceStatus {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  userAvatar?: string;
  attendanceMarked: boolean;
  attendanceStatus?: AttendanceStatus;
  absenceReason?: string;
  recordedBy?: { id: string; name: string };
  /** ISO timestamp of when the mark was stored. */
  recordedAt?: string;
}

/** `GET /attendance/class/:classId/status` (`ClassAttendanceStatusDto`). */
export interface ClassAttendanceStatus {
  classId: string;
  className: string;
  date: string;
  totalStudents: number;
  attendanceMarked: number;
  attendanceNotMarked: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  students: StudentAttendanceStatus[];
}

/** Counters the attendance screens display, always derived from the roster. */
export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  marked: number;
  pending: number;
}

/** `GET /attendance/student/:studentId/kpis` (`StudentAttendanceKpiDto`). */
export interface StudentAttendanceKpis {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  userAvatar?: string;
  classInfo?: { id: string; name: string };
  /** Percentage, 0-100. */
  attendanceRate: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  dateRange?: { startDate: string; endDate: string };
  termInfo?: { id: string; name: string };
}

/** Query filter for the KPI endpoint; every field is optional. */
export interface StudentKpiFilter {
  termId?: string;
  /** `YYYY-MM-DD`. */
  startDate?: string;
  /** `YYYY-MM-DD`. */
  endDate?: string;
}
