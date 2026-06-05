import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { gradingWorkspaceService } from "@/app/services/grading-workspace/grading-workspace.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  classId: string;
  termId: string;
  token: string;
  onTermGradeGenerated?: () => void;
}

export const StudentCourseGradesModal: React.FC<Props> = ({
  open,
  onOpenChange,
  studentId,
  studentName,
  classId,
  termId,
  token,
  onTermGradeGenerated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseList, setCourseList] = useState<any[]>([]);
  const [courseGrades, setCourseGrades] = useState<any[]>([]);
  const [assessmentDetails, setAssessmentDetails] = useState<Record<string, any[]>>({});
  const [loadingAssessments, setLoadingAssessments] = useState<Record<string, boolean>>({});
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [termGrade, setTermGrade] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);

  const resolveId = (val: any): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    return val._id?.toString?.() || "";
  };

  useEffect(() => {
    if (open && studentId && classId && termId) {
      loadData();
    } else if (!open) {
      setExpandedCourse(null);
      setAssessmentDetails({});
      setGenerateMsg(null);
      setError(null);
    }
  }, [open, studentId, classId, termId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setGenerateMsg(null);
    try {
      const [courses, grades, existingTermGrade] = await Promise.all([
        gradingWorkspaceService.getClassCourseList(classId, termId, token),
        gradingWorkspaceService.getStudentCourseGrades(studentId, termId, token),
        gradingWorkspaceService.getStudentTermGrade(studentId, termId, token),
      ]);
      setCourseList(courses);
      setCourseGrades(grades);
      setTermGrade(existingTermGrade);
    } catch (e: any) {
      setError(e?.message || "Failed to load course data");
    } finally {
      setLoading(false);
    }
  };

  const loadAssessmentDetails = async (courseId: string) => {
    if (assessmentDetails[courseId] !== undefined) return;
    setLoadingAssessments((prev) => ({ ...prev, [courseId]: true }));
    try {
      const history = await gradingWorkspaceService.getStudentAssessmentHistory(
        studentId,
        courseId,
        termId,
        token,
      );
      setAssessmentDetails((prev) => ({ ...prev, [courseId]: history }));
    } catch {
      setAssessmentDetails((prev) => ({ ...prev, [courseId]: [] }));
    } finally {
      setLoadingAssessments((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const toggleCourse = (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      loadAssessmentDetails(courseId);
    }
  };

  // Build the display list from grade records (primary source) so the course name and
  // courseId always come from the populated data — no cross-source ID matching required.
  const getCourseTitle = (courseId: any): string => {
    if (!courseId) return "Unknown Course";
    if (typeof courseId === "object") return courseId.title || courseId.name || "Unknown Course";
    return "Unknown Course";
  };

  const gradedEntries = courseGrades.map((g: any) => ({
    courseId: resolveId(g.courseId),         // actual ID from the grade record
    courseName: getCourseTitle(g.courseId),  // title from populated course object
    teacherName: courseList.find(c => c.courseId === resolveId(g.courseId))?.teacherName || "",
    grade: g,
  }));

  const gradedIds = new Set(gradedEntries.map((e) => e.courseId));
  const gradedNames = new Set(gradedEntries.map((e) => e.courseName.toLowerCase()));

  // Add class-list courses that have no matching grade (neither by ID nor by name)
  const ungradedEntries = courseList
    .filter((c) => !gradedIds.has(c.courseId) && !gradedNames.has(c.courseName.toLowerCase()))
    .map((c) => ({ courseId: c.courseId, courseName: c.courseName, teacherName: c.teacherName, grade: null as any }));

  const displayCourses = [...gradedEntries, ...ungradedEntries];
  const allCoursesGraded = ungradedEntries.length === 0 && gradedEntries.length > 0;
  const ungradedCount = ungradedEntries.length;

  const handleGenerateTermGrade = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerateMsg(null);
    try {
      await gradingWorkspaceService.generateStudentTermGrade(studentId, termId, token);
      setGenerateMsg("Term grade generated successfully.");
      await loadData();
      onTermGradeGenerated?.();
    } catch (e: any) {
      setError(e?.message || "Failed to generate term grade");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{studentName} — Course Grade Review</DialogTitle>
          <p className="text-sm text-slate-500">
            Review all course grades and assessments before generating the term grade
          </p>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {/* Existing term grade banner */}
            {termGrade && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  Term Grade: {termGrade.grade}{" "}
                  <span className="font-normal">
                    ({(termGrade.percentage ?? 0).toFixed(1)}%
                    {termGrade.position ? ` · Position ${termGrade.position}` : ""})
                  </span>
                </p>
              </div>
            )}

            {generateMsg && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950">
                {generateMsg}
              </div>
            )}

            {/* Summary row */}
            <div className="flex items-center gap-4 rounded-lg border border-[#D7E1ED] bg-[#EBF0F7] px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <span className="text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-800 dark:text-slate-100">{gradedEntries.length}</span>/{displayCourses.length} courses graded
              </span>
              {!allCoursesGraded && ungradedCount > 0 && (
                <span className="text-amber-700 dark:text-amber-400">
                  {ungradedCount} still need course grades
                </span>
              )}
            </div>

            {/* Course list */}
            {displayCourses.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No courses found for this class and term.</p>
            ) : (
              displayCourses.map((course) => {
                const courseGrade = course.grade;
                const isExpanded = expandedCourse === course.courseId;
                const details = assessmentDetails[course.courseId];
                const isLoadingDetails = loadingAssessments[course.courseId];

                return (
                  <div
                    key={course.courseId}
                    className="overflow-hidden rounded-xl border border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800"
                  >
                    <button
                      className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      onClick={() => toggleCourse(course.courseId)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{course.courseName}</p>
                          <p className="text-xs text-slate-500">{course.teacherName}</p>
                        </div>
                      </div>
                      <div>
                        {courseGrade ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                            {courseGrade.gradeLevel} · {(courseGrade.percentage ?? 0).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                            Not graded
                          </span>
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[#D7E1ED] bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        {isLoadingDetails ? (
                          <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading assessments...
                          </div>
                        ) : !details || details.length === 0 ? (
                          <p className="py-2 text-sm text-slate-500">No assessment records found.</p>
                        ) : (
                          <div className="overflow-auto rounded-lg border border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
                            <table className="w-full text-xs">
                              <thead className="bg-[#EBF0F7] text-left dark:bg-slate-700">
                                <tr>
                                  <th className="p-2 font-medium">Assessment</th>
                                  <th className="p-2 text-right font-medium">Score</th>
                                  <th className="p-2 text-right font-medium">Max</th>
                                  <th className="p-2 text-right font-medium">%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {details.map((a, idx) => (
                                  <tr key={a.assessmentGradeRecordId ?? idx} className="border-t border-[#E4EAF2] dark:border-slate-700">
                                    <td className="p-2">{a.assessmentName}</td>
                                    <td className="p-2 text-right">{a.actualScore ?? "-"}</td>
                                    <td className="p-2 text-right">{a.maxScore ?? "-"}</td>
                                    <td className="p-2 text-right">
                                      {a.actualScore != null && a.maxScore
                                        ? `${((a.actualScore / a.maxScore) * 100).toFixed(1)}%`
                                        : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {courseGrade && (
                              <div className="border-t border-[#D7E1ED] bg-[#EBF0F7] p-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-700">
                                Course total: {courseGrade.cumulativeScore}/{courseGrade.maxScore} ={" "}
                                {(courseGrade.percentage ?? 0).toFixed(1)}% ({courseGrade.gradeLevel})
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Generate term grade footer */}
            {!termGrade && displayCourses.length > 0 && (
              <div className={`rounded-xl border p-4 ${allCoursesGraded ? "border-[#003366] bg-[#EBF0F7] dark:border-slate-600 dark:bg-slate-800" : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"}`}>
                {allCoursesGraded ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        All {displayCourses.length} courses graded — ready to generate term grade
                      </p>
                      <p className="text-xs text-slate-500">
                        Calculates {studentName}'s cumulative score and class position
                      </p>
                    </div>
                    <Button
                      className="shrink-0 bg-[#003366] hover:bg-[#002B57]"
                      onClick={handleGenerateTermGrade}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                      ) : (
                        "Generate Term Grade"
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-medium">Cannot generate term grade yet.</span>{" "}
                    {ungradedCount} course{ungradedCount !== 1 ? "s" : ""} still need{ungradedCount === 1 ? "s" : ""} course grades from the respective subject teachers.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
