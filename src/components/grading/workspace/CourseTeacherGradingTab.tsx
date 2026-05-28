import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gradingWorkspaceService } from "@/app/services/grading-workspace/grading-workspace.service";
import { GradeEntryTable } from "./GradeEntryTable";
import { ScopedKpiCards } from "./ScopedKpiCards";
import { DetailsDrawer } from "./DetailsDrawer";
import { GradeRow, ScopedKpi } from "./types";
import { useGradingStateMachine } from "./useGradingStateMachine";
import { useAuth } from "@/app/hooks/useAuth";
import { useAppContext } from "@/app/context/AppContext";

interface Props {
  onScopeChange: (scope: { termLabel: string; scopeLabel: string }) => void;
  registerActions: (actions: { refresh: () => void; primary: () => void; export: () => void; batch?: () => void }) => void;
}

export const CourseTeacherGradingTab: React.FC<Props> = ({ onScopeChange, registerActions }) => {
  const normalizeId = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id?.toString?.() || "";
  };

  const { getAccessToken } = useAuth();
  const { user } = useAppContext();
  const machine = useGradingStateMachine();

  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);

  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [currentTermId, setCurrentTermId] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [assessmentSearch, setAssessmentSearch] = useState("");
  const [showMaxScoreEditor, setShowMaxScoreEditor] = useState(false);
  const [maxScoreInput, setMaxScoreInput] = useState<string>("");
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3 | 4>(1);

  const [rows, setRows] = useState<GradeRow[]>([]);
  const [initialRows, setInitialRows] = useState<GradeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<GradeRow | null>(null);
  const [canBatchUpload, setCanBatchUpload] = useState(false);

  const token = getAccessToken() || "";
  const selectedCourseObj = courses.find((c) => normalizeId(c._id) === normalizeId(selectedCourse));
  const effectiveClassId = normalizeId(selectedCourseObj?.classId || selectedClass);

  const academicYears = useMemo(() => {
    const map = new Map<string, string>();
    terms.forEach((t: any) => {
      const label = t.academicYearName || (t.name?.includes("/") ? t.name.split(" ").slice(-1)[0] : "Current Academic Year");
      map.set(label, label);
    });
    return Array.from(map.values());
  }, [terms]);

  const filteredTerms = useMemo(() => {
    if (!selectedAcademicYear) return terms;
    return terms.filter((t: any) => (t.academicYearName || t.name || "").includes(selectedAcademicYear));
  }, [terms, selectedAcademicYear]);

  const loadBase = async () => {
    if (!user?.userId || !token) return;
    machine.dispatch({ type: "LOAD" });
    setError(null);
    try {
      const [assigned, termData, batchSupported] = await Promise.all([
        gradingWorkspaceService.getAssignedCoursesAndClasses(user.userId, token),
        gradingWorkspaceService.getTerms(token),
        gradingWorkspaceService.batchUploadSupported(),
      ]);
      setCourses(assigned.courses || []);
      setClasses(assigned.classes || []);
      setTerms(termData || []);
      setCanBatchUpload(batchSupported);
      const activeTerm = (termData || []).find((t: any) => t.isActive)?._id || termData?.[0]?._id || "";
      const activeYear = (termData || []).find((t: any) => t._id === activeTerm)?.academicYearName || "";
      setCurrentTermId(normalizeId(activeTerm));
      setSelectedAcademicYear((prev) => prev || activeYear || academicYears[0] || "");
      setSelectedTerm((prev) => prev || normalizeId(activeTerm));
      machine.dispatch({ type: "LOAD_SUCCESS" });
    } catch (e: any) {
      setError(e?.message || "Failed to load grading workspace");
      machine.dispatch({ type: "LOAD_ERROR" });
    }
  };

  const loadAssessments = async () => {
    if (!token || !selectedTerm) return;
    const data = await gradingWorkspaceService.getAssessmentsForScope(selectedTerm, token);
    setAssessments(Array.isArray(data) ? data : []);
  };

  const loadRows = async () => {
    if (!token || !selectedAssessment || !selectedCourse || !effectiveClassId) return;
    machine.dispatch({ type: "LOAD" });
    setError(null);
    try {
      const data = await gradingWorkspaceService.getAssessmentGradeRows({
        assessmentId: selectedAssessment,
        classId: effectiveClassId,
        courseId: selectedCourse,
        termId: selectedTerm,
        token,
      });
      setRows(data);
      setInitialRows(data);
      machine.dispatch({ type: "LOAD_SUCCESS" });
    } catch (e: any) {
      setError(e?.message || "Failed to load rows");
      machine.dispatch({ type: "LOAD_ERROR" });
    }
  };

  useEffect(() => { loadBase(); }, [user?.userId]);
  useEffect(() => { loadAssessments(); }, [selectedTerm]);
  useEffect(() => {
    setRows([]);
    setInitialRows([]);
    setError(null);
    setSuccessMsg(null);
    setSelectedAssessment("");
  }, [selectedCourse]);
  useEffect(() => {
    if (selectedCourseObj?.classId) {
      setSelectedClass(normalizeId(selectedCourseObj.classId));
    }
  }, [selectedCourseObj?.classId]);
  useEffect(() => {
    if (selectedTerm && selectedCourseObj) {
      onScopeChange({
        termLabel: terms.find((t) => t._id === selectedTerm)?.name || "",
        scopeLabel: `${selectedCourseObj.title || "Course"} • ${selectedCourseObj.className || "Class"}`,
      });
    }
  }, [selectedTerm, selectedCourse, terms, selectedCourseObj]);
  useEffect(() => { if (selectedAssessment) loadRows(); }, [selectedAssessment, selectedCourse, effectiveClassId]);

  const filteredAssessments = useMemo(() => {
    const q = assessmentSearch.toLowerCase().trim();
    if (!q) return assessments;
    return assessments.filter((a: any) => (a.name || a.title || "").toLowerCase().includes(q));
  }, [assessments, assessmentSearch]);
  useEffect(() => {
    if (!selectedCourse || !filteredAssessments.length) return;
    if (!selectedAssessment) {
      setSelectedAssessment(normalizeId(filteredAssessments[0]._id));
    }
  }, [selectedCourse, filteredAssessments, selectedAssessment]);

  const dirtyCount = useMemo(() => rows.filter((r, idx) => r.score !== initialRows[idx]?.score || r.maxScore !== initialRows[idx]?.maxScore).length, [rows, initialRows]);

  useEffect(() => {
    if (dirtyCount > 0) machine.dispatch({ type: "EDIT" });
  }, [dirtyCount]);

  const kpis: ScopedKpi[] = useMemo(() => {
    const total = rows.length;
    const graded = rows.filter((r) => typeof r.score === "number").length;
    const pending = rows.filter((r) => r.status === "needs_review").length;
    const avg = graded ? rows.reduce((sum, r) => sum + ((r.score || 0) / r.maxScore) * 100, 0) / graded : 0;
    return [
      { id: "students", label: "Students graded", value: `${graded}/${total}`, progress: total ? (graded / total) * 100 : 0 },
      { id: "assessments", label: "Assessments completed", value: selectedAssessment ? `1/${Math.max(assessments.length, 1)}` : `0/${assessments.length || 0}`, progress: assessments.length ? (selectedAssessment ? 100 / assessments.length : 0) : 0 },
      { id: "pending", label: "Pending reviews", value: `${pending}` },
      { id: "average", label: "Average score", value: graded ? `${avg.toFixed(1)}%` : "Unavailable", progress: graded ? avg : 0 },
    ];
  }, [rows, selectedAssessment, assessments.length]);

  const updateScore = (studentId: string, score: number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const safeScore = Number.isNaN(score) ? 0 : score;
        const next = Math.max(0, Math.min(safeScore, row.maxScore));
        return { ...row, score: next, status: "graded" };
      }),
    );
  };

  const applyMaxScoreToAll = () => {
    const parsed = Number(maxScoreInput);
    if (!rows.length || Number.isNaN(parsed) || parsed <= 0) return;
    const appliedMax = Math.floor(parsed);
    const changedCount = rows.filter((row) => row.maxScore !== appliedMax).length;
    setRows((prev) =>
      prev.map((row) => {
        const nextScore =
          typeof row.score === "number" ? Math.min(row.score, appliedMax) : row.score;
        return {
          ...row,
          maxScore: appliedMax,
          score: nextScore,
          status: typeof nextScore === "number" ? "graded" : row.status,
        };
      }),
    );
    setSuccessMsg(
      changedCount > 0
        ? `Applied max score ${appliedMax} to ${changedCount} student${changedCount > 1 ? "s" : ""}.`
        : `Max score is already ${appliedMax} for all students.`,
    );
    setShowMaxScoreEditor(false);
    machine.dispatch({ type: "EDIT" });
  };

  const moveNext = (studentId: string) => {
    const index = rows.findIndex((r) => r.studentId === studentId);
    if (index >= 0 && index < rows.length - 1) {
      const nextId = rows[index + 1].studentId;
      const el = document.querySelector<HTMLInputElement>(`input[aria-label=\"Score for ${rows[index + 1].studentName}\"]`);
      if (el) el.focus();
      if (!el) {
        const fallback = document.querySelectorAll<HTMLInputElement>("input[type='number']")[index + 1];
        fallback?.focus();
      }
    }
  };

  const saveAll = async () => {
    if (!selectedAssessment || !selectedCourse || !effectiveClassId || !token) return;
    const changed = rows.filter((r, idx) => r.score !== initialRows[idx]?.score && typeof r.score === "number") as Array<GradeRow & { score: number }>;
    if (!changed.length) return;
    const confirmed = window.confirm(
      `You are about to save ${changed.length} grade record${changed.length > 1 ? "s" : ""}. Continue?`,
    );
    if (!confirmed) return;

    machine.dispatch({ type: "SAVE" });
    try {
      await gradingWorkspaceService.saveAssessmentScores({
        assessmentId: selectedAssessment,
        classId: effectiveClassId,
        courseId: selectedCourse,
        token,
        rows: changed.map((row) => ({ studentId: row.studentId, score: row.score, maxScore: row.maxScore })),
      });
      await loadRows();
      setSuccessMsg("Save Changes completed successfully.");
      machine.dispatch({ type: "SAVE_SUCCESS" });
      setMobileStep(3);
    } catch (e: any) {
      setError(e?.message || "Failed to save assessment grades. Please try again.");
      machine.dispatch({ type: "SAVE_ERROR" });
    }
  };

  const isRowDirty = (studentId: string) => {
    const index = rows.findIndex((row) => row.studentId === studentId);
    if (index < 0) return false;
    const row = rows[index];
    const initial = initialRows[index];
    return row.score !== initial?.score || row.maxScore !== initial?.maxScore;
  };

  const saveSingle = async (studentId: string) => {
    if (!selectedAssessment || !selectedCourse || !effectiveClassId || !token) return;
    const index = rows.findIndex((row) => row.studentId === studentId);
    if (index < 0) return;
    const row = rows[index];
    const initial = initialRows[index];
    if (row.score === initial?.score || row.maxScore === undefined || typeof row.score !== "number") return;
    const confirmed = window.confirm(`Save grade record for ${row.studentName}?`);
    if (!confirmed) return;

    machine.dispatch({ type: "SAVE" });
    setError(null);
    try {
      await gradingWorkspaceService.saveAssessmentScores({
        assessmentId: selectedAssessment,
        classId: effectiveClassId,
        courseId: selectedCourse,
        token,
        rows: [{ studentId: row.studentId, score: row.score, maxScore: row.maxScore }],
      });
      await loadRows();
      setSuccessMsg(`Saved ${row.studentName}'s score.`);
      machine.dispatch({ type: "SAVE_SUCCESS" });
    } catch (e: any) {
      setError(e?.message || "Failed to save this student's assessment grade.");
      machine.dispatch({ type: "SAVE_ERROR" });
    }
  };

  const generateCourseGrades = async () => {
    if (!selectedCourse || !effectiveClassId || !selectedTerm || !token) return;
    machine.dispatch({ type: "GENERATE" });
    try {
      await gradingWorkspaceService.generateCourseGrades({
        classId: effectiveClassId,
        courseId: selectedCourse,
        termId: selectedTerm,
        token,
        studentIds: rows.filter((r) => typeof r.score === "number").map((r) => r.studentId),
      });
      await loadRows();
      setSuccessMsg("Generate Course Grades completed.");
      machine.dispatch({ type: "GENERATE_SUCCESS" });
      setMobileStep(4);
    } catch (e: any) {
      setError(e?.message || "Generation failed");
      machine.dispatch({ type: "GENERATE_ERROR" });
    }
  };

  useEffect(() => {
    registerActions({
      refresh: loadRows,
      primary: () => {
        if (!selectedAssessment && filteredAssessments[0]) {
          setSelectedAssessment(normalizeId(filteredAssessments[0]._id));
        }
        if (selectedAssessment) setMobileStep(2);
      },
      export: () => { gradingWorkspaceService.exportPlaceholder(); },
      batch: canBatchUpload ? () => undefined : undefined,
    });
  }, [selectedAssessment, filteredAssessments, canBatchUpload]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (machine.isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [machine.isDirty]);

  const showStep = (step: 1 | 2 | 3 | 4) => typeof window !== "undefined" && window.innerWidth < 768 ? mobileStep === step : true;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">You are grading assessments for courses assigned to you. Scores entered here are used to generate course grades for eligible students.</p>
      <div className="rounded-lg border border-[#D7E1ED] bg-[#EBF0F7] px-3 py-2 text-sm text-[#003366] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        Showing enrolled students for <span className="font-medium">{selectedCourseObj?.classId?.name || classes.find((c) => normalizeId(c._id) === selectedClass)?.name || "selected class"}</span> in current term only.
      </div>
      {successMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{successMsg}</div>}

      {showStep(1) && (
        <Card className="border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-6">
            <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear} disabled><SelectTrigger aria-label="Academic year" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Academic Year" /></SelectTrigger><SelectContent>{academicYears.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled><SelectTrigger aria-label="Term" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Term" /></SelectTrigger><SelectContent>{filteredTerms.filter((t: any) => normalizeId(t._id) === currentTermId).map((t: any) => <SelectItem key={normalizeId(t._id)} value={normalizeId(t._id)}>{t.name}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}><SelectTrigger aria-label="Course" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{courses.map((c: any) => <SelectItem key={normalizeId(c._id)} value={normalizeId(c._id)}>{c.title}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!!selectedCourse}><SelectTrigger aria-label="Class" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c: any) => <SelectItem key={normalizeId(c._id)} value={normalizeId(c._id)}>{c.name}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedAssessment} onValueChange={setSelectedAssessment}><SelectTrigger aria-label="Assessment" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Assessment" /></SelectTrigger><SelectContent>{filteredAssessments.map((a: any) => <SelectItem key={normalizeId(a._id)} value={normalizeId(a._id)}>{a.name || a.title}</SelectItem>)}</SelectContent></Select>
            <Input aria-label="Search assessments" value={assessmentSearch} onChange={(e) => setAssessmentSearch(e.target.value)} placeholder="Search assessment..." className="bg-[#0B1736] text-white placeholder:text-slate-300 border-[#29446E]" />
          </CardContent>
        </Card>
      )}

      <ScopedKpiCards data={kpis} loading={machine.isLoading} error={error} onRetry={loadRows} />

      {(showStep(2) || showStep(3) || showStep(4)) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <Card className="border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800 xl:col-span-1">
            <CardContent className="p-3">
              <p className="mb-2 text-sm font-medium">Assessments</p>
              <div className="space-y-2">
                {filteredAssessments.map((a: any) => {
                  const status = (a.status || "not_started").toLowerCase();
                  const selected = selectedAssessment === normalizeId(a._id);
                  return (
                    <button key={normalizeId(a._id)} className={`w-full rounded-lg border p-2 text-left text-sm transition-colors ${selected ? "border-[#1D4ED8] bg-[#0F1F45] text-white" : "border-[#D7E1ED] bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"}`} onClick={() => setSelectedAssessment(normalizeId(a._id))}>
                      <p className={`font-medium ${selected ? "text-white" : "text-inherit"}`}>{a.name || a.title}</p>
                      <p className={`text-xs ${selected ? "text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>{status.replace("_", " ")} • Max: {a.maxScore || "-"}</p>
                    </button>
                  );
                })}
                {filteredAssessments.length === 0 && <p className="text-sm text-slate-500">No assessments have been created for this course and term.</p>}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 xl:col-span-3">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMaxScoreEditor((prev) => !prev);
                  if (!maxScoreInput && rows.length > 0) {
                    setMaxScoreInput(String(rows[0].maxScore || 0));
                  }
                }}
              >
                Apply Max Score
              </Button>
              <Button variant="outline" onClick={saveAll} disabled={!machine.isDirty || machine.isSaving}>Save All Changes</Button>
            </div>
            {showMaxScoreEditor && (
              <Card className="border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
                <CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-end">
                  <div className="w-full md:max-w-xs">
                    <p className="mb-1 text-xs text-slate-500">Assessment max score</p>
                    <Input
                      type="number"
                      min={1}
                      value={maxScoreInput}
                      onChange={(e) => setMaxScoreInput(e.target.value)}
                      placeholder="e.g. 20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={applyMaxScoreToAll} disabled={!rows.length || !maxScoreInput || Number(maxScoreInput) <= 0}>
                      Apply
                    </Button>
                    <Button variant="outline" onClick={() => setShowMaxScoreEditor(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <GradeEntryTable
              rows={rows}
              onChangeScore={updateScore}
              onViewDetails={setDetailsRow}
              onMoveNext={moveNext}
              onSaveRow={saveSingle}
              isRowDirty={isRowDirty}
              isSaving={machine.isSaving}
            />

            <div className="sticky bottom-0 z-20 rounded-xl border border-[#003366] bg-slate-900 p-3 text-white" tabIndex={0}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm">You have {dirtyCount} unsaved changes</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setRows(initialRows)} disabled={!machine.isDirty}>Discard</Button>
                  <Button className="bg-[#003366] hover:bg-[#002B57]" onClick={saveAll} disabled={!machine.isDirty || machine.isSaving || machine.isGenerating}>Save Changes</Button>
                  <Button className="bg-[#003366] hover:bg-[#002B57]" onClick={generateCourseGrades} disabled={machine.isDirty || machine.isSaving || machine.isGenerating}>Generate Course Grades</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DetailsDrawer
        open={!!detailsRow}
        onOpenChange={(open) => !open && setDetailsRow(null)}
        row={detailsRow}
        history={detailsRow ? [{ label: "Current score", score: `${detailsRow.score ?? "-"}/${detailsRow.maxScore}`, date: detailsRow.lastUpdated ? new Date(detailsRow.lastUpdated).toLocaleString() : "-", by: "Teacher" }] : []}
      />
    </div>
  );
};
