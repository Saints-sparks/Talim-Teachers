/**
 * Who may write curricula and resources, mirroring `CurriculumController.writerOf`
 * and `ResourceService.assertMayWrite` in `talimBE-V2`.
 *
 * The API lets a teacher change a record they wrote, or one belonging to a
 * course they teach, and lets school staff change any record when they hold
 * `manage:curriculum`. This portal admits teachers and teachers promoted to
 * sub-admin. The session carries no permission list, so a sub-admin is shown
 * the controls and the API's own `FORBIDDEN` answers when the permission is
 * missing (the pages surface that message). Everything else is enforced here so
 * the UI never offers a teacher a write the API will refuse.
 */

/** Role names the API puts on the signed-in user. */
export type WriterRole = "teacher" | "school_sub_admin" | string;

/** A teacher's link to a course or record, in whichever form the API stored it. */
type IdLike = string | { _id?: string; id?: string } | null | undefined;

/**
 * Normalises a populated-or-bare id.
 *
 * @param value - An id string, a populated document, or nothing.
 * @returns The id, or an empty string.
 */
export function idOf(value: IdLike): string {
  if (!value) return "";
  return typeof value === "string" ? value : (value._id ?? value.id ?? "");
}

/** Everything the access rules need to know about the signed-in user. */
export interface WriterContext {
  role: WriterRole | undefined;
  /** The user's id, and their teacher-profile id when they have one. */
  ownIds: string[];
  /** Ids of the courses the teacher teaches; `null` while the roster is still loading. */
  taughtCourseIds: string[] | null;
}

/**
 * Whether the user may create a record for a course.
 *
 * @param writer - The signed-in user.
 * @param courseId - The course the record belongs to.
 * @returns True for staff, and for teachers who teach the course.
 */
export function canWriteForCourse(writer: WriterContext, courseId: string): boolean {
  if (writer.role === "school_sub_admin") return true;
  if (writer.role !== "teacher") return false;
  if (!writer.taughtCourseIds || !courseId) return false;
  return writer.taughtCourseIds.includes(courseId);
}

/**
 * Whether the user may edit or delete an existing record.
 *
 * @param writer - The signed-in user.
 * @param record - The record's owner and course.
 * @param record.ownerId - The uploader / author, populated or bare.
 * @param record.courseId - The course, populated or bare.
 * @returns True for staff, for the author, and for teachers of the record's course.
 */
export function canWriteRecord(writer: WriterContext, record: { ownerId?: IdLike; courseId?: IdLike }): boolean {
  if (writer.role === "school_sub_admin") return true;
  if (writer.role !== "teacher") return false;
  const owner = idOf(record.ownerId);
  if (owner && writer.ownIds.includes(owner)) return true;
  return canWriteForCourse(writer, idOf(record.courseId));
}
