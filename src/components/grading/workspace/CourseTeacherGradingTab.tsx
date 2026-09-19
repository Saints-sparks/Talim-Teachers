import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolveId } from "@/app/services/grading-workspace/grading-workspace.service";
import { useCourseGradingWorkspace, type CourseGradingActions } from "@/hooks/grading/useCourseGradingWorkspace";
import { GradeEntryTable } from "./GradeEntryTable";
import { ScopedKpiCards } from "./ScopedKpiCards";
import { DetailsDrawer } from "./DetailsDrawer";
import { ValidationResultModal } from "./ValidationResultModal";

interface Props {
  onScopeChange: (scope: { termLabel: string; scopeLabel: string }) => void;
  registerActions: (actions: CourseGradingActions) => void;
}

/**
 * The course-teacher grading tab: pick a course, term and assessment, enter
 * or import scores, then publish. All state and API calls live in
 * {@link useCourseGradingWorkspace}; this component is the view over it.
 *
 * @param props - See {@link Props}.
 * @param props.onScopeChange - Reports the current term/scope label to the page shell.
 * @param props.registerActions - Wires the shell's header buttons to this tab.
 * @returns The tab element.
 */
export const CourseTeacherGradingTab: React.FC<Props> = ({ onScopeChange, registerActions }) => {
  const w = useCourseGradingWorkspace(onScopeChange, registerActions);
  const showStep = (step: 1 | 2 | 3 | 4) =>
    typeof window !== "undefined" && window.innerWidth < 768 ? w.mobileStep === step : true;

  return (
    <div className="space-y-4">
      <input
        ref={w.fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) w.handleBatchFile(file);
        }}
      />
      <p className="text-sm text-slate-600 dark:text-slate-300">You are grading assessments for courses assigned to you. Scores entered here are used to generate course grades for eligible students.</p>
      <div className="rounded-lg border border-[#D7E1ED] bg-[#EBF0F7] px-3 py-2 text-sm text-[#003366] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        Showing enrolled students for <span className="font-medium">{w.selectedCourseObj?.classId?.name || w.classes.find((c) => resolveId(c._id) === w.selectedClass)?.name || "selected class"}</span> in current term only.
      </div>
      {w.isUploading && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">Importing scores…</div>
      )}
      {w.successMsg && !w.publishSummary?.kpis && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{w.successMsg}</div>
      )}
      {w.publishSummary?.kpis && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              ✓ Published
            </span>
            <span className="text-sm text-emerald-800 dark:text-emerald-200">{w.publishSummary.message}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Class avg", value: `${w.publishSummary.kpis.classAverage.toFixed(1)}%` },
              { label: "Pass rate", value: `${w.publishSummary.kpis.passRate.toFixed(1)}%` },
              { label: "Graded", value: `${w.publishSummary.kpis.gradedCount}/${w.publishSummary.kpis.totalStudents}` },
              { label: "Highest score", value: w.publishSummary.kpis.highestScore },
              { label: "Lowest score", value: w.publishSummary.kpis.lowestScore },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-white px-3 py-2 dark:bg-slate-800">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showStep(1) && (
        <Card className="border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-6">
            <Select value={w.selectedAcademicYear} onValueChange={w.setSelectedAcademicYear} disabled><SelectTrigger aria-label="Academic year" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Academic Year" /></SelectTrigger><SelectContent>{w.academicYears.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select>
            <Select value={w.selectedTerm} onValueChange={w.setSelectedTerm} disabled><SelectTrigger aria-label="Term" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Term" /></SelectTrigger><SelectContent>{w.filteredTerms.filter((t) => resolveId(t._id) === w.currentTermId).map((t) => <SelectItem key={resolveId(t._id)} value={resolveId(t._id)}>{t.name}</SelectItem>)}</SelectContent></Select>
            <Select value={w.selectedCourse} onValueChange={w.setSelectedCourse}><SelectTrigger aria-label="Course" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{w.courses.map((c) => <SelectItem key={resolveId(c._id)} value={resolveId(c._id)}>{c.title}</SelectItem>)}</SelectContent></Select>
            <Select value={w.selectedClass} onValueChange={w.setSelectedClass} disabled={!!w.selectedCourse}><SelectTrigger aria-label="Class" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{w.classes.map((c) => <SelectItem key={resolveId(c._id)} value={resolveId(c._id)}>{c.name}</SelectItem>)}</SelectContent></Select>
            <Select value={w.selectedAssessment} onValueChange={w.setSelectedAssessment}><SelectTrigger aria-label="Assessment" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Assessment" /></SelectTrigger><SelectContent>{w.filteredAssessments.map((a) => <SelectItem key={resolveId(a._id)} value={resolveId(a._id)}>{a.name || a.title}</SelectItem>)}</SelectContent></Select>
            <Input aria-label="Search assessments" value={w.assessmentSearch} onChange={(e) => w.setAssessmentSearch(e.target.value)} placeholder="Search assessment..." className="bg-[#0B1736] text-white placeholder:text-slate-300 border-[#29446E]" />
          </CardContent>
        </Card>
      )}

      <ScopedKpiCards
        data={w.kpis}
        loading={w.machine.isLoading || w.rosterLoading}
        error={w.error}
        onRetry={w.refresh}
      />

      {(showStep(2) || showStep(3) || showStep(4)) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <Card className="border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800 xl:col-span-1">
            <CardContent className="flex flex-col gap-3 p-3">
              <p className="text-sm font-medium">Assessments</p>
              <div className="space-y-2">
                {w.filteredAssessments.map((a) => {
                  const status = (a.status || "not_started").toLowerCase();
                  const selected = w.selectedAssessment === resolveId(a._id);
                  const isPublishedItem = w.publishedAssessmentIds.has(resolveId(a._id));
                  return (
                    <button key={resolveId(a._id)} className={`w-full rounded-lg border p-2 text-left text-sm transition-colors ${selected ? "border-[#1D4ED8] bg-[#0F1F45] text-white" : "border-[#D7E1ED] bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"}`} onClick={() => w.setSelectedAssessment(resolveId(a._id))}>
                      <div className="flex items-start justify-between gap-1">
                        <p className={`font-medium ${selected ? "text-white" : "text-inherit"}`}>{a.name || a.title}</p>
                        {isPublishedItem && (
                          <span className="shrink-0 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Published
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${selected ? "text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>{status.replace("_", " ")} • Max: {a.maxScore || "-"}</p>
                    </button>
                  );
                })}
                {w.filteredAssessments.length === 0 && <p className="text-sm text-slate-500">No assessments have been created for this course and term.</p>}
              </div>

              {w.filteredAssessments.length > 0 && (
                <div className={`mt-1 rounded-lg border p-3 ${w.allAssessmentsPublished ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950" : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"}`}>
                  {!w.allAssessmentsPublished && (
                    <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
                      {w.assessments.filter((a) => !w.assessmentPublishStatus[resolveId(a._id)]).length} unpublished — publish all before generating
                    </p>
                  )}
                  <Button
                    className="w-full bg-[#003366] hover:bg-[#002B57] disabled:opacity-50"
                    size="sm"
                    onClick={w.generateCourseGrades}
                    disabled={!w.allAssessmentsPublished || w.machine.isDirty || w.machine.isSaving || w.machine.isGenerating}
                    title={
                      !w.allAssessmentsPublished
                        ? "Publish all assessment grades before generating course grades"
                        : w.machine.isDirty
                          ? "Save changes before generating"
                          : "Generate course grades for all students"
                    }
                  >
                    {w.machine.isGenerating ? "Generating…" : "Generate Course Grades"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4 xl:col-span-3">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  w.setShowMaxScoreEditor(!w.showMaxScoreEditor);
                  if (!w.maxScoreInput && w.rows.length > 0) {
                    w.setMaxScoreInput(String(w.rows[0].maxScore || 0));
                  }
                }}
              >
                Apply Max Score
              </Button>
              <Button variant="outline" onClick={w.saveAll} disabled={!w.machine.isDirty || w.machine.isSaving}>Save All Changes</Button>
            </div>
            {w.showMaxScoreEditor && (
              <Card className="border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
                <CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-end">
                  <div className="w-full md:max-w-xs">
                    <p className="mb-1 text-xs text-slate-500">Assessment max score</p>
                    <Input
                      type="number"
                      min={1}
                      value={w.maxScoreInput}
                      onChange={(e) => w.setMaxScoreInput(e.target.value)}
                      placeholder="e.g. 20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={w.applyMaxScoreToAll} disabled={!w.rows.length || !w.maxScoreInput || Number(w.maxScoreInput) <= 0}>
                      Apply
                    </Button>
                    <Button variant="outline" onClick={() => w.setShowMaxScoreEditor(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <GradeEntryTable
              rows={w.rows}
              onChangeScore={w.updateScore}
              onViewDetails={w.setDetailsRow}
              onMoveNext={w.moveNext}
              onSaveRow={w.saveSingle}
              isRowDirty={w.isRowDirty}
              isSaving={w.machine.isSaving}
            />

            <div className="sticky bottom-0 z-20 rounded-xl border border-[#003366] bg-slate-900 p-3 text-white" tabIndex={0}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm">You have {w.dirtyCount} unsaved changes</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={w.discardChanges} disabled={!w.machine.isDirty}>Discard</Button>
                  <Button className="bg-[#003366] hover:bg-[#002B57]" onClick={w.saveAll} disabled={!w.machine.isDirty || w.machine.isSaving || w.machine.isGenerating}>Save Changes</Button>
                  <Button
                    className={w.alreadyPublished ? "bg-emerald-600 hover:bg-emerald-700 cursor-default" : "bg-[#1D4ED8] hover:bg-[#1E40AF]"}
                    onClick={w.publishAssessmentGrades}
                    disabled={!w.canPublish}
                    title={w.publishButtonTitle}
                  >
                    {w.isPublishing ? "Publishing…" : w.alreadyPublished ? "✓ Published" : "Publish Grades"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DetailsDrawer
        open={!!w.detailsRow}
        onOpenChange={(open) => !open && w.setDetailsRow(null)}
        row={w.detailsRow}
        history={w.detailsRow ? [{ label: "Current score", score: `${w.detailsRow.score ?? "-"}/${w.detailsRow.maxScore}`, date: w.detailsRow.lastUpdated ? new Date(w.detailsRow.lastUpdated).toLocaleString() : "-", by: "Teacher" }] : []}
      />

      <ValidationResultModal
        open={w.batchResultOpen}
        onOpenChange={w.setBatchResultOpen}
        result={w.batchResult}
      />
    </div>
  );
};
