/**
 * Pure logic behind the student course-grade review: merging the class's
 * course list with a student's grade records, and deciding who may generate a
 * term grade. Kept free of React so it can be tested directly.
 */
import { resolveId } from "@/app/services/grading-workspace/grading-workspace.service";
import type { AssessmentOverviewRow, CourseGradeRecord } from "@/app/services/grading-workspace/types";

/** One course of the class, with the student's grade for it when there is one. */
export interface DisplayCourse {
  courseId: string;
  courseName: string;
  teacherName: string;
  grade: CourseGradeRecord | null;
}

/** The merged course list and the counts the review screen shows. */
export interface CourseReview {
  courses: DisplayCourse[];
  gradedCount: number;
  ungradedCount: number;
  /** True when the student has a grade in every course and at least one exists. */
  allCoursesGraded: boolean;
}

const normalize = (value: string | undefined): string => (value ?? "").trim().toLowerCase();

/**
 * The title a grade record carries for its course, when the course was
 * populated rather than sent as a bare id.
 *
 * @param course - `CourseGradeRecord.courseId`.
 * @returns The title, or an empty string.
 */
function populatedTitle(course: CourseGradeRecord["courseId"]): string {
  if (!course || typeof course !== "object") return "";
  return course.title || course.courseName || "";
}

/**
 * Merges the class's courses with the student's course grades.
 *
 * A grade record can carry a raw or a populated course ref, and either may be
 * stale, so each grade is matched against the class course list (built from
 * the assessment overview, which always has a clean id and name) by id, then by
 * name, before falling back to the record's own fields. Courses of the class
 * with no matching grade follow, marked ungraded.
 *
 * @param courseList - The class's courses for the term.
 * @param grades - The student's course grade records for the term.
 * @returns The courses to display and how many are graded.
 */
export function buildCourseReview(courseList: AssessmentOverviewRow[], grades: CourseGradeRecord[]): CourseReview {
  const byId = new Map(courseList.map((course) => [course.courseId, course] as const));

  const resolveListEntry = (courseId: string, courseName: string): AssessmentOverviewRow | undefined => {
    if (courseId && byId.has(courseId)) return byId.get(courseId);
    if (courseName) return courseList.find((course) => normalize(course.courseName) === normalize(courseName));
    if (!courseId && courseList.length === 1) return courseList[0];
    return undefined;
  };

  const graded: DisplayCourse[] = grades.map((grade) => {
    const rawId = resolveId(grade.courseId);
    const rawName = populatedTitle(grade.courseId);
    const match = resolveListEntry(rawId, rawName) ?? (!rawId && courseList.length === 1 ? courseList[0] : undefined);
    const courseId = match?.courseId || rawId;
    const courseName = match?.courseName || rawName;

    return {
      courseId: courseId || resolveId(grade._id),
      courseName: courseName || "Unknown Course",
      teacherName: match?.teacherName || "",
      grade,
    };
  });

  const gradedIds = new Set(graded.map((entry) => entry.courseId).filter(Boolean));
  const gradedNames = new Set(graded.map((entry) => normalize(entry.courseName)));

  const ungraded: DisplayCourse[] = courseList
    .filter((course) => !gradedIds.has(course.courseId) && !gradedNames.has(normalize(course.courseName)))
    .map((course) => ({
      courseId: course.courseId,
      courseName: course.courseName || "Unknown Course",
      teacherName: course.teacherName || "",
      grade: null,
    }));

  return {
    courses: [...graded, ...ungraded],
    gradedCount: graded.length,
    ungradedCount: ungraded.length,
    allCoursesGraded: ungraded.length === 0 && graded.length > 0,
  };
}

/** What {@link canGenerateTermGrade} needs to know about the signed-in teacher. */
export interface TermGradeAccessInput {
  /** The signed-in user's role, e.g. `teacher` or `school_sub_admin`. */
  role: string | undefined;
  /** The class the term grade is for. */
  classId: string;
  /** Ids of the classes the teacher is class teacher of. */
  classTeacherClassIds: string[];
}

/**
 * Whether the signed-in teacher may generate a student's term grade.
 *
 * `POST /grade-records/student-cumulative-term-grade-records/calculate/…`
 * authorises the caller against the student's class: school admins and
 * sub-admins holding `manage:assessments` may act on any class of their
 * school; everyone else must be that class's class teacher. This portal only
 * admits teachers and sub-admins, and the sub-admin's permission list is not
 * visible to the client, so a sub-admin is offered the action and the server
 * has the final say (a 403 is shown as such). A teacher is offered it only for
 * a class they are the class teacher of.
 *
 * @param input - See {@link TermGradeAccessInput}.
 * @returns True when the action should be offered.
 */
export function canGenerateTermGrade({ role, classId, classTeacherClassIds }: TermGradeAccessInput): boolean {
  if (role === "school_sub_admin") return true;
  return Boolean(classId) && classTeacherClassIds.includes(classId);
}
