"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TermPicker } from "@/components/tl/TermPicker";
import { card, cardTitle, chip, ghostButton, pagePad, pageTitle, primaryButton, segment } from "@/components/tl/styles";
import { useMyClasses } from "@/hooks/attendance/useRegister";
import { parseScore, type AssessmentDraft, type ScoreDrafts } from "@/hooks/grading/grading.logic";
import { useCourseSheet, useReadiness } from "@/hooks/grading/useGrading";
import { useTeacherPreferences } from "@/hooks/settings/useTeacherSettings";
import { useSchoolNow, useTeacherToday } from "@/hooks/today/useTeacherToday";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { getErrorMessage } from "@/lib/apiError";
import { ClassReport, type ReportTab } from "./ClassReport";
import { CourseScores, TERM_TOTAL, type GradingCourseOption } from "./CourseScores";

/** What the address asks for (`?courseId=&assessmentId=` or `?mode=class&classId=`, plus `termId`). */
export interface GradingLink {
  courseId?: string;
  /** An assessment id, or `total` for the Term total. */
  assessmentId?: string;
  mode?: "course" | "class";
  classId?: string;
  termId?: string;
  tab?: ReportTab;
}

/** The two modes of the page. */
export type GradingMode = "course" | "class";

/**
 * The address for the page's state, so a reload or a shared link lands in
 * the same place.
 *
 * @param state - Mode, course, assessment, class, tab and term.
 * @returns `/grading?…`.
 */
export function gradingHref(state: GradingLink & { mode: GradingMode }): string {
  const params = new URLSearchParams();
  if (state.mode === "class") {
    params.set("mode", "class");
    if (state.classId) params.set("classId", state.classId);
    if (state.tab && state.tab !== "subjects") params.set("tab", state.tab);
  } else {
    if (state.courseId) params.set("courseId", state.courseId);
    if (state.assessmentId) params.set("assessmentId", state.assessmentId);
  }
  if (state.termId) params.set("termId", state.termId);
  const query = params.toString();
  return query ? `/grading?${query}` : "/grading";
}

/** The message on leaving with unsaved scores. */
const LEAVE_MESSAGE = "You have unsaved scores. Leave this page and lose them?";

/**
 * Grey blocks while the page's first data loads.
 *
 * @returns The skeleton.
 */
function PageSkeleton() {
  return (
    <div className="flex flex-col gap-[18px]" role="status" aria-label="Loading grading">
      <div className="flex gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-11 w-44 animate-pulse rounded-xl bg-tl-line/70" />
        ))}
      </div>
      <div className="h-[460px] animate-pulse rounded-[22px] bg-tl-line/70" />
    </div>
  );
}

/**
 * The redesigned Grading page. "Subject scores" enters, saves, publishes and
 * unlocks the scores of the subjects the teacher teaches, one assessment (or
 * the Term total) at a time. "Class report · {class}", for class teachers
 * only, shows which colleagues have published, the broadsheet and the
 * remarks. The mode starts from the teacher's `teaching.gradingView`
 * preference unless the address says otherwise, and the address follows the
 * page. Unsaved scores survive switching subject, assessment, mode or term;
 * leaving the page with some asks first.
 *
 * @param props - What the address asks for.
 * @param props.link - The parsed query string.
 * @returns The page.
 */
export function GradingScreen({ link }: { link: GradingLink }) {
  const router = useRouter();
  const classes = useMyClasses();
  const { preferences, isLoading: preferencesLoading } = useTeacherPreferences();
  const today = useTeacherToday();
  const nowMs = useSchoolNow(today.data?.now, today.dataUpdatedAt);
  const timezone = today.data?.timezone ?? "Africa/Lagos";

  const [mode, setMode] = useState<GradingMode | undefined>(link.mode ?? (link.courseId ? "course" : undefined));
  const [courseId, setCourseId] = useState<string | undefined>(link.courseId);
  const [view, setView] = useState<string | undefined>(link.assessmentId);
  const [classId, setClassId] = useState<string | undefined>(link.classId);
  const [tab, setTab] = useState<ReportTab>(link.tab ?? "subjects");
  const [termId, setTermId] = useState<string | undefined>(link.termId);
  const [drafts, setDrafts] = useState<ScoreDrafts>({});

  // A link followed while the page is open (Today's attention list, a readiness "Open") moves the page with it.
  useEffect(() => {
    if (link.mode) setMode(link.mode);
    else if (link.courseId) setMode("course");
    if (link.courseId) setCourseId(link.courseId);
    if (link.assessmentId) setView(link.assessmentId);
    if (link.classId) setClassId(link.classId);
    if (link.tab) setTab(link.tab);
    if (link.termId) setTermId(link.termId);
  }, [link.mode, link.courseId, link.assessmentId, link.classId, link.tab, link.termId]);

  const courses = useMemo<GradingCourseOption[]>(
    () =>
      (classes.data ?? []).flatMap((c) =>
        c.courses.map((k) => ({ courseId: k.id, code: k.code, title: k.title, classId: c.id, className: c.name, studentCount: c.studentCount })),
      ),
    [classes.data],
  );
  const myCourseIds = useMemo(() => new Set(courses.map((c) => c.courseId)), [courses]);
  const reportClasses = useMemo(() => (classes.data ?? []).filter((c) => c.role === "class_teacher"), [classes.data]);

  const preferred = preferences.teaching?.gradingView === "class" ? "class" : "course";
  // Without a mode in the address, wait for the preference rather than flash the other mode.
  const resolving = mode === undefined && preferencesLoading;
  const wanted: GradingMode = mode ?? preferred;
  // The class report is only for class teachers; a link that asks for it still opens it (and says why it is empty).
  const activeMode: GradingMode = wanted === "class" && (reportClasses.length > 0 || link.mode === "class") ? "class" : "course";
  const activeCourseId = courseId ?? courses[0]?.courseId;
  const activeClassId = classId ?? reportClasses[0]?.id;
  const activeClass = (classes.data ?? []).find((c) => c.id === activeClassId);

  // The sheet (course mode) or the readiness (class mode) says which term "current" is.
  const sheet = useCourseSheet(!resolving && activeMode === "course" ? activeCourseId : undefined, termId);
  const readiness = useReadiness(!resolving && activeMode === "class" && activeClass?.role === "class_teacher" ? activeClassId : undefined, termId);
  const shownTerm = activeMode === "course" ? sheet.data?.term : readiness.data?.term;
  const [currentTerm, setCurrentTerm] = useState<{ id: string; name: string } | undefined>(undefined);
  useEffect(() => {
    if (!termId && shownTerm) setCurrentTerm(shownTerm);
  }, [termId, shownTerm]);

  const hasDrafts = Object.values(drafts).some((d) => d && Object.keys(d).length > 0);
  useUnsavedChangesGuard(hasDrafts, LEAVE_MESSAGE);

  // Keep the address in step with the page.
  useEffect(() => {
    if (classes.isPending || resolving || typeof window === "undefined") return;
    const target = gradingHref({ mode: activeMode, courseId: activeCourseId, assessmentId: view, classId: activeClassId, tab, termId });
    if (`${window.location.pathname}${window.location.search}` !== target) router.replace(target, { scroll: false });
  }, [classes.isPending, resolving, activeMode, activeCourseId, view, activeClassId, tab, termId, router]);

  const onCell = useCallback((key: string, studentId: string, text: string, saved: number | null, max: number) => {
    setDrafts((current) => {
      const draft: AssessmentDraft = { ...(current[key] ?? {}) };
      const parsed = parseScore(text, max);
      const same = (parsed.kind === "empty" && saved === null) || (parsed.kind === "valid" && parsed.value === saved);
      if (same) delete draft[studentId];
      else draft[studentId] = text;
      const next = { ...current };
      if (Object.keys(draft).length) next[key] = draft;
      else delete next[key];
      return next;
    });
  }, []);

  const onDraft = useCallback((key: string, draft: AssessmentDraft | undefined) => {
    setDrafts((current) => {
      const next = { ...current };
      if (draft && Object.keys(draft).length) next[key] = draft;
      else delete next[key];
      return next;
    });
  }, []);

  const pickMode = (next: GradingMode) => setMode(next);

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3.5" data-print-hide>
      <div>
        <h1 className={pageTitle}>Grading</h1>
        <p className="mt-[5px] text-[15px] text-tl-muted">Enter scores, save as you go, publish when a class is complete.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <TermPicker
          id="grading-term"
          value={termId}
          currentTermId={currentTerm?.id}
          currentTermName={currentTerm?.name ?? shownTerm?.name}
          onChange={setTermId}
          guide="grading-term"
        />
        {reportClasses.length > 0 || link.mode === "class" ? (
          <div className="flex gap-2 rounded-2xl border border-tl-line bg-tl-surface p-[5px]" role="group" aria-label="Grading view" data-guide="grading-mode-switch">
            <button type="button" aria-pressed={activeMode === "course"} className={segment(activeMode === "course")} onClick={() => pickMode("course")} title="Enter scores for the subjects you teach">
              Subject scores
            </button>
            <button
              type="button"
              aria-pressed={activeMode === "class"}
              className={segment(activeMode === "class")}
              onClick={() => pickMode("class")}
              title="Compile the report as class teacher"
            >
              Class report{activeClass && activeClass.role === "class_teacher" ? ` · ${activeClass.name}` : reportClasses[0] ? ` · ${reportClasses[0].name}` : ""}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  let body: React.ReactNode;
  if (classes.isPending || resolving) {
    body = <PageSkeleton />;
  } else if (classes.isError && !classes.data) {
    body = (
      <div className={card} role="alert">
        <h2 className={cardTitle}>We could not load your classes</h2>
        <p className="mt-1.5 text-sm text-tl-muted">{getErrorMessage(classes.error, "Check your connection and try again.")}</p>
        <button type="button" className={`${primaryButton} mt-4`} onClick={() => void classes.refetch()}>
          Try again
        </button>
      </div>
    );
  } else if (courses.length === 0 && reportClasses.length === 0 && !link.courseId && link.mode !== "class") {
    body = (
      <section className={card}>
        <h2 className={cardTitle}>Nothing to grade yet</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
          When the school office assigns you a subject, its assessments show here. If you are made a class teacher, the class report shows here too.
        </p>
      </section>
    );
  } else if (activeMode === "class") {
    if (!activeClassId || (activeClass && activeClass.role !== "class_teacher") || reportClasses.length === 0) {
      body = (
        <div className={card} role="alert">
          <h2 className={cardTitle}>Only the class teacher compiles the class report</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
            {activeClass ? `You are not the class teacher of ${activeClass.name}.` : "You are not a class teacher this term."} Your subject scores are still open to you.
          </p>
          <button type="button" className={`${ghostButton} mt-4`} onClick={() => pickMode("course")}>
            Open subject scores
          </button>
        </div>
      );
    } else {
      body = (
        <div className="flex flex-col gap-[18px]">
          {reportClasses.length > 1 ? (
            <div className="flex flex-wrap gap-2.5" role="group" aria-label="Class" data-print-hide data-guide="grading-class-picker">
              {reportClasses.map((c) => (
                <button key={c.id} type="button" aria-pressed={c.id === activeClassId} className={chip(c.id === activeClassId)} onClick={() => setClassId(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}
          <ClassReport
            classId={activeClassId}
            className={activeClass?.name ?? ""}
            termId={termId}
            tab={tab}
            onTab={setTab}
            myCourseIds={myCourseIds}
            onOpenCourse={(id, assessmentId) => {
              setMode("course");
              setCourseId(id);
              setView(assessmentId);
            }}
            nowMs={nowMs}
            timezone={timezone}
          />
        </div>
      );
    }
  } else {
    body = (
      <CourseScores
        courses={courses}
        courseId={activeCourseId}
        onCourse={(id) => {
          setCourseId(id);
          setView(undefined);
        }}
        view={view}
        onView={setView}
        termId={termId}
        drafts={drafts}
        onCell={onCell}
        onDraft={onDraft}
        nowMs={nowMs}
        timezone={timezone}
      />
    );
  }

  return (
    <div className={`${pagePad} flex flex-col gap-[18px]`}>
      {header}
      {body}
    </div>
  );
}

export { TERM_TOTAL };
