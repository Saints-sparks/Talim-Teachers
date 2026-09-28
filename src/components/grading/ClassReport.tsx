"use client";

import React, { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { card, cardFrame, cardTitle, chip, focusRing, ghostButton, pill, pillTone, primaryButton, rowButton, segment, segmentTrack } from "@/components/tl/styles";
import {
  DASH,
  READINESS_STATUS,
  REMARK_MAX,
  broadsheetCells,
  broadsheetNote,
  formatPercent,
  positionLabel,
  publishedLine,
  readinessAction,
  redThreshold,
  remarksLock,
  sortReportRows,
  submissionView,
  tiedRanks,
  waitingOnFromError,
  withReminder,
  type ReportSort,
} from "@/hooks/grading/grading.logic";
import {
  useBroadsheet,
  useGradingSession,
  useReadiness,
  useRemarks,
  useRemarksAutosave,
  useSendReminder,
  useSubmitTermResults,
  useTermResults,
} from "@/hooks/grading/useGrading";
import { ApiError, getErrorMessage } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import type { ClassReadiness, GradeBand, TermResultSubmission } from "@/types/grading";

/** The class report's tabs. */
export type ReportTab = "subjects" | "summary" | "remarks";

/** Props for {@link ClassReport}. */
export interface ClassReportProps {
  classId: string;
  className: string;
  termId: string | undefined;
  tab: ReportTab;
  onTab: (tab: ReportTab) => void;
  /** Opens the caller's own course on an assessment (readiness "Open"). */
  onOpenCourse: (courseId: string, assessmentId: string) => void;
  /** Course ids the caller teaches, for "(yours)". */
  myCourseIds: ReadonlySet<string>;
  /** A scale the page already has (from a course sheet), for the red threshold. */
  knownScale?: GradeBand[];
  nowMs: number;
  timezone: string;
}

const th = "px-3 py-3 text-left text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint";
const BANNER: Record<"success" | "warning" | "info", string> = {
  success: "bg-tl-success-bg",
  warning: "bg-tl-warning-bg",
  info: "bg-tl-select",
};

/**
 * Why part of the class report could not be shown: 403 means the caller is
 * not this class's class teacher.
 *
 * @param props - The error and a retry.
 * @param props.error - The query's error.
 * @param props.onRetry - Refetches.
 * @param props.what - What failed to load.
 * @returns The alert card.
 */
function ReportError({ error, onRetry, what }: { error: unknown; onRetry: () => void; what: string }) {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 403 || status === 404) {
    return (
      <div className={card} role="alert">
        <h2 className={cardTitle}>{status === 403 ? "Only the class teacher compiles this report" : "Class not found"}</h2>
        <p className="mt-1.5 text-sm text-tl-muted">
          {status === 403
            ? "You are not the class teacher of this class, so its report is not available to you. Subject scores are still open to you."
            : "There is no class with this link in your school."}
        </p>
      </div>
    );
  }
  return (
    <div className={card} role="alert">
      <h2 className={cardTitle}>We could not load the {what}</h2>
      <p className="mt-1.5 text-sm text-tl-muted">{getErrorMessage(error, "Check your connection and try again.")}</p>
      <button type="button" className={`${primaryButton} mt-4`} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

/**
 * A grey block while a part loads.
 *
 * @param props - What is loading.
 * @param props.label - For screen readers.
 * @returns The skeleton.
 */
function Block({ label }: { label: string }) {
  return <div className="h-[380px] animate-pulse rounded-[22px] bg-tl-line/70" role="status" aria-label={label} />;
}

/**
 * The Subjects tab: every subject's status for every assessment, with Open
 * on the caller's own and Send reminder on a colleague's.
 *
 * @param props - The readiness and what the row actions do.
 * @param props.data - The readiness.
 * @param props.classId - The class.
 * @param props.onOpenCourse - Opens the caller's course.
 * @param props.nowMs - Now.
 * @param props.timezone - The school's timezone.
 * @param props.termId - The term, for the cache key.
 * @returns The card.
 */
function Readiness({ data, classId, onOpenCourse, nowMs, timezone, termId }: { data: ClassReadiness; classId: string; onOpenCourse: ClassReportProps["onOpenCourse"]; nowMs: number; timezone: string; termId: string | undefined }) {
  const send = useSendReminder();
  const queryClient = useQueryClient();
  const { schoolId } = useGradingSession();
  const [sending, setSending] = useState<string | null>(null);
  const key = queryKeys.grading.readiness(schoolId, classId, termId ?? "current");

  const markSent = (courseId: string, assessmentId: string, sentAt: string) => {
    queryClient.setQueryData<ClassReadiness>(key, (current) =>
      current
        ? { ...current, subjects: current.subjects.map((s) => (s.course.id === courseId ? { ...s, cells: withReminder(s.cells, assessmentId, sentAt) } : s)) }
        : current,
    );
  };

  const remind = async (courseId: string, assessmentId: string, teacherName: string, assessmentName: string) => {
    setSending(courseId);
    try {
      const result = await send.mutateAsync({ classId, courseId, assessmentId });
      markSent(courseId, assessmentId, result.sentAt);
      toast.success(`Reminder sent to ${teacherName} about ${assessmentName} scores.`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        markSent(courseId, assessmentId, new Date(nowMs).toISOString());
        toast.info(`A reminder about ${assessmentName} was already sent to ${teacherName} today.`);
      } else {
        toast.error(getErrorMessage(error, "The reminder was not sent. Please try again."));
      }
    } finally {
      setSending(null);
    }
  };

  return (
    <section className={cardFrame} aria-labelledby="readiness-title" data-guide="grading-readiness">
      <div className="border-b border-tl-line-soft px-5 py-[18px]">
        <h2 id="readiness-title" className="text-base font-extrabold text-tl-ink">
          {data.class.name} · report readiness
        </h2>
        <p className="mt-[3px] text-[13px] text-tl-muted">
          As class teacher you compile the report once every subject teacher has published. Each column is one assessment.
        </p>
      </div>
      {data.subjects.length === 0 ? (
        <p className="px-5 py-5 text-sm text-tl-muted">No subjects are set up for {data.class.name} this term yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 560 + data.assessments.length * 120 }}>
            <caption className="sr-only">Which subjects of {data.class.name} have published each assessment</caption>
            <thead>
              <tr>
                <th scope="col" className={`${th} pl-5`}>
                  Subject
                </th>
                <th scope="col" className={th}>
                  Teacher
                </th>
                {data.assessments.map((a) => (
                  <th key={a.id} scope="col" className={`${th} w-[120px]`}>
                    {a.name}
                  </th>
                ))}
                <th scope="col" className={`${th} w-[160px] pr-5`}>
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.map((s) => {
                const action = readinessAction(s, data.assessments, nowMs, timezone);
                return (
                  <tr key={s.course.id} className="border-t border-tl-line-soft">
                    <th scope="row" className="py-3 pl-5 pr-3 text-left font-normal">
                      <div className="text-[15px] font-bold text-tl-ink">{s.course.title}</div>
                      <div className="text-xs text-tl-faint">{s.course.code}</div>
                    </th>
                    <td className="px-3 py-3 text-sm text-tl-muted">{s.isMine ? "You" : (s.teacher?.name ?? "Not assigned")}</td>
                    {data.assessments.map((a) => {
                      const cell = s.cells.find((c) => c.assessmentId === a.id);
                      const st = READINESS_STATUS[cell?.status ?? "not_started"];
                      return (
                        <td key={a.id} className="px-3 py-3">
                          <span className={`${pill} ${pillTone[st.tone]}`}>{st.label}</span>
                        </td>
                      );
                    })}
                    <td className="py-3 pl-3 pr-5">
                      {action.kind === "open" ? (
                        <button type="button" className={rowButton} title={action.tip} onClick={() => onOpenCourse(action.courseId, action.assessmentId)}>
                          Open
                        </button>
                      ) : action.kind === "remind" ? (
                        <button
                          type="button"
                          className={rowButton}
                          title={action.tip}
                          disabled={sending === s.course.id}
                          onClick={() => void remind(action.courseId, action.assessmentId, action.teacherName, action.assessmentName)}
                        >
                          {sending === s.course.id ? "Sending…" : "Send reminder"}
                        </button>
                      ) : action.kind === "reminded" ? (
                        <span className="text-[13px] font-bold text-tl-success" title={action.tip}>
                          Reminder sent
                        </span>
                      ) : action.kind === "no_teacher" ? (
                        <span className="text-[13px] text-tl-muted">No teacher assigned</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * The sort switch shared by the summary and the remarks.
 *
 * @param props - The order and its setter.
 * @param props.sort - The order.
 * @param props.onSort - Changes it.
 * @returns The segmented control.
 */
function SortSwitch({ sort, onSort }: { sort: ReportSort; onSort: (sort: ReportSort) => void }) {
  return (
    <div className={segmentTrack} role="group" aria-label="Order the list" title="Order the list">
      {(
        [
          ["pos", "By position"],
          ["name", "A to Z"],
        ] as const
      ).map(([value, label]) => (
        <button key={value} type="button" aria-pressed={sort === value} className={segment(sort === value)} onClick={() => onSort(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * The Summary tab: the broadsheet on one basis (an assessment or the Term
 * total), sortable and printable, with Generate once every subject has
 * published, and the submission's status after.
 *
 * @param props - The class, term and readiness (for the basis chips).
 * @param props.classId - The class.
 * @param props.termId - The term.
 * @param props.readiness - For the basis chips.
 * @param props.myCourseIds - For "(yours)".
 * @param props.knownScale - For the red threshold.
 * @param props.submissions - The class's submissions.
 * @param props.nowMs - Now.
 * @param props.timezone - The school's timezone.
 * @returns The card.
 */
function Summary({
  classId,
  termId,
  readiness,
  myCourseIds,
  knownScale,
  submissions,
  nowMs,
  timezone,
}: {
  classId: string;
  termId: string | undefined;
  readiness: ClassReadiness;
  myCourseIds: ReadonlySet<string>;
  knownScale?: GradeBand[];
  submissions: TermResultSubmission[];
  nowMs: number;
  timezone: string;
}) {
  const bases = [...readiness.assessments.map((a) => ({ key: a.id, label: a.name })), { key: "total", label: "Term total" }];
  const [basis, setBasis] = useState(bases[0]?.key ?? "total");
  const [sort, setSort] = useState<ReportSort>("pos");
  const query = useBroadsheet(classId, termId, basis);
  const submit = useSubmitTermResults();
  const sheet = query.data;

  if (query.isPending) return <Block label="Loading the broadsheet" />;
  if (!sheet) return <ReportError error={query.error} onRetry={() => void query.refetch()} what="broadsheet" />;

  const threshold = redThreshold(sheet.scale ?? knownScale);
  const rows = sortReportRows(sheet.rows, sort);
  const tied = tiedRanks(sheet.rows.map((r) => r.position));
  const basisLabel = bases.find((b) => b.key === basis)?.label ?? sheet.basis.label;
  const submission = submissions.find((s) => s.basis === sheet.basis.key);
  const view = submissionView(submission, basisLabel, nowMs, timezone);
  const max = sheet.basis.maxPerSubject;
  const enabled = sheet.ready && view.canSubmit && !submit.isPending && !query.isPlaceholderData;

  const generate = async () => {
    if (!enabled) return;
    try {
      await submit.mutateAsync({ classId, termId, basis: sheet.basis.key });
      toast.success(`${basisLabel} summary for ${sheet.class.name} generated. It is now in the school office's report queue.`);
    } catch (error) {
      const waiting = waitingOnFromError(error);
      toast.error(
        waiting
          ? `Not every subject has published ${basisLabel} yet: waiting on ${waiting.map((w) => w.title).join(", ")}.`
          : getErrorMessage(error, "The summary was not sent. Please try again."),
      );
      if (waiting) void query.refetch();
    }
  };

  return (
    <section className={`${cardFrame} print:border-0 print:shadow-none`} aria-labelledby="broadsheet-title" data-guide="grading-broadsheet">
      <div className="flex flex-wrap items-start gap-3.5 border-b border-tl-line-soft px-5 py-[18px]">
        <div className="min-w-[220px] flex-1">
          <h2 id="broadsheet-title" className="text-base font-extrabold text-tl-ink">
            {sheet.class.name} · {basisLabel} broadsheet
          </h2>
          <p className="mt-[3px] text-[13px] text-tl-muted">
            {max ? `Each subject out of ${max}` : "Each subject as a percentage of its term total"}. Scores below {threshold}% are shown in red.
          </p>
        </div>
        <button type="button" className={ghostButton} onClick={() => window.print()} title="Print or save as PDF" data-print-hide>
          <Printer className="h-4 w-4" aria-hidden />
          Print
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 border-b border-tl-line-soft px-5 py-3.5" data-print-hide>
        <div className="flex flex-wrap gap-2.5" role="group" aria-label="Summary basis">
          {bases.map((b) => (
            <button key={b.key} type="button" aria-pressed={basis === b.key} className={chip(basis === b.key)} onClick={() => setBasis(b.key)}>
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <SortSwitch sort={sort} onSort={setSort} />
      </div>
      <div className={`overflow-x-auto print:overflow-visible ${query.isPlaceholderData ? "opacity-60" : ""}`} aria-busy={query.isPlaceholderData || undefined}>
        <table className="w-full border-collapse print:min-w-0 print:text-[11px]" style={{ minWidth: 520 + sheet.subjects.length * 86 }}>
          <caption className="sr-only">
            {basisLabel} broadsheet for {sheet.class.name}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={`${th} pl-5`}>
                Student
              </th>
              {sheet.subjects.map((s) => (
                <th key={s.courseId} scope="col" className={`${th} text-center`} title={`${s.title} · ${max ? `out of ${max}` : "percent"}${s.published ? "" : " · not published yet"}`}>
                  <abbr title={s.title} className="no-underline">
                    {s.code}
                  </abbr>
                </th>
              ))}
              <th scope="col" className={`${th} text-center`}>
                Total
              </th>
              <th scope="col" className={`${th} text-center`}>
                Average
              </th>
              <th scope="col" className={`${th} text-center`}>
                Pos.
              </th>
              <th scope="col" className={`${th} pr-5 text-center`}>
                Grade
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const joint = r.position ? tied.has(r.position.rank) : false;
              return (
                <tr key={r.student.id} className="border-t border-tl-line-soft">
                  <th scope="row" className="py-2.5 pl-5 pr-3 text-left font-normal">
                    <div className="text-[15px] font-bold text-tl-ink">{r.student.name}</div>
                    <div className="text-xs text-tl-faint">{r.student.admissionNumber ?? ""}</div>
                  </th>
                  {broadsheetCells(r, max, threshold).map((c, i) => (
                    <td key={sheet.subjects[i]?.courseId ?? i} className={`px-3 py-2.5 text-center text-sm font-bold ${c.empty ? "text-tl-faint" : c.low ? "text-tl-danger" : "text-tl-ink"}`}>
                      {c.text}
                      {c.low ? <span className="sr-only"> (below {threshold}%)</span> : null}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center text-[15px] font-extrabold text-tl-ink">{r.total ?? DASH}</td>
                  <td className="px-3 py-2.5 text-center text-sm font-bold text-tl-brand">{formatPercent(r.average)}</td>
                  <td className="px-3 py-2.5 text-center text-sm font-extrabold text-tl-ink">{positionLabel(r.position, joint)}</td>
                  <td className="py-2.5 pl-3 pr-5 text-center text-sm font-extrabold text-tl-ink">{r.grade ?? DASH}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sheet.rows.length === 0 ? <p className="border-t border-tl-line-soft px-5 py-5 text-sm text-tl-muted">There are no students in {sheet.class.name} yet.</p> : null}
      </div>
      {view.banner ? (
        <p role="status" className={`border-t border-tl-line-soft px-5 py-3.5 text-sm leading-[1.55] text-tl-ink ${BANNER[view.banner.tone]}`}>
          {view.banner.text}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3.5 rounded-b-[22px] border-t border-tl-line-soft bg-tl-subtle px-5 py-4" data-print-hide>
        <p className="min-w-[220px] flex-1 text-sm leading-[1.55] text-tl-body">{broadsheetNote(sheet, myCourseIds)}</p>
        {view.canSubmit ? (
          <button
            type="button"
            className={primaryButton}
            disabled={!enabled}
            onClick={() => void generate()}
            title={sheet.ready ? "Build the class summary and positions, and send it to the school office" : "Available once every subject is published"}
          >
            {submit.isPending ? "Sending…" : view.label}
          </button>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The Remarks tab: position, student, subjects published, average and the
 * class teacher's remark (autosaved, at most 500 characters), locked while
 * the results are with the office or published. The principal's remark is
 * shown read-only when there is one.
 *
 * @param props - The class and term.
 * @param props.classId - The class.
 * @param props.termId - The term.
 * @param props.submissions - The class's submissions (for the lock).
 * @returns The card.
 */
function Remarks({ classId, termId, submissions }: { classId: string; termId: string | undefined; submissions: TermResultSubmission[] }) {
  const query = useRemarks(classId, termId);
  const lock = remarksLock(submissions);
  const autosave = useRemarksAutosave(classId, termId, Boolean(lock));
  const [sort, setSort] = useState<ReportSort>("pos");
  const rows = useMemo(() => sortReportRows(query.data?.rows ?? [], sort), [query.data, sort]);
  const tied = tiedRanks((query.data?.rows ?? []).map((r) => r.position));

  if (query.isPending) return <Block label="Loading the remarks" />;
  if (!query.data) return <ReportError error={query.error} onRetry={() => void query.refetch()} what="remarks" />;

  const locked = Boolean(lock) || autosave.state.kind === "locked";
  const state = autosave.state;

  return (
    <section className={cardFrame} aria-labelledby="remarks-title" data-guide="grading-remarks">
      <div className="flex flex-wrap items-start gap-3 border-b border-tl-line-soft px-5 py-[18px]">
        <div className="min-w-[220px] flex-1">
          <h2 id="remarks-title" className="text-base font-extrabold text-tl-ink">
            Class teacher&apos;s remarks
          </h2>
          <p className="mt-[3px] text-[13px] text-tl-muted">
            Printed on each report card. Averages use published subjects only and update as colleagues publish.
          </p>
        </div>
        <div className="flex min-h-[44px] items-center gap-2 text-[13px] font-bold" aria-live="polite">
          {state.kind === "saving" ? <span className="text-tl-muted">Saving…</span> : null}
          {state.kind === "pending" ? <span className="text-tl-muted">Unsaved changes</span> : null}
          {state.kind === "saved" ? <span className="text-tl-success">All remarks saved</span> : null}
          {state.kind === "error" ? (
            <>
              <span className="text-tl-danger" title={state.message}>
                Remarks not saved
              </span>
              <button type="button" className={`min-h-[44px] rounded-lg px-2 text-tl-link underline ${focusRing}`} onClick={autosave.retry}>
                Retry
              </button>
            </>
          ) : null}
        </div>
      </div>
      {locked ? (
        <p role="status" className="border-b border-tl-line-soft bg-tl-select px-5 py-3.5 text-sm leading-[1.55] text-tl-ink">
          {lock?.status === "published"
            ? "The term results are published, so remarks are locked."
            : "Remarks are locked while the term results are with the school office. If the office returns them, you can edit again."}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-tl-line-soft px-5 py-3.5">
        <div className="flex-1" />
        <SortSwitch sort={sort} onSort={setSort} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <caption className="sr-only">Remarks for each student</caption>
          <thead>
            <tr>
              <th scope="col" className={`${th} w-[70px] pl-5`}>
                Pos.
              </th>
              <th scope="col" className={th}>
                Student
              </th>
              <th scope="col" className={`${th} w-[100px]`}>
                Average
              </th>
              <th scope="col" className={`${th} pr-5`}>
                Remark
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const text = autosave.textOf(r.student.id, r.classTeacherRemark);
              const inputId = `remark-${r.student.id}`;
              const countId = `remark-count-${r.student.id}`;
              const joint = r.position ? tied.has(r.position.rank) : false;
              return (
                <tr key={r.student.id} className="border-t border-tl-line-soft align-top">
                  <td className="py-3 pl-5 pr-3 text-[15px] font-extrabold text-tl-brand">{positionLabel(r.position, joint)}</td>
                  <th scope="row" className="px-3 py-3 text-left font-normal">
                    <div className="text-[15px] font-bold text-tl-ink">{r.student.name}</div>
                    <div className="text-xs text-tl-faint">{publishedLine(r)}</div>
                  </th>
                  <td className="px-3 py-3 text-[15px] font-extrabold text-tl-ink">{formatPercent(r.average)}</td>
                  <td className="py-2 pl-3 pr-5">
                    <label htmlFor={inputId} className="sr-only">
                      Remark for {r.student.name}
                    </label>
                    <textarea
                      id={inputId}
                      value={text}
                      rows={2}
                      maxLength={REMARK_MAX}
                      readOnly={locked}
                      aria-describedby={countId}
                      placeholder="e.g. A careful worker. Should read more widely."
                      onChange={(event) => autosave.edit(r.student.id, event.target.value)}
                      className={`min-h-[44px] w-full resize-y rounded-[11px] border border-tl-control bg-tl-surface px-3 py-2 text-sm font-semibold text-tl-ink placeholder:text-tl-faint read-only:bg-tl-bg read-only:text-tl-muted ${focusRing}`}
                    />
                    <div id={countId} className="mt-0.5 text-right text-xs text-tl-faint">
                      {text.length}/{REMARK_MAX}
                    </div>
                    {r.principalRemark ? (
                      <p className="mt-1 text-[13px] text-tl-body">
                        <span className="font-bold">Principal:</span> {r.principalRemark}
                      </p>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="border-t border-tl-line-soft px-5 py-5 text-sm text-tl-muted">There are no students in this class yet.</p> : null}
      </div>
    </section>
  );
}

/**
 * "Class report · {class}": the class teacher's view, in three tabs —
 * Subjects (readiness and reminders), Summary (the broadsheet and its
 * submission to the office) and Remarks.
 *
 * @param props - See {@link ClassReportProps}.
 * @returns The mode's content.
 */
export function ClassReport({ classId, className, termId, tab, onTab, onOpenCourse, myCourseIds, knownScale, nowMs, timezone }: ClassReportProps) {
  const readiness = useReadiness(classId, termId);
  const results = useTermResults(classId, termId);

  const tabs = (
    <div className={`${segmentTrack} w-max`} role="group" aria-label={`Class report for ${className}`} data-print-hide>
      {(
        [
          ["subjects", "Subjects", "grading-tab-readiness"],
          ["summary", "Summary", "grading-tab-summary"],
          ["remarks", "Remarks", "grading-tab-remarks"],
        ] as const
      ).map(([value, label, guide]) => (
        <button key={value} type="button" aria-pressed={tab === value} className={segment(tab === value)} onClick={() => onTab(value)} data-guide={guide}>
          {label}
        </button>
      ))}
    </div>
  );

  if (readiness.isPending) {
    return (
      <div className="flex flex-col gap-[18px]">
        {tabs}
        <Block label="Loading the class report" />
      </div>
    );
  }
  if (!readiness.data) {
    return (
      <div className="flex flex-col gap-[18px]">
        {tabs}
        <ReportError error={readiness.error} onRetry={() => void readiness.refetch()} what="class report" />
      </div>
    );
  }

  const submissions = results.data ?? [];

  return (
    <div className="flex flex-col gap-[18px]">
      {tabs}
      {tab === "subjects" ? (
        <Readiness data={readiness.data} classId={classId} onOpenCourse={onOpenCourse} nowMs={nowMs} timezone={timezone} termId={termId} />
      ) : tab === "summary" ? (
        <Summary
          key={`${classId}|${termId ?? "current"}`}
          classId={classId}
          termId={termId}
          readiness={readiness.data}
          myCourseIds={myCourseIds}
          knownScale={knownScale}
          submissions={submissions}
          nowMs={nowMs}
          timezone={timezone}
        />
      ) : (
        <Remarks classId={classId} termId={termId} submissions={submissions} />
      )}
    </div>
  );
}
