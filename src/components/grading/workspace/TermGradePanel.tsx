import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorState } from "@/components/states";
import type { StudentCumulativeRecord } from "@/app/services/grading-workspace/types";

interface Props {
  studentName: string;
  /** The generated term grade, when there is one. */
  termGrade: StudentCumulativeRecord | null;
  courseCount: number;
  ungradedCount: number;
  allCoursesGraded: boolean;
  /** Whether the signed-in teacher may generate it (class teacher, or sub-admin). */
  canGenerate: boolean;
  isGenerating: boolean;
  /** What the last generation attempt threw, if it failed. */
  generateError: unknown;
  onGenerate: () => void;
}

/**
 * The generated term grade, shown at the top of the review modal.
 *
 * @param props - The generated record.
 * @param props.termGrade - The student's cumulative term record.
 * @returns The banner element.
 */
export const TermGradeBanner: React.FC<{ termGrade: StudentCumulativeRecord }> = ({ termGrade }) => (
  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950">
    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
      Term Grade: {termGrade.grade}{" "}
      <span className="font-normal">
        ({(termGrade.percentage ?? 0).toFixed(1)}%{termGrade.position ? ` · Position ${termGrade.position}` : ""})
      </span>
    </p>
  </div>
);

/**
 * The footer of the review modal that generates the term grade. Renders
 * nothing once a grade exists (see {@link TermGradeBanner}).
 *
 * Generating writes a cumulative record that teachers and students will see,
 * so it is offered only to whoever the API lets call it, asks for confirmation
 * first, and cannot be clicked again while it runs.
 *
 * @param props - See {@link Props}.
 * @param props.studentName - Named in the confirmation.
 * @param props.termGrade - The generated grade, or `null`.
 * @param props.courseCount - Courses of the class.
 * @param props.ungradedCount - Courses the student has no grade in yet.
 * @param props.allCoursesGraded - Whether every course has a grade.
 * @param props.canGenerate - Whether this teacher may generate the grade.
 * @param props.isGenerating - True while generation runs.
 * @param props.generateError - The last failure, if any.
 * @param props.onGenerate - Starts generation (after confirmation).
 * @returns The panel, or nothing when there is a grade or no courses.
 */
export const TermGradePanel: React.FC<Props> = ({
  studentName,
  termGrade,
  courseCount,
  ungradedCount,
  allCoursesGraded,
  canGenerate,
  isGenerating,
  generateError,
  onGenerate,
}) => {
  const [confirming, setConfirming] = useState(false);

  if (termGrade || courseCount === 0) return null;

  if (!allCoursesGraded) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <span className="font-medium">Cannot generate term grade yet.</span> {ungradedCount} course
          {ungradedCount !== 1 ? "s" : ""} still need{ungradedCount === 1 ? "s" : ""} course grades from the respective
          subject teachers.
        </p>
      </div>
    );
  }

  const confirm = () => {
    setConfirming(false);
    onGenerate();
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#003366] bg-[#EBF0F7] p-4 dark:border-slate-600 dark:bg-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            All {courseCount} courses graded — ready to generate term grade
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {canGenerate
              ? `Calculates ${studentName}'s cumulative score and class position`
              : "Only the class teacher can generate a student's term grade."}
          </p>
        </div>
        {canGenerate && !confirming && (
          <Button
            className="shrink-0 bg-[#003366] hover:bg-[#002B57] dark:text-white"
            onClick={() => setConfirming(true)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Term Grade"
            )}
          </Button>
        )}
      </div>

      {canGenerate && confirming && (
        <div
          role="alertdialog"
          aria-label="Confirm term grade generation"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950"
        >
          <p className="text-sm text-amber-900 dark:text-amber-200">
            This saves {studentName}&apos;s term grade and class position. Teachers and students will see it. Generate it now?
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              className="bg-[#003366] hover:bg-[#002B57] dark:text-white"
              size="sm"
              onClick={confirm}
              disabled={isGenerating}
            >
              Yes, generate
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {Boolean(generateError) && (
        <ApiErrorState
          error={generateError}
          fallback="We couldn't generate the term grade."
          onRetry={() => setConfirming(true)}
        />
      )}
    </div>
  );
};
