import { buildCourseReview, canGenerateTermGrade } from "@/hooks/grading/studentCourseGrades.helpers";
import type { AssessmentOverviewRow, CourseGradeRecord } from "@/app/services/grading-workspace/types";

const row = (courseId: string, courseName: string, teacherName = "T"): AssessmentOverviewRow => ({
  courseId,
  courseName,
  teacherName,
  requiredAssessments: 1,
  completedAssessments: 1,
  missingGrades: 0,
  status: "complete",
});

const grade = (id: string, courseId: CourseGradeRecord["courseId"]): CourseGradeRecord => ({
  _id: id,
  courseId,
  studentId: "s1",
  gradeLevel: "B",
  cumulativeScore: 70,
  maxScore: 100,
  percentage: 70,
});

describe("buildCourseReview", () => {
  const classCourses = [row("c1", "Maths", "Mr A"), row("c2", "English", "Mrs B")];

  it("matches a grade to its class course by id, taking the clean name and teacher", () => {
    const review = buildCourseReview(classCourses, [grade("g1", { _id: "c1", title: "maths (old)" })]);

    expect(review.courses[0]).toMatchObject({ courseId: "c1", courseName: "Maths", teacherName: "Mr A" });
  });

  it("falls back to matching by name when the record carries no usable id", () => {
    const review = buildCourseReview(classCourses, [grade("g2", { title: "  ENGLISH " })]);

    expect(review.courses[0]).toMatchObject({ courseId: "c2", courseName: "English" });
    expect(review.courses).toHaveLength(2);
  });

  it("lists the class courses the student has no grade in as ungraded", () => {
    const review = buildCourseReview(classCourses, [grade("g1", "c1")]);

    expect(review.gradedCount).toBe(1);
    expect(review.ungradedCount).toBe(1);
    expect(review.allCoursesGraded).toBe(false);
    expect(review.courses[1]).toMatchObject({ courseId: "c2", grade: null });
  });

  it("is all graded only when every course has a grade", () => {
    const review = buildCourseReview(classCourses, [grade("g1", "c1"), grade("g2", "c2")]);
    expect(review.allCoursesGraded).toBe(true);
  });

  it("is not 'all graded' when there is nothing at all", () => {
    expect(buildCourseReview([], []).allCoursesGraded).toBe(false);
  });

  it("names a grade for a course outside the class list 'Unknown Course' rather than dropping it", () => {
    const review = buildCourseReview(classCourses, [grade("g9", "zzz")]);

    expect(review.courses[0]).toMatchObject({ courseId: "zzz", courseName: "Unknown Course" });
  });

  it("assumes the only course of the class when the record names none", () => {
    const review = buildCourseReview([row("c1", "Maths", "Mr A")], [grade("g1", null)]);

    expect(review.courses).toHaveLength(1);
    expect(review.courses[0]).toMatchObject({ courseId: "c1", teacherName: "Mr A" });
  });
});

describe("canGenerateTermGrade", () => {
  it("lets a teacher generate only for a class they are class teacher of", () => {
    expect(canGenerateTermGrade({ role: "teacher", classId: "k1", classTeacherClassIds: ["k1"] })).toBe(true);
    expect(canGenerateTermGrade({ role: "teacher", classId: "k2", classTeacherClassIds: ["k1"] })).toBe(false);
    expect(canGenerateTermGrade({ role: "teacher", classId: "k1", classTeacherClassIds: [] })).toBe(false);
  });

  it("offers a sub-admin the action, leaving the permission check to the server", () => {
    expect(canGenerateTermGrade({ role: "school_sub_admin", classId: "k9", classTeacherClassIds: [] })).toBe(true);
  });

  it("never offers it without a class", () => {
    expect(canGenerateTermGrade({ role: "teacher", classId: "", classTeacherClassIds: [""] })).toBe(false);
  });

  it("does not offer it to an unknown role", () => {
    expect(canGenerateTermGrade({ role: undefined, classId: "k1", classTeacherClassIds: [] })).toBe(false);
  });
});
