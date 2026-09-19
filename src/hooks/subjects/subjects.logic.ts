/**
 * Pure helpers for the subject cards: reading the course record, the schedule
 * label and the curriculum routes the card links to.
 */

/** One weekly slot of a course, as the teacher record carries it. */
export interface CourseSlot {
  day?: string;
  startTime?: string;
  endTime?: string;
  time?: string;
}

/** A course (subject) the teacher is assigned to. */
export interface SubjectCourse {
  _id: string;
  title: string;
  courseCode?: string;
  description?: string;
  classId?: string | { _id?: string; id?: string };
  timetable?: CourseSlot[];
}

/**
 * The class a course belongs to, whether the record carries the id or the
 * populated class.
 *
 * @param classId - The course's `classId` field.
 * @returns The class id, or an empty string.
 */
export function courseClassId(classId: SubjectCourse["classId"]): string {
  if (!classId) return "";
  return typeof classId === "string" ? classId : classId._id || classId.id || "";
}

/**
 * The one-line schedule under a card: the first slot, plus a count of the rest.
 *
 * @param timetable - The course's weekly slots.
 * @returns e.g. "Monday 08:00 - 09:00 +2 more", or "Schedule not set".
 */
export function timetableLabel(timetable: CourseSlot[] | undefined): string {
  if (!timetable || timetable.length === 0) return "Schedule not set";
  const first = timetable[0] || {};
  const timeRange = first.time || [first.startTime, first.endTime].filter(Boolean).join(" - ");
  const label = [first.day, timeRange].filter(Boolean).join(" ");
  if (timetable.length > 1) return `${label} +${timetable.length - 1} more`;
  return label || "Schedule not set";
}

/** What the curriculum route needs to know about the course. */
export interface CurriculumRouteCourse {
  _id: string;
  title: string;
  courseCode?: string;
}

/**
 * The editor route for writing a course's first curriculum in a term.
 *
 * @param course - The course.
 * @param termId - The term.
 * @returns The route to push.
 */
export function curriculumCreateRoute(course: CurriculumRouteCourse, termId: string): string {
  const params = new URLSearchParams({
    courseId: course._id,
    termId,
    mode: "create",
    courseTitle: course.title,
    ...(course.courseCode ? { courseCode: course.courseCode } : {}),
  });
  return `/curriculum?${params.toString()}`;
}

/**
 * The editor route for changing an existing curriculum.
 *
 * @param course - The course.
 * @param termId - The term.
 * @param curriculumId - The curriculum to edit.
 * @returns The route to push.
 */
export function curriculumEditRoute(course: CurriculumRouteCourse, termId: string, curriculumId: string): string {
  const params = new URLSearchParams({
    courseId: course._id,
    termId,
    mode: "edit",
    curriculumId,
    courseTitle: course.title,
    ...(course.courseCode ? { courseCode: course.courseCode } : {}),
  });
  return `/curriculum?${params.toString()}`;
}
