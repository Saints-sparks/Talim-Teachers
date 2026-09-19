/**
 * Teacher-facing REST calls that have not yet moved into a resource-specific
 * service. Every request goes through the one typed client (`api`), which
 * attaches the bearer token, refreshes it once on 401 and raises `ApiError`.
 *
 * The `token` argument every function still accepts is ignored — it is kept
 * only so the call sites written before the single client compile unchanged.
 * Drop it as each page is migrated.
 *
 * Reads that a page renders should be wrapped in a TanStack query keyed from
 * `src/lib/queryKeys.ts` rather than called on every mount; see
 * `src/hooks/academic/useCurrentTerm.ts` for the pattern that replaced the
 * hand-rolled five-minute term cache this module used to keep.
 */
import { api } from "@/lib/apiClient";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/apiError";
import { Student } from "@/types/student";
import type { CreateResourceBody, MarkAttendancePayload, UpdateResourceBody } from "@/types/apiPayloads";

/**
 * The response shape of an endpoint whose consumers have not been typed yet.
 *
 * Several of these calls are read by pages in areas still being migrated, and
 * each of those pages narrows the record to the fields it needs. Kept in one
 * named place (rather than `any` scattered through the file) so it is obvious
 * what is left to type; each becomes a real interface as its page is migrated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Untyped = any;

/** A page of records as the list endpoints return them. */
export interface PaginatedBody<T> {
  data?: T[];
  meta?: { total?: number; page?: number; lastPage?: number };
}

/** One entry of a course's weekly timetable. */
export interface CourseTimetableEntry {
  day?: string;
  startTime?: string;
  endTime?: string;
  time?: string;
  classId?: unknown;
}

/** A course (subject) as the teacher record carries it. */
export interface TeacherCourseRecord {
  _id: string;
  title?: string;
  courseCode?: string;
  description?: string;
  classId?: unknown;
  timetable?: CourseTimetableEntry[];
}

/** A class as `/classes/:id` returns it. */
export interface ClassRecord {
  _id: string;
  name?: string;
  classDescription?: string;
  classCapacity?: string | number;
  [key: string]: unknown;
}

/**
 * The teacher record behind a user. The roster fields are the ones pages read;
 * the index signature covers the rest of the document until it is typed.
 */
export interface TeacherRecord {
  _id?: string;
  assignedClasses?: unknown[];
  assignedCourses?: TeacherCourseRecord[];
  classTeacherClasses?: unknown[];
  classTeacherCourses?: TeacherCourseRecord[];
  staffNumber?: string;
  totalStudents?: number;
  [key: string]: unknown;
}

/** The school's current academic term. */
export interface CurrentTerm {
  _id: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  academicYearId?: string | { _id?: string; name?: string };
  isCurrent?: boolean;
  [key: string]: unknown;
}

/** A teaching resource uploaded by a teacher. */
export interface ResourceRecord {
  _id: string;
  title?: string;
  description?: string;
  fileUrl?: string;
  [key: string]: unknown;
}

/** One row of a class's attendance status for a date. */
export interface ClassAttendanceStudent {
  studentId?: string;
  attendanceMarked?: boolean;
  status?: string;
  [key: string]: unknown;
}

/** `/attendance/class/:id/status` response. */
export interface ClassAttendanceStatus {
  students?: ClassAttendanceStudent[];
  [key: string]: unknown;
}

/** `/attendance/student/:id/kpis` response. */
export interface StudentAttendanceKpis {
  present?: number;
  absent?: number;
  late?: number;
  attendanceRate?: number;
  [key: string]: unknown;
}

/** An assessment that is open for grading in the current term. */
export interface AssessmentRecord {
  _id: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
}

/** A weekly timetable as `/timetable/teacher/:id` returns it. */
export interface TeacherTimetable {
  _id?: string;
  entries?: CourseTimetableEntry[];
  [key: string]: unknown;
}

/** Body accepted by `POST /attendance` (`CreateAttendanceDto`), from the generated contract. */
export type AttendancePayload = MarkAttendancePayload;

/**
 * Body accepted by `POST /resources` (`CreateResourceDto`), from the generated
 * contract. It used to declare `title`/`description`/`fileUrl`, none of which
 * the DTO has, so every call built from it was a 400.
 */
export type ResourcePayload = CreateResourceBody;

/** Body accepted by `PUT /resources/:id` (`UpdateResourceDto`), from the generated contract. */
export type ResourceUpdatePayload = UpdateResourceBody;

/**
 * The classes a teacher is assigned to, each loaded in full.
 *
 * @param userId - The teacher's user id.
 * @param _token - Ignored; the client holds the session token.
 * @returns The class records, or an empty list when the roster cannot be read.
 */
export const getAssignedClasses = async (userId: string, _token?: string): Promise<ClassRecord[]> => {
  try {
    const teacher = await api.get<TeacherRecord>(`/teachers/${userId}`);
    const assignedClassIds = Array.isArray(teacher.assignedClasses) ? teacher.assignedClasses : [];
    if (assignedClassIds.length === 0) return [];

    return await Promise.all(
      assignedClassIds.map((classId) => api.get<ClassRecord>(`/classes/${String(classId)}`)),
    );
  } catch (error) {
    logger.error("api.service", "Could not load the teacher's classes", error);
    return [];
  }
};

/**
 * The courses a teacher teaches, in the shape the subject pages expect.
 *
 * @param teacherId - The teacher's user id.
 * @param _token - Ignored; the client holds the session token.
 * @returns The courses, or an empty list when the record cannot be read.
 */
export const getTeacherCourses = async (teacherId: string, _token?: string): Promise<TeacherCourseRecord[]> => {
  try {
    const teacher: TeacherRecord = await fetchTeacherDetails(teacherId);
    if (!Array.isArray(teacher.assignedCourses)) return [];

    return teacher.assignedCourses.map((course) => ({
      _id: course._id,
      title: course.title,
      courseCode: course.courseCode,
      description: course.description,
      classId: course.classId,
      timetable: course.timetable ?? [],
    }));
  } catch (error) {
    logger.error("api.service", "Could not load the teacher's courses", error);
    return [];
  }
};

/**
 * The first page of a class's students (10 records).
 *
 * @param classId - The class to read.
 * @param _token - Ignored; the client holds the session token.
 * @returns The students, or an empty list when the page cannot be read.
 */
export const getStudentsByClass = async (classId: string, _token?: string): Promise<Student[]> => {
  try {
    const body = await api.get<PaginatedBody<Student>>(`/students/by-class/${classId}`, {
      params: { page: 1, limit: 10 },
    });
    return body.data ?? [];
  } catch (error) {
    logger.error("api.service", "Could not load the class roster", error);
    return [];
  }
};

/**
 * Every student in a class, a page of 100 at a time.
 *
 * @param classId - The class to read.
 * @param _token - Ignored; the client holds the session token.
 * @returns Every student in the class.
 * @throws ApiError when a page fails; nothing partial is returned silently.
 */
export const getAllStudentsByClass = async (classId: string, _token?: string): Promise<Student[]> => {
  const limit = 100;
  const students: Student[] = [];
  for (let page = 1; page <= 20; page++) {
    const body = await api.get<PaginatedBody<Student>>(`/students/by-class/${classId}`, {
      params: { page, limit },
    });
    const data = Array.isArray(body.data) ? body.data : [];
    students.push(...data);
    const lastPage = Number(body.meta?.lastPage) || 1;
    if (data.length < limit || page >= lastPage) break;
  }
  return students;
};

/**
 * One student's full record.
 *
 * @param id - The student id.
 * @param _token - Ignored; the client holds the session token.
 * @returns The student, or `null` when the record is empty.
 * @throws Error with a user-safe message when the request fails.
 */
export const fetchStudent = async (id: string, _token?: string): Promise<Student | null> => {
  if (!id) throw new Error("Student ID is missing.");

  try {
    const body = await api.get<PaginatedBody<Student>>(`/students/${id}`);
    return body.data?.[0] ?? null;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to fetch student data."));
  }
};

/**
 * The teacher record behind a user id, with its class and course roster.
 *
 * @param id - The teacher's user id.
 * @param _token - Ignored; the client holds the session token.
 * @returns The teacher record.
 * @throws Error with a user-safe message when the request fails.
 */
export const fetchTeacherDetails = async (id: string, _token?: string): Promise<Untyped> => {
  if (!id) throw new Error("Teacher ID is missing.");

  try {
    return await api.get<TeacherRecord>(`/teachers/${id}`);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to fetch teacher data."));
  }
};

/**
 * Teaching resources — every resource in the school, or just one teacher's.
 *
 * @param _token - Ignored; the client holds the session token.
 * @param teacherId - Limit to the resources this teacher uploaded.
 * @returns The resources, or an empty list when they cannot be read.
 */
export const fetchResources = async (_token?: string, teacherId?: string): Promise<Untyped[]> => {
  try {
    const endpoint = teacherId ? `/resources/user/${teacherId}` : "/resources";
    const body = await api.get<ResourceRecord[]>(endpoint);
    return Array.isArray(body) ? body : [];
  } catch (error) {
    logger.error("api.service", "Could not load resources", error);
    return [];
  }
};

/**
 * Deletes one teaching resource.
 *
 * @param id - The resource id.
 * @param _token - Ignored; the client holds the session token.
 * @returns True when the server accepted the delete.
 */
export const deleteResource = async (id: string, _token?: string): Promise<boolean> => {
  try {
    await api.delete(`/resources/${id}`);
    return true;
  } catch (error) {
    logger.error("api.service", "Could not delete the resource", error);
    return false;
  }
};

/**
 * The school's current academic term.
 *
 * This is reference data that changes at most once a term, so render it
 * through `useCurrentTerm()` (a cached query on
 * `queryKeys.academic.currentTerm`) rather than calling this on every mount.
 *
 * @param _token - Ignored; the client holds the session token.
 * @returns The current term.
 * @throws ApiError when the term cannot be read.
 */
export const getCurrentTerm = async (_token?: string): Promise<CurrentTerm> =>
  api.get<CurrentTerm>("/academic-year-term/term/current");

/**
 * Creates a teaching resource.
 *
 * @param data - The resource to create.
 * @param _token - Ignored; the client holds the session token.
 * @returns The created resource.
 * @throws ApiError when the server rejects the payload.
 */
export const uploadResource = async (data: ResourcePayload, _token?: string): Promise<Untyped> =>
  api.post<ResourceRecord>("/resources", data);

/**
 * Creates a teaching resource.
 *
 * @param resourceData - The resource to create.
 * @param _token - Ignored; the client holds the session token.
 * @returns The created resource.
 * @throws ApiError when the server rejects the payload.
 */
export const createResource = async (resourceData: ResourcePayload, _token?: string): Promise<Untyped> =>
  api.post<ResourceRecord>("/resources", resourceData);

/**
 * Replaces a teaching resource.
 *
 * @param resourceId - The resource to update.
 * @param data - The new values.
 * @param _token - Ignored; the client holds the session token.
 * @returns The updated resource.
 * @throws ApiError when the server rejects the payload.
 */
export const updateResource = async (
  resourceId: string,
  data: ResourceUpdatePayload,
  _token?: string,
): Promise<Untyped> => api.put<ResourceRecord>(`/resources/${resourceId}`, data);

/**
 * Records one student's attendance for a day.
 *
 * @param payload - Exactly the fields `CreateAttendanceDto` declares.
 * @param _token - Ignored; the client holds the session token.
 * @returns The stored attendance record.
 * @throws ApiError when the server rejects the payload.
 */
export const submitAttendance = async (payload: AttendancePayload, _token?: string): Promise<Untyped> =>
  api.post("/attendance", payload);

/**
 * A teacher's weekly timetable.
 *
 * @param teacherId - The teacher's user id.
 * @param _token - Ignored; the client holds the session token.
 * @returns The timetable.
 * @throws ApiError when the timetable cannot be read.
 */
export const getTeacherTimetable = async (teacherId: string, _token?: string): Promise<Untyped> =>
  api.get<TeacherTimetable>(`/timetable/teacher/${teacherId}`);

/**
 * One course (subject) by its id.
 *
 * @param courseId - The course id.
 * @param _token - Ignored; the client holds the session token.
 * @returns The course.
 * @throws ApiError when the course cannot be read.
 */
export const fetchCourseById = async (courseId: string, _token?: string): Promise<Untyped> => {
  const body = await api.get<{ data: TeacherCourseRecord }>(`/courses/${courseId}`);
  return body.data;
};

/**
 * The assessments open for grading in a term.
 *
 * @param termId - The term to read.
 * @param _token - Ignored; the client holds the session token.
 * @returns The active assessments, or an empty list when they cannot be read.
 */
export const getActiveAssessmentsByTerm = async (
  termId: string,
  _token?: string,
): Promise<Untyped[]> => {
  try {
    const body = await api.get<AssessmentRecord[]>(`/assessments/term/${termId}/active`);
    return Array.isArray(body) ? body : [];
  } catch (error) {
    logger.error("api.service", "Could not load active assessments", error);
    return [];
  }
};

/**
 * Whether each student in a class has been marked for a date.
 *
 * @param classId - The class to read.
 * @param _token - Ignored; the client holds the session token.
 * @param date - ISO date; the server's today when omitted.
 * @returns The status, or `null` when it cannot be read.
 */
export const getClassAttendanceStatus = async (
  classId: string,
  _token?: string,
  date?: string,
): Promise<ClassAttendanceStatus | null> => {
  try {
    return await api.get<ClassAttendanceStatus>(`/attendance/class/${classId}/status`, {
      params: { date },
    });
  } catch (error) {
    logger.error("api.service", "Could not load the class attendance status", error);
    return null;
  }
};

/**
 * One student's attendance KPIs over a term or date range.
 *
 * @param studentId - The student to read.
 * @param _token - Ignored; the client holds the session token.
 * @param options - Term or date-range filter.
 * @param options.termId - Limit to one term.
 * @param options.startDate - Start of the range.
 * @param options.endDate - End of the range.
 * @returns The KPIs, or `null` when they cannot be read.
 */
export const getStudentAttendanceKPIs = async (
  studentId: string,
  _token?: string,
  options?: { termId?: string; startDate?: string; endDate?: string },
): Promise<StudentAttendanceKpis | null> => {
  try {
    return await api.get<StudentAttendanceKpis>(`/attendance/student/${studentId}/kpis`, {
      params: { termId: options?.termId, startDate: options?.startDate, endDate: options?.endDate },
    });
  } catch (error) {
    logger.error("api.service", "Could not load the student's attendance KPIs", error);
    return null;
  }
};

/**
 * The dashboard KPIs for one teacher.
 *
 * @param teacherId - The teacher's user id.
 * @param _token - Ignored; the client holds the session token.
 * @returns The KPI payload.
 * @throws ApiError when the KPIs cannot be read, so the caller can show an
 *   error state instead of rendering zeroes as if they were real.
 */
export const getTeacherDashboardKPIs = async <T = unknown>(teacherId: string, _token?: string): Promise<T> =>
  api.get<T>(`/teachers/${teacherId}/dashboard/kpis`);
