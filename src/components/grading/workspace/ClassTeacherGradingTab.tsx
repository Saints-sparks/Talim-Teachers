import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gradingWorkspaceService } from "@/app/services/grading-workspace/grading-workspace.service";
import { ScopedKpiCards } from "./ScopedKpiCards";
import { ClassPerformanceTable } from "./ClassPerformanceTable";
import { AssessmentOverviewTab } from "./AssessmentOverviewTab";
import { GenerationHistoryTab } from "./GenerationHistoryTab";
import { DetailsDrawer } from "./DetailsDrawer";
import { GenerateSummaryModal } from "./GenerateSummaryModal";
import { ValidationResultModal } from "./ValidationResultModal";
import { GenerationResult, GradeRow, ScopedKpi } from "./types";
import { useGradingStateMachine } from "./useGradingStateMachine";
import { useAuth } from "@/app/hooks/useAuth";
import { useAppContext } from "@/app/context/AppContext";

type ClassSubTab = "students" | "overview" | "history";

interface Props {
  onScopeChange: (scope: { termLabel: string; scopeLabel: string }) => void;
  registerActions: (actions: { refresh: () => void; primary: () => void; export: () => void }) => void;
}

export const ClassTeacherGradingTab: React.FC<Props> = ({ onScopeChange, registerActions }) => {
  const { getAccessToken } = useAuth();
  const { user } = useAppContext();
  const machine = useGradingStateMachine();

  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");

  const [summary, setSummary] = useState<any | null>(null);
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [overviewRows, setOverviewRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<ClassSubTab>("students");
  const [detailsRow, setDetailsRow] = useState<GradeRow | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3 | 4>(1);

  const token = getAccessToken() || "";

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
    try {
      const [assigned, termData] = await Promise.all([
        gradingWorkspaceService.getAssignedCoursesAndClasses(user.userId, token),
        gradingWorkspaceService.getTerms(token),
      ]);
      setClasses(assigned.classes || []);
      setTerms(termData || []);
      const activeTerm = termData.find((t: any) => t.isActive)?._id || termData?.[0]?._id || "";
      const activeYear = termData.find((t: any) => t._id === activeTerm)?.academicYearName || "";
      setSelectedAcademicYear((prev) => prev || activeYear || academicYears[0] || "");
      setSelectedTerm((prev) => prev || activeTerm);
      machine.dispatch({ type: "LOAD_SUCCESS" });
    } catch (e: any) {
      setError(e?.message || "Failed to load class teacher workspace");
      machine.dispatch({ type: "LOAD_ERROR" });
    }
  };

  const loadScopedData = async () => {
    if (!selectedClass || !selectedTerm || !token) return;
    machine.dispatch({ type: "LOAD" });
    setError(null);
    try {
      const [summaryData, performanceData, historyData, overviewData] = await Promise.all([
        gradingWorkspaceService.getClassSummary(selectedClass, selectedTerm, token),
        gradingWorkspaceService.getStudentsPerformance(selectedClass, selectedTerm, token),
        gradingWorkspaceService.getGenerationHistory(selectedClass, token),
        gradingWorkspaceService.getAssessmentOverview(selectedClass, selectedTerm, token),
      ]);
      setSummary(summaryData);
      setRows(performanceData);
      setHistoryRows(historyData);
      setOverviewRows(overviewData);
      machine.dispatch({ type: "LOAD_SUCCESS" });
    } catch (e: any) {
      setError(e?.message || "Failed to load class data");
      machine.dispatch({ type: "LOAD_ERROR" });
    }
  };

  useEffect(() => { loadBase(); }, [user?.userId]);
  useEffect(() => { loadScopedData(); }, [selectedClass, selectedTerm]);
  useEffect(() => {
    const classLabel = classes.find((c) => c._id === selectedClass)?.name || "";
    const termLabel = terms.find((t) => t._id === selectedTerm)?.name || "";
    onScopeChange({ termLabel, scopeLabel: classLabel });
  }, [selectedClass, selectedTerm, classes, terms]);

  const prerequisites = useMemo(() => [
    { label: "Class selected", ok: !!selectedClass, level: "failed" },
    { label: "Term selected", ok: !!selectedTerm, level: "failed" },
    { label: "Students enrolled", ok: (summary?.studentsCount || 0) > 0, level: "failed" },
    { label: "Required assessments completed", ok: (summary?.assessmentsCompleted || 0) >= (summary?.assessmentsTotal || 0) && (summary?.assessmentsTotal || 0) > 0, level: "warning" },
    { label: "Course grades available", ok: (summary?.studentsFullyGraded || 0) > 0, level: "warning" },
  ], [selectedClass, selectedTerm, summary]);

  const blockers = prerequisites.filter((p) => !p.ok && p.level === "failed").map((p) => p.label);
  const warnings = prerequisites.filter((p) => !p.ok && p.level === "warning").map((p) => p.label);

  const kpis: ScopedKpi[] = useMemo(() => [
    { id: "students", label: "Students in class", value: `${summary?.studentsCount ?? 0}` },
    { id: "assessments", label: "Assessments completed", value: `${summary?.assessmentsCompleted ?? 0}/${summary?.assessmentsTotal ?? 0}`, progress: summary?.assessmentsTotal ? ((summary?.assessmentsCompleted || 0) / summary.assessmentsTotal) * 100 : 0 },
    { id: "graded", label: "Students fully graded", value: `${summary?.studentsFullyGraded ?? 0}/${summary?.studentsTotal ?? 0}`, progress: summary?.studentsTotal ? ((summary?.studentsFullyGraded || 0) / summary.studentsTotal) * 100 : 0 },
    { id: "attention", label: "Needs attention", value: `${summary?.needsAttention ?? 0}` },
    { id: "avg", label: "Class average score", value: `${(summary?.classAverage ?? 0).toFixed(1)}%`, progress: summary?.classAverage ?? 0 },
    { id: "last", label: "Last generated", value: summary?.lastGenerated?.date ? new Date(summary.lastGenerated.date).toLocaleString() : "Unavailable", subValue: summary?.lastGenerated?.status || "Unavailable" },
  ], [summary]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesSearch = row.studentName.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "all") return true;
    if (filter === "ungraded") return row.status === "not_graded";
    if (filter === "needs_attention") return row.status === "needs_review";
    if (filter === "top") return (row.score || 0) >= 85;
    if (filter === "ready") return row.status === "ready_to_generate";
    return true;
  }), [rows, filter, search]);

  const generate = async () => {
    if (!selectedClass || !selectedTerm || blockers.length > 0) return;
    machine.dispatch({ type: "GENERATE" });
    const generation = await gradingWorkspaceService.generateClassSummary(selectedClass, selectedTerm, token);
    setResult(generation);
    setResultOpen(true);
    if (generation.status === "failed") {
      setError(generation.errors[0]?.reason || "Generation failed");
      machine.dispatch({ type: "GENERATE_ERROR" });
    } else {
      setSuccessMsg("Generate Class Summary completed.");
      machine.dispatch({ type: "GENERATE_SUCCESS" });
      await loadScopedData();
      setMobileStep(4);
    }
    setConfirmOpen(false);
  };

  const retryFailed = async () => {
    if (!result || result.failed === 0 || !selectedClass) return;
    const failedIds = result.errors.map((e) => e.studentId).filter(Boolean);
    const retryResult = await gradingWorkspaceService.retryFailedStudents(selectedClass, result.runId || "", failedIds, token);
    setResult(retryResult);
    await loadScopedData();
  };

  useEffect(() => {
    registerActions({ refresh: loadScopedData, primary: () => setConfirmOpen(true), export: () => { gradingWorkspaceService.exportPlaceholder(); } });
  }, [selectedClass, selectedTerm, blockers.length]);

  const showStep = (step: 1 | 2 | 3 | 4) => typeof window !== "undefined" && window.innerWidth < 768 ? mobileStep === step : true;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">You are reviewing cumulative class performance and generating class summaries after course grades are completed.</p>
      {successMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{successMsg}</div>}

      {showStep(1) && (
        <Card className="border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
            <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}><SelectTrigger aria-label="Academic year"><SelectValue placeholder="Academic Year" /></SelectTrigger><SelectContent>{academicYears.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}><SelectTrigger aria-label="Term"><SelectValue placeholder="Term" /></SelectTrigger><SelectContent>{filteredTerms.map((t: any) => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedClass} onValueChange={setSelectedClass}><SelectTrigger aria-label="Class"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent></Select>
            <div className="flex items-center justify-end"><Button className="bg-[#003366] hover:bg-[#002B57]" onClick={() => setConfirmOpen(true)} disabled={machine.isGenerating}>Generate Class Summary</Button></div>
          </CardContent>
        </Card>
      )}

      <Card className="border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
        <CardContent className="p-4">
          <p className="mb-2 text-sm font-medium">Prerequisites</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {prerequisites.map((item) => (
              <div key={item.label} className={`rounded-lg border p-2 text-sm ${item.ok ? "border-green-200 bg-green-50 text-green-700" : item.level === "failed" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                {item.ok ? "Passed" : item.level === "failed" ? "Failed" : "Warning"}: {item.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ScopedKpiCards data={kpis} loading={machine.isLoading} error={error} onRetry={loadScopedData} />

      {(showStep(2) || showStep(3) || showStep(4)) && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#D7E1ED] bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
            <Button variant={subTab === "students" ? "default" : "ghost"} className={subTab === "students" ? "bg-[#003366]" : ""} onClick={() => setSubTab("students")}>Student Performance</Button>
            <Button variant={subTab === "overview" ? "default" : "ghost"} className={subTab === "overview" ? "bg-[#003366]" : ""} onClick={() => setSubTab("overview")}>Assessment Overview</Button>
            <Button variant={subTab === "history" ? "default" : "ghost"} className={subTab === "history" ? "bg-[#003366]" : ""} onClick={() => setSubTab("history")}>Generation History</Button>
          </div>

          {subTab === "students" && (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row">
                <Input aria-label="Search students" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="md:w-64" aria-label="Student filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All students</SelectItem>
                    <SelectItem value="ungraded">Ungraded</SelectItem>
                    <SelectItem value="needs_attention">Needs attention (&lt;60%)</SelectItem>
                    <SelectItem value="top">Top performers</SelectItem>
                    <SelectItem value="ready">Ready to generate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ClassPerformanceTable rows={filteredRows} onViewDetails={setDetailsRow} />
            </div>
          )}

          {subTab === "overview" && <AssessmentOverviewTab rows={overviewRows} />}
          {subTab === "history" && <GenerationHistoryTab rows={historyRows} />}
        </>
      )}

      <DetailsDrawer
        open={!!detailsRow}
        onOpenChange={(open) => !open && setDetailsRow(null)}
        row={detailsRow}
        history={detailsRow ? [{ label: "Performance", score: detailsRow.score ? `${detailsRow.score.toFixed(1)}%` : "-", date: detailsRow.lastUpdated ? new Date(detailsRow.lastUpdated).toLocaleString() : "-", by: "System" }] : []}
      />

      <GenerateSummaryModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        className={classes.find((c) => c._id === selectedClass)?.name || ""}
        termName={terms.find((t) => t._id === selectedTerm)?.name || ""}
        studentCount={summary?.studentsCount || 0}
        warnings={warnings}
        blockers={blockers}
        onConfirm={generate}
        loading={machine.isGenerating}
      />

      <ValidationResultModal
        open={resultOpen}
        onOpenChange={setResultOpen}
        result={result}
        onRetryFailed={retryFailed}
      />
    </div>
  );
};
