"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/CustomToast";
import { ConfirmSheet } from "@/components/tl/ConfirmSheet";
import { StatTile } from "@/components/tl/StatTile";
import { card, cardTitle, chip, fieldLabel, focusRing, ghostButton, pill, pillTone, primaryButton } from "@/components/tl/styles";
import { downloadCsv } from "@/app/services/grading-workspace/grade-csv";
import { assessmentCsv, importScoresCsv, termTotalCsv } from "@/hooks/grading/grading.csv";
import {
  assessmentStatusLine,
  assessmentTab,
  assessmentTiles,
  badCount,
  canPublish,
  draftChanges,
  draftKey,
  isDirty,
  isLocked,
  isLockedError,
  liveTotals,
  missingScoresFromError,
  pruneDraft,
  publishedMessage,
  termTotalStatusLine,
  termTotalTab,
  termTotalTiles,
  type AssessmentDraft,
  type AssessmentTab,
  type ScoreDrafts,
  type StatusLine,
} from "@/hooks/grading/grading.logic";
import { useCourseSheet, usePublishScores, useSaveScores, useUnlockScores } from "@/hooks/grading/useGrading";
import { ApiError, getErrorMessage } from "@/lib/apiError";
import type { CourseGradingSheet, GradingAssessment } from "@/types/grading";
import { AssessmentScoreTable, TermTotalTable } from "./ScoreTables";

/** A course the teacher grades, as the chips list it. */
export interface GradingCourseOption {
  courseId: string;
  code: string;
  title: string;
  classId: string;
  className: string;
  studentCount: number;
}

/** The Term total view's id in `view` (and in `?assessmentId=`). */
export const TERM_TOTAL = "total";

/** Props for {@link CourseScores}. */
export interface CourseScoresProps {
  courses: readonly GradingCourseOption[];
  courseId: string | undefined;
  onCourse: (courseId: string) => void;
  /** An assessment id, {@link TERM_TOTAL}, or undefined for the default. */
  view: string | undefined;
  onView: (view: string) => void;
  termId: string | undefined;
  drafts: ScoreDrafts;
  /** Sets one cell's unsaved text (the owner drops it when it matches what is saved). */
  onCell: (key: string, studentId: string, text: string, saved: number | null, max: number) => void;
  /** Replaces one assessment's unsaved text (after a save, an import or a lock). */
  onDraft: (key: string, draft: AssessmentDraft | undefined) => void;
  nowMs: number;
  timezone: string;
}

const LINE_TONE: Record<StatusLine["tone"], string> = {
  success: "text-tl-success",
  danger: "text-tl-danger",
  warning: "text-tl-warning",
  muted: "text-tl-muted",
  accent: "text-tl-accent",
};

/**
 * The assessment the page opens on: the one asked for, else the first not
 * yet published, else the first.
 *
 * @param sheet - The sheet.
 * @param view - What was asked for.
 * @returns An assessment id or {@link TERM_TOTAL}.
 */
export function resolveView(sheet: CourseGradingSheet, view: string | undefined): string {
  if (view === TERM_TOTAL) return TERM_TOTAL;
  if (view && sheet.assessments.some((a) => a.id === view)) return view;
  return (sheet.assessments.find((a) => a.status !== "published") ?? sheet.assessments[0])?.id ?? TERM_TOTAL;
}

/**
 * Why a sheet could not be shown: another teacher's course (403) or one that
 * does not exist (404) is final; anything else can be retried.
 *
 * @param props - The error and a retry.
 * @param props.error - The query's error.
 * @param props.onRetry - Refetches.
 * @returns The alert card.
 */
function SheetLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const status = error instanceof ApiError ? error.status : 0;
  const title = status === 403 ? "Not one of your subjects" : status === 404 ? "Subject not found" : "We could not load these scores";
  const text =
    status === 403
      ? "You don't teach this subject, so its scores are not available to you. Pick one of your subjects above."
      : status === 404
        ? "There is no subject with this link in your school. Pick one of your subjects above."
        : getErrorMessage(error, "Check your connection and try again.");
  return (
    <div className={card} role="alert">
      <h2 className={cardTitle}>{title}</h2>
      <p className="mt-1.5 text-sm text-tl-muted">{text}</p>
      {status !== 403 && status !== 404 ? (
        <button type="button" className={`${primaryButton} mt-4`} onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

/**
 * A file's text (`File.text()`, else a FileReader for older browsers).
 *
 * @param file - The file the teacher picked.
 * @returns Its contents.
 */
function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Grey blocks while a sheet loads.
 *
 * @returns The skeleton.
 */
export function SheetSkeleton() {
  return (
    <div className="flex flex-col gap-[18px]" role="status" aria-label="Loading scores">
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[76px] animate-pulse rounded-[18px] bg-tl-line/70" />
        ))}
      </div>
      <div className="h-[420px] animate-pulse rounded-[22px] bg-tl-line/70" />
    </div>
  );
}

/**
 * An assessment tab (or the Term total), as the design's cards.
 *
 * @param props - The tab and whether it is selected.
 * @param props.tab - Name, meta and status.
 * @param props.on - Selected.
 * @param props.dirty - Has unsaved changes.
 * @param props.onPick - Selects it.
 * @param props.tip - Hover text.
 * @returns The button.
 */
function TabCard({ tab, on, dirty, onPick, tip }: { tab: AssessmentTab; on: boolean; dirty: boolean; onPick: () => void; tip: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      title={tip}
      className={`min-h-[44px] rounded-[18px] border bg-tl-surface px-4 py-3.5 text-left ${focusRing} ${on ? "border-tl-brand ring-1 ring-tl-brand" : "border-tl-line hover:border-tl-control"}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-base font-extrabold text-tl-ink">
          {tab.name}
          {dirty ? (
            <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-tl-warning align-middle" title="Unsaved changes">
              <span className="sr-only">(unsaved changes)</span>
            </span>
          ) : null}
        </span>
        <span className={`${pill} ${pillTone[tab.status.tone]}`}>{tab.status.label}</span>
      </span>
      <span className="mt-1.5 block text-[13px] text-tl-muted">{tab.meta}</span>
    </button>
  );
}

/**
 * "Subject scores": course chips, assessment tabs plus the Term total, the
 * five stat tiles and the score sheet with Save draft, Publish (with its
 * confirm), Unlock to correct, and CSV export and import.
 *
 * @param props - See {@link CourseScoresProps}.
 * @returns The mode's content.
 */
export function CourseScores({ courses, courseId, onCourse, view, onView, termId, drafts, onCell, onDraft, nowMs, timezone }: CourseScoresProps) {
  const query = useCourseSheet(courseId, termId);
  const sheet = query.data;
  const save = useSaveScores();
  const publish = usePublishScores();
  const unlock = useUnlockScores();
  const [confirm, setConfirm] = useState<null | "publish" | "unlock">(null);
  const [reason, setReason] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  // Pin the assessment the page opened on, so publishing it does not jump to the next one.
  useEffect(() => {
    if (sheet && view === undefined && sheet.assessments.length) onView(resolveView(sheet, undefined));
  }, [sheet, view, onView]);

  const termOf = sheet?.term.id ?? termId ?? "current";
  const draftsById = useMemo(() => {
    const out: Record<string, AssessmentDraft | undefined> = {};
    if (sheet) for (const a of sheet.assessments) out[a.id] = drafts[draftKey(termOf, sheet.course.id, a.id)];
    return out;
  }, [sheet, drafts, termOf]);
  const totals = useMemo(() => (sheet ? liveTotals(sheet, draftsById) : []), [sheet, draftsById]);

  const chips = (
    <div className="flex flex-wrap gap-2.5" role="group" aria-label="Subject" data-guide="grading-course-chips">
      {courses.map((c) => {
        const on = c.courseId === courseId;
        const dirty = Object.keys(drafts).some((k) => k.split("|")[1] === c.courseId && Object.keys(drafts[k] ?? {}).length > 0);
        return (
          <button
            key={c.courseId}
            type="button"
            aria-pressed={on}
            onClick={() => onCourse(c.courseId)}
            title={`${c.code} · ${c.studentCount} ${c.studentCount === 1 ? "student" : "students"}`}
            className={chip(on)}
          >
            {c.title} · {c.className}
            {dirty ? (
              <span className="inline-block h-2 w-2 rounded-full bg-tl-warning" title="Unsaved changes">
                <span className="sr-only">(unsaved changes)</span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  if (!courseId) {
    return (
      <section className={card}>
        <h2 className={cardTitle}>No subjects to grade yet</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
          When the school office assigns you a subject, its assessments show here for you to score.
        </p>
      </section>
    );
  }

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-[18px]">
        {chips}
        <SheetSkeleton />
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="flex flex-col gap-[18px]">
        {chips}
        <SheetLoadError error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  if (sheet.assessments.length === 0) {
    return (
      <div className="flex flex-col gap-[18px]">
        {chips}
        <section className={card}>
          <h2 className={cardTitle}>No assessments in {sheet.term.name}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
            The school office sets up the term&apos;s assessments and their maximum scores. Once it has, they show here for {sheet.course.title} ·{" "}
            {sheet.class.name}.
          </p>
        </section>
      </div>
    );
  }

  const current = resolveView(sheet, view);
  const isTotal = current === TERM_TOTAL;
  const assessment = isTotal ? undefined : sheet.assessments.find((a) => a.id === current);
  const keyOf = (a: GradingAssessment) => draftKey(termOf, sheet.course.id, a.id);
  const draft = assessment ? draftsById[assessment.id] : undefined;
  const label = `${sheet.course.title} · ${sheet.class.name}`;
  const busy = save.isPending || publish.isPending || unlock.isPending;

  const tiles = assessment ? assessmentTiles(sheet, assessment, draft) : termTotalTiles(totals, sheet.passMark);
  const dirtyOne = assessment ? isDirty(sheet, assessment, draft) : false;
  const bad = assessment ? badCount(sheet, assessment, draft) : 0;
  const line = assessment ? assessmentStatusLine(assessment, bad, dirtyOne, nowMs, timezone) : termTotalStatusLine(sheet, draftsById);
  const editable = sheet.assessments.filter((a) => !isLocked(a));
  const allChanges = editable.map((a) => ({ a, changes: draftChanges(sheet, a, draftsById[a.id]) })).filter((x) => x.changes.valid.length > 0);
  const canSave = assessment ? !isLocked(assessment) && draftChanges(sheet, assessment, draft).valid.length > 0 : allChanges.length > 0;
  const publishable = assessment ? canPublish(sheet, assessment, draft) : false;

  /**
   * Saves one assessment's valid changes.
   *
   * @param a - The assessment.
   * @returns The saved sheet, or null when it failed (already reported).
   */
  const saveOne = async (a: GradingAssessment): Promise<CourseGradingSheet | null> => {
    const d = draftsById[a.id];
    const changes = draftChanges(sheet, a, d);
    if (changes.valid.length === 0) return sheet;
    try {
      const saved = await save.mutateAsync({ courseId: sheet.course.id, assessmentId: a.id, termId, scores: changes.valid });
      onDraft(keyOf(a), pruneDraft(saved, a, d));
      return saved;
    } catch (error) {
      if (isLockedError(error)) {
        onDraft(keyOf(a), undefined);
        toast.error(`${a.name} is published and locked, so your changes were not saved. Unlock it to correct a score.`);
        void query.refetch();
      } else {
        toast.error(getErrorMessage(error, `Your ${a.name} scores were not saved. Please try again.`));
      }
      return null;
    }
  };

  const saveDraft = async () => {
    if (!canSave || busy) return;
    if (assessment) {
      const held = draftChanges(sheet, assessment, draft).invalid.length;
      if (await saveOne(assessment)) {
        toast.success(
          held
            ? `Draft saved. ${held} ${held === 1 ? "score is" : "scores are"} above the maximum or not a number and ${held === 1 ? "was" : "were"} not saved.`
            : "Draft saved. Students and parents cannot see it yet.",
        );
      }
      return;
    }
    let ok = true;
    for (const { a } of allChanges) ok = Boolean(await saveOne(a)) && ok;
    if (ok) toast.success("Drafts saved. Publish each assessment from its own tab.");
  };

  const doPublish = async () => {
    if (!assessment) return;
    const republish = assessment.status === "unlocked";
    if (draftChanges(sheet, assessment, draft).valid.length > 0 && !(await saveOne(assessment))) {
      setConfirm(null);
      return;
    }
    try {
      const result = await publish.mutateAsync({ courseId: sheet.course.id, assessmentId: assessment.id, termId });
      onDraft(keyOf(assessment), undefined);
      toast.success(publishedMessage(assessment.name, result, republish));
    } catch (error) {
      const missing = missingScoresFromError(error);
      toast.error(
        missing !== null
          ? `${missing} ${missing === 1 ? "student still needs" : "students still need"} a score before you can publish ${assessment.name}.`
          : getErrorMessage(error, `${assessment.name} was not published. Please try again.`),
      );
    } finally {
      setConfirm(null);
    }
  };

  const doUnlock = async () => {
    if (!assessment) return;
    try {
      await unlock.mutateAsync({ courseId: sheet.course.id, assessmentId: assessment.id, termId, reason: reason.trim() || undefined });
      toast.success(`${assessment.name} unlocked for editing.`);
    } catch (error) {
      toast.error(getErrorMessage(error, `${assessment.name} was not unlocked. Please try again.`));
    } finally {
      setConfirm(null);
      setReason("");
    }
  };

  const exportCsv = () => {
    const file = assessment ? assessmentCsv(sheet, assessment, draft) : termTotalCsv(sheet, totals);
    downloadCsv(file.filename, file.csv);
    toast.success(`${assessment ? assessment.name : "Term total"} for ${label} downloaded.`);
  };

  const importCsv = async (file: File | undefined) => {
    if (!file || !assessment) return;
    const text = await readFileText(file);
    const result = importScoresCsv(text, sheet, assessment);
    setProblems(result.problems);
    if (result.filled) {
      onDraft(keyOf(assessment), pruneDraft(sheet, assessment, { ...(draft ?? {}), ...result.draft }));
      toast.success(`Filled in ${result.filled} ${result.filled === 1 ? "score" : "scores"} from ${file.name}. Check them, then Save draft.`);
    } else if (!result.problems.length) {
      toast.info(`${file.name} had no scores to fill in.`);
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const title = assessment
    ? `${assessment.name} · ${label} · out of ${assessment.maxScore}`
    : `Term total · ${label} · out of ${sheet.totalMax}`;

  return (
    <div className="flex flex-col gap-[18px]">
      {chips}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]" role="group" aria-label="Assessment" data-guide="grading-assessment-tabs">
        {sheet.assessments.map((a) => (
          <TabCard
            key={a.id}
            tab={assessmentTab(sheet, a, draftsById[a.id])}
            on={a.id === current}
            dirty={isDirty(sheet, a, draftsById[a.id])}
            onPick={() => onView(a.id)}
            tip={`Switch to ${a.name}`}
          />
        ))}
        <TabCard
          tab={termTotalTab(sheet, totals)}
          on={isTotal}
          dirty={false}
          onPick={() => onView(TERM_TOTAL)}
          tip="Every assessment side by side"
        />
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]" data-guide="grading-stats">
        <StatTile label={isTotal ? "Complete" : "Entered"} value={tiles.entered} valueClass="text-[22px] text-tl-ink" tip={isTotal ? "Students with every score entered" : "Valid scores entered"} />
        <StatTile label="Class average" value={tiles.average} valueClass="text-[22px] text-tl-ink" tip={isTotal ? `Average term total, as a percentage of ${sheet.totalMax}` : "Average of the scores entered so far"} />
        <StatTile label="Highest" value={tiles.highest} valueClass="text-[22px] text-tl-ink" />
        <StatTile label="Lowest" value={tiles.lowest} valueClass="text-[22px] text-tl-ink" />
        <StatTile label="Pass rate" value={tiles.passRate} valueClass="text-[22px] text-tl-ink" tip={`Share of students on ${sheet.passMark}% or more`} />
      </div>

      <section className="rounded-[22px] border border-tl-line bg-tl-surface shadow-[0_1px_2px_rgba(15,27,46,0.04)] dark:shadow-none" aria-labelledby="score-sheet-title" data-guide="grading-score-sheet">
        <div className="flex flex-wrap items-center gap-3 border-b border-tl-line-soft px-5 py-4">
          <div className="min-w-[220px] flex-1">
            <h2 id="score-sheet-title" className="text-base font-extrabold text-tl-ink">
              {title}
            </h2>
            <p className={`mt-[3px] text-[13px] font-bold ${LINE_TONE[line.tone]}`} aria-live="polite">
              {line.text}
            </p>
          </div>
          <button type="button" className={`${ghostButton} rounded-xl px-[15px] py-2.5`} onClick={exportCsv} title="Download these scores as a spreadsheet">
            Export CSV
          </button>
          {assessment && !isLocked(assessment) ? (
            <>
              <button
                type="button"
                className={`${ghostButton} rounded-xl px-[15px] py-2.5`}
                onClick={() => fileInput.current?.click()}
                title="Fill in scores from a spreadsheet with a Student ID (or Student) column and a Score column"
              >
                Import CSV
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                aria-hidden
                tabIndex={-1}
                data-testid="score-csv-input"
                onChange={(event) => void importCsv(event.target.files?.[0])}
              />
            </>
          ) : null}
          {assessment && isLocked(assessment) ? (
            <button
              type="button"
              className={`${ghostButton} rounded-xl px-[15px] py-2.5`}
              onClick={() => setConfirm("unlock")}
              disabled={busy}
              title="Reopen published scores to correct a mistake. Students and parents are told a score changed."
            >
              Unlock to correct
            </button>
          ) : (
            <button type="button" className={`${ghostButton} rounded-xl px-[15px] py-2.5`} onClick={() => void saveDraft()} disabled={!canSave || busy} title="Save your scores without showing them to anyone">
              {save.isPending ? "Saving…" : "Save draft"}
            </button>
          )}
          {assessment && !isLocked(assessment) ? (
            <button
              type="button"
              className={`${primaryButton} rounded-xl px-4 py-2.5`}
              onClick={() => publishable && setConfirm("publish")}
              disabled={!publishable || busy}
              title={publishable ? "Show these scores to students and parents" : "Enter a valid score for every student first"}
              data-guide="grading-publish"
            >
              Publish scores
            </button>
          ) : null}
        </div>

        {problems.length ? (
          <div role="alert" className="border-b border-tl-line-soft bg-tl-warning-bg px-5 py-3 text-[13px] text-tl-ink">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">Some rows of the file were not used:</p>
                <ul className="mt-1 list-disc pl-5">
                  {problems.slice(0, 8).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                  {problems.length > 8 ? <li>…and {problems.length - 8} more.</li> : null}
                </ul>
              </div>
              <button type="button" className={`${ghostButton} min-h-[44px] rounded-xl px-3 py-1.5`} onClick={() => setProblems([])}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {assessment ? (
          <AssessmentScoreTable
            sheet={sheet}
            assessment={assessment}
            draft={draft}
            totals={totals}
            onCell={(studentId, text) => onCell(keyOf(assessment), studentId, text, sheet.students.find((s) => s.id === studentId)?.scores[assessment.id] ?? null, assessment.maxScore)}
          />
        ) : (
          <TermTotalTable
            sheet={sheet}
            rows={totals}
            drafts={draftsById}
            onCell={(assessmentId, studentId, text) => {
              const a = sheet.assessments.find((x) => x.id === assessmentId);
              if (!a) return;
              onCell(keyOf(a), studentId, text, sheet.students.find((s) => s.id === studentId)?.scores[a.id] ?? null, a.maxScore);
            }}
          />
        )}
      </section>

      {assessment ? (
        <>
          <ConfirmSheet
            open={confirm === "publish"}
            onCancel={() => setConfirm(null)}
            onConfirm={() => void doPublish()}
            busy={busy}
            busyLabel="Publishing…"
            eyebrowText="Grading"
            title={`Publish ${assessment.name} for ${label}?`}
            body={
              assessment.status === "unlocked"
                ? `Students and parents will see the corrected scores. Only those whose score changed are notified. Scores lock again once published.`
                : `Students and their parents will see these ${sheet.students.length} scores in their portals and receive a notification. Scores lock once published; you can unlock them to correct a mistake.`
            }
            confirmLabel="Publish scores"
          />
          <ConfirmSheet
            open={confirm === "unlock"}
            onCancel={() => {
              setConfirm(null);
              setReason("");
            }}
            onConfirm={() => void doUnlock()}
            busy={busy}
            busyLabel="Unlocking…"
            eyebrowText="Grading"
            title={`Unlock ${assessment.name} for ${label}?`}
            body="Scores become editable again. When you republish, students and parents are told which scores changed."
            confirmLabel="Unlock"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unlock-reason" className={fieldLabel}>
                Reason (optional)
              </label>
              <input
                id="unlock-reason"
                value={reason}
                maxLength={200}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Two scripts were marked twice"
                className={`min-h-[46px] w-full rounded-[13px] border border-tl-control bg-tl-surface px-3.5 text-[15px] font-semibold text-tl-ink placeholder:text-tl-faint ${focusRing}`}
              />
            </div>
          </ConfirmSheet>
        </>
      ) : null}
    </div>
  );
}
