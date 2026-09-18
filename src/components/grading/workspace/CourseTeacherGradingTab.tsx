import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  gradingWorkspaceService,
  resolveId,
} from "@/app/services/grading-workspace/grading-workspace.service";
import type { Term, Assessment } from "@/app/services/grading-workspace/types";
import { parseScoreCsv, matchScoreRows, toCsv, downloadCsv, csvFileName } from "@/app/services/grading-workspace/grade-csv";
import { getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { GradeEntryTable } from "./GradeEntryTable";
import { ScopedKpiCards } from "./ScopedKpiCards";
import { DetailsDrawer } from "./DetailsDrawer";
import { ValidationResultModal } from "./ValidationResultModal";
import { GradeRow, GenerationResult, ScopedKpi } from "./types";
import { useGradingStateMachine } from "./useGradingStateMachine";
import { useAppContext, type TeacherCourse, type TeacherClass } from "@/app/context/AppContext";

interface Props {
  onScopeChange: (scope: { termLabel: string; scopeLabel: string }) => void;
  registerActions: (actions: { refresh: () => void; primary: () => void; export: () => void; batch?: () => void }) => void;
}

export const CourseTeacherGradingTab: React.FC<Props> = ({ onScopeChange, registerActions }) => {
  const { courses, classes, isLoading: rosterLoading } = useAppContext();
  const machine = useGradingStateMachine();

  const [terms, setTerms] = useState<Term[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

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
  const [assessmentPublishStatus, setAssessmentPublishStatus] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [publishSummary, setPublishSummary] = useState<{
    message: string;
    kpis?: {
      gradedCount: number;
      totalStudents: number;
      classAverage: number;
      highestScore: number;
      lowestScore: number;
      passRate: number;
    };
  } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [alreadyPublished, setAlreadyPublished] = useState(false);
  const [publishedAssessmentIds, setPublishedAssessmentIds] = useState<Set<string>>(new Set());
  const [detailsRow, setDetailsRow] = useState<GradeRow | null>(null);
  const [canBatchUpload, setCanBatchUpload] = useState(false);
  const [batchResult, setBatchResult] = useState<GenerationResult | null>(null);
  const [batchResultOpen, setBatchResultOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCourseObj = (courses as TeacherCourse[]).find((c) => resolveId(c._id) === resolveId(selectedCourse));
  const effectiveClassId = resolveId(selectedCourseObj?.classId) || resolveId(selectedClass);

  const academicYears = useMemo(() => {
    const map = new Map<string, string>();
    terms.forEach((t) => {
      const label = t.academicYearName || (t.name?.includes("/") ? t.name.split(" ").slice(-1)[0] : "Current Academic Year");
      map.set(label, label);
    });
    return Array.from(map.values());
  }, [terms]);

  const filteredTerms = useMemo(() => {
    if (!selectedAcademicYear) return terms;
    return terms.filter((t) => (t.academicYearName || t.name || "").includes(selectedAcademicYear));
  }, [terms, selectedAcademicYear]);

  const loadBase = async () => {
    machine.dispatch({ type: "LOAD" });
    setError(null);
    try {
      const [termData, capability] = await Promise.all([
        gradingWorkspaceService.getTerms(),
        gradingWorkspaceService.getBatchUploadCapability(),
      ]);
      setTerms(termData);
      setCanBatchUpload(capability.supported);
      const activeTerm = termData.find((t) => t.isActive)?._id || termData[0]?._id || "";
      const activeYear = termData.find((t) => t._id === activeTerm)?.academicYearName || "";
      setCurrentTermId(resolveId(activeTerm));
      setSelectedAcademicYear((prev) => prev || activeYear || academicYears[0] || "");
      setSelectedTerm((prev) => prev || resolveId(activeTerm));
      machine.dispatch({ type: "LOAD_SUCCESS" });
    } catch (e) {
      setError(getErrorMessage(e, "Failed to load grading workspace"));
      machine.dispatch({ type: "LOAD_ERROR" });
    }
  };

  const loadAssessments = async () => {
    if (!selectedTerm) return;
    const data = await gradingWorkspaceService.getAssessmentsForTerm(selectedTerm);
    setAssessments(data);
  };

  const loadRows = async () => {
    if (!selectedAssessment || !selectedCourse || !effectiveClassId) return;
    machine.dispatch({ type: "LOAD" });
    setError(null);
    try {
      const data = await gradingWorkspaceService.getAssessmentGradeRows({
        assessmentId: selectedAssessment,
        classId: effectiveClassId,
        courseId: selectedCourse,
        termId: selectedTerm,
      });
      setRows(data);
      setInitialRows(data);
      machine.dispatch({ type: "LOAD_SUCCESS" });
    } catch (e) {
      setError(getErrorMessage(e, "Failed to load rows"));
      machine.dispatch({ type: "LOAD_ERROR" });
    }
  };

  const loadPublicationStatus = async () => {
    if (!selectedAssessment || !selectedCourse || !selectedTerm) return;
    try {
      const status = await gradingWorkspaceService.getPublicationStatus({
        assessmentId: selectedAssessment,
        courseId: selectedCourse,
        termId: selectedTerm,
      });
      setAlreadyPublished(status.published);
      setAssessmentPublishStatus((prev) => ({ ...prev, [selectedAssessment]: status.published }));
      if (status.published) {
        setPublishedAssessmentIds((prev) => new Set([...prev, selectedAssessment]));
        if (status.kpis) {
          setPublishSummary({ message: "Grades already published for this assessment.", kpis: status.kpis });
        }
      } else {
        setPublishSummary(null);
      }
    } catch {
      setAlreadyPublished(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadBase(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAssessments(); }, [selectedTerm]);
  useEffect(() => {
    if (assessments.length > 0 && selectedCourse && selectedTerm) {
      gradingWorkspaceService
        .getPublicationStatuses(assessments.map((a) => resolveId(a._id)), selectedCourse, selectedTerm)
        .then(setAssessmentPublishStatus);
    } else {
      setAssessmentPublishStatus({});
    }
  }, [assessments, selectedCourse, selectedTerm]);
  useEffect(() => {
    setRows([]);
    setInitialRows([]);
    setError(null);
    setSuccessMsg(null);
    setSelectedAssessment("");
    setAlreadyPublished(false);
    setPublishSummary(null);
    setAssessmentPublishStatus({});
  }, [selectedCourse]);
  useEffect(() => {
    if (selectedCourseObj?.classId) {
      setSelectedClass(resolveId(selectedCourseObj.classId));
    }
  }, [selectedCourseObj?.classId]);
  useEffect(() => {
    if (selectedTerm && selectedCourseObj) {
      onScopeChange({
        termLabel: terms.find((t) => t._id === selectedTerm)?.name || "",
        scopeLabel: `${selectedCourseObj.title || "Course"} • ${selectedCourseObj.classId?.name || "Class"}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerm, selectedCourse, terms, selectedCourseObj]);
  useEffect(() => {
    if (selectedAssessment) {
      loadRows();
      loadPublicationStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssessment, selectedCourse, effectiveClassId, selectedTerm]);

  const filteredAssessments = useMemo(() => {
    const q = assessmentSearch.toLowerCase().trim();
    if (!q) return assessments;
    return assessments.filter((a) => (a.name || a.title || "").toLowerCase().includes(q));
  }, [assessments, assessmentSearch]);
  useEffect(() => {
    if (!selectedCourse || !filteredAssessments.length) return;
    if (!selectedAssessment) {
      setSelectedAssessment(resolveId(filteredAssessments[0]._id));
    }
  }, [selectedCourse, filteredAssessments, selectedAssessment]);

  const dirtyCount = useMemo(
    () => rows.filter((r, idx) => r.score !== initialRows[idx]?.score || r.maxScore !== initialRows[idx]?.maxScore).length,
    [rows, initialRows],
  );
  const allStudentsGraded = rows.length > 0 && rows.every((row) => typeof row.score === "number");
  const allAssessmentsPublished = useMemo(
    () => assessments.length > 0 && assessments.every((a) => assessmentPublishStatus[resolveId(a._id)] === true),
    [assessments, assessmentPublishStatus],
  );
  const canPublish =
    Boolean(selectedAssessment && selectedCourse && selectedTerm && allStudentsGraded) &&
    !machine.isDirty &&
    !machine.isSaving &&
    !machine.isGenerating &&
    !isPublishing &&
    !alreadyPublished;
  const publishButtonTitle = alreadyPublished
    ? "Grades already published for this assessment."
    : !selectedAssessment
      ? "Select an assessment before publishing."
      : !allStudentsGraded
        ? "Grade every student before publishing."
        : machine.isDirty
          ? "Save changes before publishing."
          : "Publish grades and notify students and parents.";

  useEffect(() => {
    if (dirtyCount > 0) machine.dispatch({ type: "EDIT" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyCount]);

  const kpis: ScopedKpi[] = useMemo(() => {
    const total = rows.length;
    const graded = rows.filter((r) => typeof r.score === "number").length;
    const pending = rows.filter((r) => r.status === "needs_review").length;
    const avg = graded ? rows.reduce((sum, r) => sum + ((r.score || 0) / r.maxScore) * 100, 0) / graded : 0;
    return [
      { id: "students", label: "Students graded", value: `${graded}/${total}`, progress: total ? (graded / total) * 100 : 0 },
      {
        id: "assessments",
        label: "Assessments completed",
        value: selectedAssessment ? `1/${Math.max(assessments.length, 1)}` : `0/${assessments.length || 0}`,
        progress: assessments.length ? (selectedAssessment ? 100 / assessments.length : 0) : 0,
      },
      { id: "pending", label: "Pending reviews", value: `${pending}` },
      { id: "average", label: "Average score", value: graded ? `${avg.toFixed(1)}%` : "Unavailable", progress: graded ? avg : 0 },
    ];
  }, [rows, selectedAssessment, assessments.length]);

  const nameOf = (studentId: string): string | undefined => rows.find((r) => r.studentId === studentId)?.studentName;

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
        const nextScore = typeof row.score === "number" ? Math.min(row.score, appliedMax) : row.score;
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
      const el = document.querySelector<HTMLInputElement>(`input[aria-label="Score for ${rows[index + 1].studentName}"]`);
      if (el) {
        el.focus();
      } else {
        const fallback = document.querySelectorAll<HTMLInputElement>("input[type='number']")[index + 1];
        fallback?.focus();
      }
      void nextId;
    }
  };

  const saveAll = async () => {
    if (!selectedAssessment || !selectedCourse || !effectiveClassId) return;
    const changed = rows.filter(
      (r, idx) => r.score !== initialRows[idx]?.score && typeof r.score === "number",
    ) as Array<GradeRow & { score: number }>;
    if (!changed.length) return;
    const confirmed = window.confirm(
      `You are about to save ${changed.length} grade record${changed.length > 1 ? "s" : ""}. Continue?`,
    );
    if (!confirmed) return;

    machine.dispatch({ type: "SAVE" });
    try {
      const result = await gradingWorkspaceService.saveAssessmentScores({
        assessmentId: selectedAssessment,
        courseId: selectedCourse,
        rows: changed.map((row) => ({ studentId: row.studentId, score: row.score, maxScore: row.maxScore, gradeId: row.gradeId })),
        nameOf,
      });
      await loadRows();
      if (result.failures.length > 0) {
        setError(`${result.saved} saved, ${result.failures.length} failed: ${result.failures[0].reason}`);
        machine.dispatch({ type: "SAVE_ERROR" });
      } else {
        setSuccessMsg("Save Changes completed successfully.");
        machine.dispatch({ type: "SAVE_SUCCESS" });
        setMobileStep(3);
      }
    } catch (e) {
      logger.error("grading", "Saving all assessment grades failed", e);
      setError(getErrorMessage(e, "Failed to save assessment grades. Please try again."));
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
    if (!selectedAssessment || !selectedCourse || !effectiveClassId) return;
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
      const result = await gradingWorkspaceService.saveAssessmentScores({
        assessmentId: selectedAssessment,
        courseId: selectedCourse,
        rows: [{ studentId: row.studentId, score: row.score, maxScore: row.maxScore, gradeId: row.gradeId }],
        nameOf,
      });
      await loadRows();
      if (result.failures.length > 0) {
        setError(result.failures[0].reason);
        machine.dispatch({ type: "SAVE_ERROR" });
      } else {
        setSuccessMsg(`Saved ${row.studentName}'s score.`);
        machine.dispatch({ type: "SAVE_SUCCESS" });
      }
    } catch (e) {
      logger.error("grading", "Saving one assessment grade failed", e);
      setError(getErrorMessage(e, "Failed to save this student's assessment grade."));
      machine.dispatch({ type: "SAVE_ERROR" });
    }
  };

  const generateCourseGrades = async () => {
    if (!selectedCourse || !effectiveClassId || !selectedTerm) return;
    machine.dispatch({ type: "GENERATE" });
    try {
      await gradingWorkspaceService.generateCourseGrades({
        classId: effectiveClassId,
        courseId: selectedCourse,
        termId: selectedTerm,
        studentIds: rows.filter((r) => typeof r.score === "number").map((r) => r.studentId),
      });
      await loadRows();
      setSuccessMsg("Generate Course Grades completed.");
      machine.dispatch({ type: "GENERATE_SUCCESS" });
      setMobileStep(4);
    } catch (e) {
      logger.error("grading", "Generating course grades failed", e);
      setError(getErrorMessage(e, "Generation failed"));
      machine.dispatch({ type: "GENERATE_ERROR" });
    }
  };

  const publishAssessmentGrades = async () => {
    if (!selectedAssessment || !selectedCourse || !selectedTerm || !allStudentsGraded || machine.isDirty) return;
    const confirmed = window.confirm("Publish this assessment's grades to students and parents?");
    if (!confirmed) return;

    setIsPublishing(true);
    setError(null);
    setPublishSummary(null);
    try {
      const result = await gradingWorkspaceService.publishAssessmentGrades({
        assessmentId: selectedAssessment,
        courseId: selectedCourse,
        termId: selectedTerm,
      });
      const message = result.message || "Assessment grades published successfully.";
      setPublishSummary({ message, kpis: result.kpis });
      setSuccessMsg(message);
      setAlreadyPublished(true);
      setPublishedAssessmentIds((prev) => new Set([...prev, selectedAssessment]));
    } catch (e) {
      logger.error("grading", "Publishing assessment grades failed", e);
      setError(getErrorMessage(e, "Failed to publish assessment grades."));
    } finally {
      setIsPublishing(false);
    }
  };

  const exportRows = () => {
    if (!rows.length) return;
    const assessmentLabel = filteredAssessments.find((a) => resolveId(a._id) === selectedAssessment)?.name
      || filteredAssessments.find((a) => resolveId(a._id) === selectedAssessment)?.title
      || "assessment";
    const csv = toCsv(
      ["Student name", "Score", "Max score", "Percentage", "Status", "Last updated"],
      rows.map((row) => [
        row.studentName,
        row.score ?? "",
        row.maxScore,
        typeof row.score === "number" ? `${((row.score / row.maxScore) * 100).toFixed(1)}%` : "",
        row.status,
        row.lastUpdated ? new Date(row.lastUpdated).toLocaleString() : "",
      ]),
    );
    downloadCsv(csvFileName("grades", selectedCourseObj?.title, assessmentLabel), csv);
  };

  const handleBatchFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseScoreCsv(text);
      const matched = matchScoreRows(
        parsed,
        rows.map((row) => ({ studentId: row.studentId, studentName: row.studentName, maxScore: row.maxScore })),
      );
      const fileFailures = parsed.errors.map((err) => ({ studentId: "", studentName: undefined, reason: `Line ${err.line}: ${err.reason}` }));
      const allFailures = [...fileFailures, ...matched.failures];

      if (matched.scores.length === 0) {
        setBatchResult({
          status: "failed",
          successful: 0,
          failed: allFailures.length || 1,
          skipped: 0,
          errors: allFailures.length ? allFailures : [{ reason: "No matching student scores were found in this file." }],
        });
        setBatchResultOpen(true);
        return;
      }

      const result = await gradingWorkspaceService.batchUploadScores({
        assessmentId: selectedAssessment,
        courseId: selectedCourse,
        scores: matched.scores,
        nameOf,
      });
      await loadRows();
      setBatchResult({
        status: result.failures.length === 0 ? "completed" : result.saved > 0 ? "partial_failed" : "failed",
        successful: result.saved,
        failed: result.failures.length + allFailures.length,
        skipped: 0,
        errors: [...allFailures, ...result.failures],
      });
      setBatchResultOpen(true);
      if (result.saved > 0) setSuccessMsg(`Imported ${result.saved} score${result.saved > 1 ? "s" : ""}.`);
    } catch (e) {
      logger.error("grading", "Batch score upload failed", e);
      setError(getErrorMessage(e, "Failed to import scores from this file."));
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    registerActions({
      refresh: loadRows,
      primary: () => {
        if (!selectedAssessment && filteredAssessments[0]) {
          setSelectedAssessment(resolveId(filteredAssessments[0]._id));
        }
        if (selectedAssessment) setMobileStep(2);
      },
      export: exportRows,
      batch: canBatchUpload ? () => fileInputRef.current?.click() : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssessment, filteredAssessments, canBatchUpload, rows]);

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

  const showStep = (step: 1 | 2 | 3 | 4) => (typeof window !== "undefined" && window.innerWidth < 768 ? mobileStep === step : true);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleBatchFile(file);
        }}
      />
      <p className="text-sm text-slate-600 dark:text-slate-300">You are grading assessments for courses assigned to you. Scores entered here are used to generate course grades for eligible students.</p>
      <div className="rounded-lg border border-[#D7E1ED] bg-[#EBF0F7] px-3 py-2 text-sm text-[#003366] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        Showing enrolled students for <span className="font-medium">{selectedCourseObj?.classId?.name || (classes as TeacherClass[]).find((c) => resolveId(c._id) === selectedClass)?.name || "selected class"}</span> in current term only.
      </div>
      {isUploading && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">Importing scores…</div>
      )}
      {successMsg && !publishSummary?.kpis && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{successMsg}</div>
      )}
      {publishSummary?.kpis && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              ✓ Published
            </span>
            <span className="text-sm text-emerald-800 dark:text-emerald-200">{publishSummary.message}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Class avg", value: `${publishSummary.kpis.classAverage.toFixed(1)}%` },
              { label: "Pass rate", value: `${publishSummary.kpis.passRate.toFixed(1)}%` },
              { label: "Graded", value: `${publishSummary.kpis.gradedCount}/${publishSummary.kpis.totalStudents}` },
              { label: "Highest score", value: publishSummary.kpis.highestScore },
              { label: "Lowest score", value: publishSummary.kpis.lowestScore },
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
            <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear} disabled><SelectTrigger aria-label="Academic year" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Academic Year" /></SelectTrigger><SelectContent>{academicYears.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled><SelectTrigger aria-label="Term" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Term" /></SelectTrigger><SelectContent>{filteredTerms.filter((t) => resolveId(t._id) === currentTermId).map((t) => <SelectItem key={resolveId(t._id)} value={resolveId(t._id)}>{t.name}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}><SelectTrigger aria-label="Course" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{(courses as TeacherCourse[]).map((c) => <SelectItem key={resolveId(c._id)} value={resolveId(c._id)}>{c.title}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!!selectedCourse}><SelectTrigger aria-label="Class" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{(classes as TeacherClass[]).map((c) => <SelectItem key={resolveId(c._id)} value={resolveId(c._id)}>{c.name}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedAssessment} onValueChange={setSelectedAssessment}><SelectTrigger aria-label="Assessment" className="bg-[#0B1736] text-white border-[#29446E]"><SelectValue placeholder="Assessment" /></SelectTrigger><SelectContent>{filteredAssessments.map((a) => <SelectItem key={resolveId(a._id)} value={resolveId(a._id)}>{a.name || a.title}</SelectItem>)}</SelectContent></Select>
            <Input aria-label="Search assessments" value={assessmentSearch} onChange={(e) => setAssessmentSearch(e.target.value)} placeholder="Search assessment..." className="bg-[#0B1736] text-white placeholder:text-slate-300 border-[#29446E]" />
          </CardContent>
        </Card>
      )}

      <ScopedKpiCards data={kpis} loading={machine.isLoading || rosterLoading} error={error} onRetry={loadRows} />

      {(showStep(2) || showStep(3) || showStep(4)) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <Card className="border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800 xl:col-span-1">
            <CardContent className="flex flex-col gap-3 p-3">
              <p className="text-sm font-medium">Assessments</p>
              <div className="space-y-2">
                {filteredAssessments.map((a) => {
                  const status = (a.status || "not_started").toLowerCase();
                  const selected = selectedAssessment === resolveId(a._id);
                  const isPublishedItem = publishedAssessmentIds.has(resolveId(a._id));
                  return (
                    <button key={resolveId(a._id)} className={`w-full rounded-lg border p-2 text-left text-sm transition-colors ${selected ? "border-[#1D4ED8] bg-[#0F1F45] text-white" : "border-[#D7E1ED] bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"}`} onClick={() => setSelectedAssessment(resolveId(a._id))}>
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
                {filteredAssessments.length === 0 && <p className="text-sm text-slate-500">No assessments have been created for this course and term.</p>}
              </div>

              {/* Generate Course Grades — at the bottom of the assessments panel */}
              {filteredAssessments.length > 0 && (
                <div className={`mt-1 rounded-lg border p-3 ${allAssessmentsPublished ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950" : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"}`}>
                  {!allAssessmentsPublished && (
                    <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
                      {assessments.filter((a) => !assessmentPublishStatus[resolveId(a._id)]).length} unpublished — publish all before generating
                    </p>
                  )}
                  <Button
                    className="w-full bg-[#003366] hover:bg-[#002B57] disabled:opacity-50"
                    size="sm"
                    onClick={generateCourseGrades}
                    disabled={!allAssessmentsPublished || machine.isDirty || machine.isSaving || machine.isGenerating}
                    title={
                      !allAssessmentsPublished
                        ? "Publish all assessment grades before generating course grades"
                        : machine.isDirty
                          ? "Save changes before generating"
                          : "Generate course grades for all students"
                    }
                  >
                    {machine.isGenerating ? "Generating…" : "Generate Course Grades"}
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
                  <Button
                    className={alreadyPublished ? "bg-emerald-600 hover:bg-emerald-700 cursor-default" : "bg-[#1D4ED8] hover:bg-[#1E40AF]"}
                    onClick={publishAssessmentGrades}
                    disabled={!canPublish}
                    title={publishButtonTitle}
                  >
                    {isPublishing ? "Publishing…" : alreadyPublished ? "✓ Published" : "Publish Grades"}
                  </Button>
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

      <ValidationResultModal
        open={batchResultOpen}
        onOpenChange={setBatchResultOpen}
        result={batchResult}
      />
    </div>
  );
};
