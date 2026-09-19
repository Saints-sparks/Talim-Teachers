/**
 * All state and effects behind {@link CourseTeacherGradingTab}: scope
 * selection (year/term/course/assessment), score entry, save, publish,
 * course-grade generation, and CSV import/export. Kept separate from the
 * component so the screen file stays JSX and this stays testable logic.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  gradingWorkspaceService,
  resolveId,
} from "@/app/services/grading-workspace/grading-workspace.service";
import type { Assessment, PublicationKpis, Term } from "@/app/services/grading-workspace/types";
import { downloadCsv, csvFileName, matchScoreRows, parseScoreCsv, toCsv } from "@/app/services/grading-workspace/grade-csv";
import { getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { useAppContext, type TeacherClass, type TeacherCourse } from "@/app/context/AppContext";
import { GenerationResult, GradeRow, ScopedKpi } from "@/components/grading/workspace/types";
import { useGradingStateMachine } from "@/components/grading/workspace/useGradingStateMachine";

/** Registered with the page shell so its header buttons drive this tab. */
export interface CourseGradingActions {
  refresh: () => void;
  primary: () => void;
  export: () => void;
  batch?: () => void;
}

/** Everything {@link CourseTeacherGradingTab} needs to render. */
export function useCourseGradingWorkspace(
  onScopeChange: (scope: { termLabel: string; scopeLabel: string }) => void,
  registerActions: (actions: CourseGradingActions) => void,
) {
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
  const [publishSummary, setPublishSummary] = useState<{ message: string; kpis?: PublicationKpis } | null>(null);
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
      const el = document.querySelector<HTMLInputElement>(`input[aria-label="Score for ${rows[index + 1].studentName}"]`);
      if (el) {
        el.focus();
      } else {
        const fallback = document.querySelectorAll<HTMLInputElement>("input[type='number']")[index + 1];
        fallback?.focus();
      }
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

  const discardChanges = () => setRows(initialRows);

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
    const assessmentLabel =
      filteredAssessments.find((a) => resolveId(a._id) === selectedAssessment)?.name ||
      filteredAssessments.find((a) => resolveId(a._id) === selectedAssessment)?.title ||
      "assessment";
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

  return {
    // roster / scope
    courses: courses as TeacherCourse[],
    classes: classes as TeacherClass[],
    rosterLoading,
    terms,
    assessments,
    filteredAssessments,
    academicYears,
    filteredTerms,
    selectedAcademicYear,
    setSelectedAcademicYear,
    selectedTerm,
    setSelectedTerm,
    currentTermId,
    selectedCourse,
    setSelectedCourse,
    selectedClass,
    setSelectedClass,
    selectedAssessment,
    setSelectedAssessment,
    selectedCourseObj,
    assessmentSearch,
    setAssessmentSearch,
    // score entry
    rows,
    kpis,
    refresh: loadRows,
    machine,
    dirtyCount,
    allAssessmentsPublished,
    assessmentPublishStatus,
    publishedAssessmentIds,
    showMaxScoreEditor,
    setShowMaxScoreEditor,
    maxScoreInput,
    setMaxScoreInput,
    applyMaxScoreToAll,
    updateScore,
    moveNext,
    isRowDirty,
    saveAll,
    saveSingle,
    discardChanges,
    generateCourseGrades,
    // publish
    canPublish,
    publishButtonTitle,
    isPublishing,
    alreadyPublished,
    publishAssessmentGrades,
    publishSummary,
    // messages
    error,
    successMsg,
    // details drawer
    detailsRow,
    setDetailsRow,
    // batch upload / export
    canBatchUpload,
    isUploading,
    batchResult,
    batchResultOpen,
    setBatchResultOpen,
    fileInputRef,
    handleBatchFile,
    // paging
    mobileStep,
  };
}
