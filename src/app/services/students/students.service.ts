/**
 * Student reads for the teacher portal, typed against what the backend
 * actually returns (`StudentRepository.getStudentById` / `getStudentsByClass`).
 *
 * Notes on the contract that shaped the types below:
 * - `GET /students/:id` returns `{ data: [student], meta }`, and puts
 *   `dateOfBirth` and `gender` on the populated *user*, not on the student.
 * - `GET /students/by-class/:id` returns neither `gender` nor `dateOfBirth`.
 * - Neither endpoint returns `isEmailVerified`, `studentId` or `schoolName`.
 */
import { api } from "@/lib/apiClient";
import { getAllStudentsByClass, type PaginatedBody } from "@/app/services/api.service";

/** The user behind a student (or their parent), as the student endpoints populate it. */
export interface StudentUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role?: string;
  userAvatar?: string;
  /** Only `GET /students/:id` returns these two. */
  dateOfBirth?: string;
  gender?: string;
}

/** A student record as the teacher portal reads it. */
export interface StudentRecord {
  _id: string;
  userId: StudentUser;
  classId: { _id: string; name: string; gradeLevel?: string };
  parentId?: StudentUser;
  gradeLevel?: string;
  admissionNumber?: string;
  parentContact?: {
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    relationship?: string;
  };
  /** Defaults to true server-side; treat a missing value as active. */
  isActive?: boolean;
}

export const studentsService = {
  /**
   * One student's full record.
   *
   * @param id - The student id.
   * @returns The record, or `null` when the endpoint answers with an empty list.
   * @throws ApiError with `NOT_FOUND` for a student the caller may not view.
   */
  getById: async (id: string): Promise<StudentRecord | null> => {
    const body = await api.get<PaginatedBody<StudentRecord>>(`/students/${id}`);
    return body.data?.[0] ?? null;
  },

  /**
   * Every student in a class, across all pages.
   *
   * @param classId - The class.
   * @returns The whole roster.
   * @throws ApiError when any page fails; a partial roster is never returned.
   */
  listByClass: (classId: string): Promise<StudentRecord[]> => getAllStudentsByClass(classId),

  /**
   * The first few students of a class, for an avatar stack. One small page,
   * not the roster.
   *
   * @param classId - The class.
   * @param limit - How many students to fetch.
   * @returns At most `limit` students.
   * @throws ApiError when the page cannot be read.
   */
  previewByClass: async (classId: string, limit = 3): Promise<StudentRecord[]> => {
    const body = await api.get<PaginatedBody<StudentRecord>>(`/students/by-class/${classId}`, {
      params: { page: 1, limit },
    });
    return body.data ?? [];
  },
};

/**
 * Whether a student is active. The server defaults `isActive` to true, so only
 * an explicit `false` marks a student inactive.
 *
 * @param student - The record.
 * @returns True unless the student was deactivated.
 */
export function isStudentActive(student: Pick<StudentRecord, "isActive">): boolean {
  return student.isActive !== false;
}

/**
 * A student's full name.
 *
 * @param student - The record.
 * @returns "First Last", trimmed; empty when the name is missing.
 */
export function studentFullName(student: Pick<StudentRecord, "userId">): string {
  return `${student.userId?.firstName ?? ""} ${student.userId?.lastName ?? ""}`.trim();
}

/**
 * Up to two initials for an avatar.
 *
 * @param student - The record.
 * @returns Upper-case initials, or "?" when the name is missing.
 */
export function studentInitials(student: Pick<StudentRecord, "userId">): string {
  const first = student.userId?.firstName?.[0] ?? "";
  const last = student.userId?.lastName?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

/** The roster's status filter. */
export type StatusFilter = "all" | "active" | "inactive";

/**
 * Filters a roster by search text (name, email or admission number) and status.
 *
 * @param students - The roster.
 * @param query - What the teacher typed.
 * @param status - The status filter.
 * @returns The matching students, in roster order.
 */
export function filterStudents(
  students: readonly StudentRecord[],
  query: string,
  status: StatusFilter,
): StudentRecord[] {
  const needle = query.toLowerCase().trim();
  return students.filter((student) => {
    const matchesText =
      !needle ||
      studentFullName(student).toLowerCase().includes(needle) ||
      (student.userId?.email ?? "").toLowerCase().includes(needle) ||
      (student.admissionNumber ?? "").toLowerCase().includes(needle);
    const active = isStudentActive(student);
    const matchesStatus = status === "all" || (status === "active" ? active : !active);
    return matchesText && matchesStatus;
  });
}

/**
 * The roster as CSV rows for export.
 *
 * @param students - The roster.
 * @returns Header and rows for `toCsv`.
 */
export function rosterCsvRows(students: readonly StudentRecord[]): { headers: string[]; rows: string[][] } {
  return {
    headers: ["Name", "Email", "Admission No", "Status"],
    rows: students.map((student) => [
      studentFullName(student),
      student.userId?.email ?? "",
      student.admissionNumber ?? "",
      isStudentActive(student) ? "Active" : "Inactive",
    ]),
  };
}
