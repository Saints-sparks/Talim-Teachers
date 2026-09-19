import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiErrorState, EmptyState, LoadingState } from "@/components/states";
import { toast } from "@/components/CustomToast";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useStudentCourseGrades } from "@/hooks/grading/useStudentCourseGrades";
import { useCanGenerateTermGrade } from "@/hooks/grading/useCanGenerateTermGrade";
import { CourseGradeRow } from "./CourseGradeRow";
import { TermGradeBanner, TermGradePanel } from "./TermGradePanel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  classId: string;
  termId: string;
  /** Called after a term grade has been generated, so the class list can refresh. */
  onTermGradeGenerated?: () => void;
}

/**
 * Reviews one student's course grades and assessments before their term grade
 * is generated. A thin shell: data and the generate mutation come from
 * {@link useStudentCourseGrades}; rows and the term-grade footer are their own
 * components.
 *
 * @param props - See {@link Props}.
 * @param props.open - Whether the modal is showing.
 * @param props.onOpenChange - Called when the modal asks to open or close.
 * @param props.studentId - The student under review.
 * @param props.studentName - Shown in the title and the confirmation.
 * @param props.classId - The student's class.
 * @param props.termId - The term under review.
 * @param props.onTermGradeGenerated - Called after a term grade was generated.
 * @returns The modal element.
 */
export const StudentCourseGradesModal: React.FC<Props> = ({
  open,
  onOpenChange,
  studentId,
  studentName,
  classId,
  termId,
  onTermGradeGenerated,
}) => {
  useBodyScrollLock(open);
  const canGenerate = useCanGenerateTermGrade(classId);
  const data = useStudentCourseGrades({
    studentId,
    classId,
    termId,
    enabled: open,
    onGenerated: () => {
      toast.success(`Term grade generated for ${studentName}.`);
      onTermGradeGenerated?.();
    },
  });

  // Closing mid-write would hide the outcome of a change that is still going through.
  const handleOpenChange = (next: boolean) => {
    if (!next && data.generate.isPending) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-[#D7E1ED] bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-base text-slate-900 dark:text-slate-100">{studentName} — Course Grade Review</DialogTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review all course grades and assessments before generating the term grade
          </p>
        </DialogHeader>

        {data.isLoading ? (
          <LoadingState message="Loading course grades…" />
        ) : data.isError ? (
          <ApiErrorState error={data.error} fallback="We couldn't load this student's course grades." onRetry={data.refetch} />
        ) : (
          <div className="space-y-3">
            {data.termGrade && <TermGradeBanner termGrade={data.termGrade} />}

            <div className="flex items-center gap-4 rounded-lg border border-[#D7E1ED] bg-[#EBF0F7] px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <span className="text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-800 dark:text-slate-100">{data.gradedCount}</span>/{data.courses.length} courses
                graded
              </span>
              {!data.allCoursesGraded && data.ungradedCount > 0 && (
                <span className="text-amber-700 dark:text-amber-400">{data.ungradedCount} still need course grades</span>
              )}
            </div>

            {data.courses.length === 0 ? (
              <EmptyState title="No courses" message="No courses found for this class and term." />
            ) : (
              data.courses.map((course) => (
                <CourseGradeRow
                  key={course.courseId}
                  course={course}
                  expanded={data.expandedCourseId === course.courseId}
                  onToggle={data.toggleCourse}
                  history={data.history}
                />
              ))
            )}

            <TermGradePanel
              studentName={studentName}
              termGrade={data.termGrade}
              courseCount={data.courses.length}
              ungradedCount={data.ungradedCount}
              allCoursesGraded={data.allCoursesGraded}
              canGenerate={canGenerate}
              isGenerating={data.generate.isPending}
              generateError={data.generate.error}
              onGenerate={data.generate.run}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
