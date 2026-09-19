import React from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { StudentAssessmentHistoryRow } from "@/app/services/grading-workspace/types";
import type { DisplayCourse } from "@/hooks/grading/studentCourseGrades.helpers";
import { StudentAssessmentHistory } from "./StudentAssessmentHistory";

interface Props {
  course: DisplayCourse;
  expanded: boolean;
  onToggle: (courseId: string) => void;
  /** The assessments query; only read while the row is expanded. */
  history: UseQueryResult<StudentAssessmentHistoryRow[], unknown>;
}

/**
 * One course in the review list: its name, teacher and the student's grade
 * (or "Not graded"), expanding to the student's assessments for it.
 *
 * @param props - See {@link Props}.
 * @param props.course - The course and the student's grade for it.
 * @param props.expanded - Whether the assessments are open.
 * @param props.onToggle - Opens or closes the assessments.
 * @param props.history - The assessments query, read only while expanded.
 * @returns The row element.
 */
export const CourseGradeRow: React.FC<Props> = ({ course, expanded, onToggle, history }) => {
  const grade = course.grade;

  return (
    <div className="overflow-hidden rounded-xl border border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
        onClick={() => onToggle(course.courseId)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{course.courseName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{course.teacherName}</p>
          </div>
        </div>
        {grade ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            {grade.gradeLevel} · {(grade.percentage ?? 0).toFixed(1)}%
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            Not graded
          </span>
        )}
      </button>

      {expanded && <StudentAssessmentHistory history={history} courseGrade={grade} />}
    </div>
  );
};
