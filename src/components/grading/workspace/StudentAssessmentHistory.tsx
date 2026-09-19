import React from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { CourseGradeRecord, StudentAssessmentHistoryRow } from "@/app/services/grading-workspace/types";
import { ApiErrorState } from "@/components/states";

interface Props {
  /** The lazily-loaded assessments of the expanded course. */
  history: UseQueryResult<StudentAssessmentHistoryRow[], unknown>;
  /** The student's grade for the course, shown as the total when there is one. */
  courseGrade: CourseGradeRecord | null;
}

const percent = (score: number | null, max: number | null): string =>
  score != null && max ? `${((score / max) * 100).toFixed(1)}%` : "-";

/**
 * The student's assessment scores for one course, under its row in the review
 * modal. Owns its own loading, error (keyed on `error.code`) and empty states,
 * so a failed read here never looks like "no records".
 *
 * @param props - See {@link Props}.
 * @param props.history - The lazily-loaded assessments of the expanded course.
 * @param props.courseGrade - The student's grade for the course, if any.
 * @returns The assessments panel.
 */
export const StudentAssessmentHistory: React.FC<Props> = ({ history, courseGrade }) => {
  const rows = history.data ?? [];

  return (
    <div className="border-t border-[#D7E1ED] bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      {history.isPending ? (
        <div role="status" className="flex items-center gap-2 py-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading assessments...
        </div>
      ) : history.isError ? (
        <ApiErrorState
          error={history.error}
          fallback="We couldn't load this course's assessments."
          onRetry={() => void history.refetch()}
        />
      ) : rows.length === 0 ? (
        <p className="py-2 text-sm text-slate-500 dark:text-slate-400">No assessment records found.</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-xs text-slate-800 dark:text-slate-100">
            <thead className="bg-[#EBF0F7] text-left dark:bg-slate-700">
              <tr>
                <th className="p-2 font-medium">Assessment</th>
                <th className="p-2 text-right font-medium">Score</th>
                <th className="p-2 text-right font-medium">Max</th>
                <th className="p-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.assessmentGradeRecordId ?? index} className="border-t border-[#E4EAF2] dark:border-slate-700">
                  <td className="p-2">{row.assessmentName}</td>
                  <td className="p-2 text-right">{row.actualScore ?? "-"}</td>
                  <td className="p-2 text-right">{row.maxScore ?? "-"}</td>
                  <td className="p-2 text-right">{percent(row.actualScore, row.maxScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {courseGrade && (
            <div className="border-t border-[#D7E1ED] bg-[#EBF0F7] p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100">
              Course total: {courseGrade.cumulativeScore}/{courseGrade.maxScore} = {(courseGrade.percentage ?? 0).toFixed(1)}% (
              {courseGrade.gradeLevel})
            </div>
          )}
        </div>
      )}
    </div>
  );
};
