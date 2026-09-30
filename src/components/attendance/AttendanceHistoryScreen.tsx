"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Avatar } from "@/components/tl/Avatar";
import { StatTile } from "@/components/tl/StatTile";
import { card, cardFrame, cardTitle, focusRing, ghostButton, pagePad, pageTitle, primaryButton, segment, segmentTrack } from "@/components/tl/styles";
import { classOptionLabel } from "@/components/attendance/AttendanceScreen";
import { localDayKey } from "@/app/services/attendance/attendance.helpers";
import { useCurrentTerm } from "@/hooks/academic/useCurrentTerm";
import {
  HISTORY_PRESETS,
  ON_TRACK_RATE,
  filterRows,
  historyHref,
  historyRow,
  historyTotals,
  matchPreset,
  presetRange,
  rangeProblem,
  rangeText,
  rateTone,
  sortRows,
  type DateRange,
  type HistoryParams,
  type HistoryRow,
  type HistorySort,
} from "@/hooks/attendance/history.logic";
import { useMyClasses } from "@/hooks/attendance/useRegister";
import { useClassAttendanceKpis, useStudentAttendanceKpis } from "@/hooks/attendance/useStudentAttendanceKpis";
import { formatRate } from "@/hooks/students/students.logic";
import { useClassRoster } from "@/hooks/students/useClassroomStudents";
import { useTeacherToday } from "@/hooks/today/useTeacherToday";
import { ApiError, getErrorMessage } from "@/lib/apiError";

/** Props for {@link AttendanceHistoryScreen}. */
export interface AttendanceHistoryScreenProps {
  /** The page's query (`?classId=&from=&to=&studentId=`), parsed. */
  initial: HistoryParams;
}

const TONE_TEXT = { success: "text-tl-success", warning: "text-tl-warning", danger: "text-tl-danger", muted: "text-tl-muted" } as const;
const TONE_FILL = { success: "bg-tl-success", warning: "bg-tl-warning", danger: "bg-tl-danger", muted: "bg-tl-line" } as const;

/**
 * The DOM id of a student's row, for the highlighted student to scroll to.
 *
 * @param studentId - The student.
 * @returns The id.
 */
export function historyRowId(studentId: string): string {
  return `history-student-${studentId}`;
}

/**
 * A rate as a bar with its figure beside it, coloured by how it reads
 * (on track, a concern, at risk).
 *
 * @param props - The rate.
 * @param props.rate - The rate, or null with no records.
 * @returns The bar.
 */
function RateBar({ rate }: { rate: number | null }) {
  const tone = rateTone(rate);
  return (
    <div className="flex min-w-[150px] items-center gap-2.5">
      <div aria-hidden className="h-2 flex-1 overflow-hidden rounded bg-tl-line-soft">
        <div className={`h-full rounded ${TONE_FILL[tone]}`} style={{ width: `${Math.max(0, Math.min(100, rate ?? 0))}%` }} />
      </div>
      <span className={`w-[76px] shrink-0 text-right text-sm font-extrabold ${TONE_TEXT[tone]}`}>{formatRate(rate, "No records")}</span>
    </div>
  );
}

/**
 * Why the class could not be shown: another teacher's class (403) or one
 * that does not exist (404) is final; anything else can be retried.
 *
 * @param props - The roster's error and a retry.
 * @param props.error - What the roster request threw.
 * @param props.onRetry - Refetches the roster.
 * @returns The alert card.
 */
function ClassLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const status = error instanceof ApiError ? error.status : 0;
  const title = status === 403 ? "Not one of your classes" : status === 404 ? "Class not found" : "We could not load this class";
  const text =
    status === 403
      ? "You don't teach this class, so its attendance is not available to you. Pick one of your classes above."
      : status === 404
        ? "There is no class with this link in your school. Pick one of your classes above."
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
 * Grey blocks in the shape of the tiles and the student list.
 *
 * @param props - What is loading.
 * @param props.label - For screen readers.
 * @returns The skeleton.
 */
function HistorySkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-[18px]" role="status" aria-label={label}>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[84px] animate-pulse rounded-[18px] bg-tl-line/70" />
        ))}
      </div>
      <div className="h-[420px] animate-pulse rounded-[22px] bg-tl-line/70" />
    </div>
  );
}

/**
 * The redesigned Attendance history (`/analytics/attendance`): one class over
 * a period of school days. Filters: the class (`GET /teachers/me/classes`),
 * a quick period (this week, this month, this term) or any From and To up to
 * today. Six tiles total the class (rate, present, late, absent, on leave,
 * students below 90%), then one row per student with their rate and counts,
 * searchable and sortable (lowest first finds who needs a word). Data: the
 * roster (`GET /teachers/me/classes/:id/students`) and each student's figures
 * over the range (`GET /attendance/student/:id/kpis?startDate=&endDate=`,
 * the page's existing hook, one cached query per student). Late counts as
 * attended and approved leave is left out of the rate, as everywhere else.
 * `?studentId=` highlights that student (the record's "Full attendance
 * history"); a link with only a student finds their class. The address keeps
 * the class and any dates picked.
 *
 * @param props - See {@link AttendanceHistoryScreenProps}.
 * @param props.initial - The page's query.
 * @returns The screen.
 */
export function AttendanceHistoryScreen({ initial }: AttendanceHistoryScreenProps) {
  const router = useRouter();
  const classes = useMyClasses();
  const today = useTeacherToday();
  const term = useCurrentTerm();
  const todayDate = today.data?.date ?? localDayKey();
  const termStart = term.data?.startDate ?? null;

  // A link that names only a student: their figures say which class they are in.
  const lookup = useStudentAttendanceKpis(!initial.classId && initial.studentId ? initial.studentId : null);
  const [classId, setClassId] = useState<string | undefined>(initial.classId);
  const [picked, setPicked] = useState<Partial<DateRange> | null>(initial.from || initial.to ? { from: initial.from, to: initial.to } : null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<HistorySort>("name");
  const [highlight, setHighlight] = useState<string | undefined>(initial.studentId);
  const scrolledTo = useRef<string | null>(null);

  // A link or back/forward that changes the address moves the screen with it.
  useEffect(() => {
    if (initial.classId) setClassId(initial.classId);
    if (initial.from || initial.to) setPicked({ from: initial.from, to: initial.to });
    if (initial.studentId) setHighlight(initial.studentId);
  }, [initial.classId, initial.from, initial.to, initial.studentId]);

  const waitingForLookup = Boolean(!initial.classId && initial.studentId && lookup.isPending);
  const activeClassId = classId ?? lookup.data?.classInfo?.id ?? (waitingForLookup ? undefined : classes.data?.[0]?.id);

  // Until the term is known, "this term" cannot be the default yet.
  const defaultReady = term.isSuccess || term.isError;
  const fallback = presetRange("term", todayDate, termStart) ?? presetRange("month", todayDate, null);
  const shown: Partial<DateRange> = picked ?? (defaultReady ? (fallback ?? {}) : {});
  const problem = picked || defaultReady ? rangeProblem(shown, todayDate) : null;
  const range: DateRange | null = !problem && shown.from && shown.to ? { from: shown.from, to: shown.to } : null;
  const preset = range ? matchPreset(range, todayDate, termStart) : "custom";

  const roster = useClassRoster(activeClassId);
  const students = useMemo(() => roster.data?.students ?? [], [roster.data]);
  const results = useClassAttendanceKpis(
    students.map((s) => s.id),
    range,
  );

  const rows: HistoryRow[] = students.map((s, i) => historyRow(s, results[i]?.data));
  const failedIds = new Set(students.filter((_, i) => results[i]?.isError && !results[i]?.data).map((s) => s.id));
  const loadingCount = results.filter((r) => r.isPending && r.fetchStatus !== "idle").length;
  const failed = results.filter((r) => r.isError && !r.data);
  const totals = historyTotals(rows);
  const allLoaded = students.length > 0 && totals.loaded === students.length;
  const noRecords = allLoaded && totals.present + totals.late + totals.absent + totals.onLeave === 0;
  const visible = sortRows(filterRows(rows, search), sort);

  // Keep the address in step: the class, the dates when picked, and the highlighted student.
  useEffect(() => {
    if (!activeClassId || typeof window === "undefined") return;
    const target = historyHref({
      classId: activeClassId,
      from: picked && range ? range.from : undefined,
      to: picked && range ? range.to : undefined,
      studentId: highlight,
    });
    if (`${window.location.pathname}${window.location.search}` !== target) router.replace(target, { scroll: false });
  }, [activeClassId, picked, range?.from, range?.to, highlight, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bring the highlighted student into view once their row is there.
  const highlightLoaded = Boolean(highlight && rows.some((r) => r.id === highlight));
  useEffect(() => {
    if (!highlight || !highlightLoaded || scrolledTo.current === highlight) return;
    const row = typeof document !== "undefined" ? document.getElementById(historyRowId(highlight)) : null;
    if (row && typeof row.scrollIntoView === "function") row.scrollIntoView({ block: "center", behavior: "smooth" });
    scrolledTo.current = highlight;
  }, [highlight, highlightLoaded]);

  const pickClass = (id: string) => {
    setClassId(id);
    setHighlight(undefined);
    setSearch("");
  };
  const pickPreset = (key: (typeof HISTORY_PRESETS)[number]["key"]) => {
    const next = presetRange(key, todayDate, termStart);
    if (next) setPicked(next);
  };
  const setEnd = (end: "from" | "to", value: string) => setPicked({ ...shown, [end]: value });

  const options = classes.data ?? [];
  const unknownClass = Boolean(activeClassId) && !options.some((c) => c.id === activeClassId);
  const className = roster.data?.class.name ?? options.find((c) => c.id === activeClassId)?.name ?? "";

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3.5">
      <div>
        <h1 className={pageTitle}>Attendance history</h1>
        <p className="mt-[5px] text-[15px] text-tl-muted">
          Each student&apos;s attendance over a period. Late counts as attended; approved leave does not count against the rate.
        </p>
      </div>
      <Link href={activeClassId ? `/attendance?classId=${encodeURIComponent(activeClassId)}` : "/attendance"} className={ghostButton} title="Back to the morning register">
        Today&apos;s register
      </Link>
    </div>
  );

  if (classes.isPending) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <HistorySkeleton label="Loading your classes" />
      </div>
    );
  }

  if (classes.isError && !classes.data) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <div className={card} role="alert">
          <h2 className={cardTitle}>We could not load your classes</h2>
          <p className="mt-1.5 text-sm text-tl-muted">{getErrorMessage(classes.error, "Check your connection and try again.")}</p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => void classes.refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!activeClassId && !waitingForLookup) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <section className={card}>
          <h2 className={cardTitle}>No classes yet</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
            When the school office makes you a class teacher, or assigns you a subject, the class&apos;s attendance history shows here.
          </p>
        </section>
      </div>
    );
  }

  const inputClass = `min-h-[46px] w-full rounded-[13px] border bg-tl-surface px-3 text-[15px] font-bold text-tl-ink [color-scheme:light] dark:[color-scheme:dark] ${focusRing}`;
  const rangeError = problem ? "history-range-error" : undefined;

  return (
    <div className={`${pagePad} flex flex-col gap-[18px]`}>
      {header}

      <div
        data-guide="history-filters"
        className="flex flex-wrap items-end gap-3.5 rounded-[22px] border border-tl-line bg-tl-surface px-[18px] py-4 shadow-[0_1px_2px_rgba(15,27,46,0.04)] dark:shadow-none"
      >
        <div className="flex max-w-[320px] flex-[1_1_220px] flex-col gap-1.5">
          <label htmlFor="history-class" className="text-[13px] font-bold text-tl-muted">
            Class
          </label>
          <div className="relative">
            <select
              id="history-class"
              value={activeClassId ?? ""}
              onChange={(event) => pickClass(event.target.value)}
              title="Choose a class"
              className={`min-h-[46px] w-full cursor-pointer appearance-none rounded-[13px] border border-tl-control bg-tl-surface py-0 pl-3.5 pr-10 text-[15px] font-bold text-tl-ink ${focusRing}`}
            >
              {!activeClassId || unknownClass ? (
                <option value={activeClassId ?? ""} disabled>
                  {className || "Choose a class"}
                </option>
              ) : null}
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {classOptionLabel(c)}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tl-muted" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span id="history-period-label" className="text-[13px] font-bold text-tl-muted">
            Period
          </span>
          <div role="group" aria-labelledby="history-period-label" className={segmentTrack}>
            {HISTORY_PRESETS.map((p) => {
              const available = Boolean(presetRange(p.key, todayDate, termStart));
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={preset === p.key}
                  disabled={!available}
                  title={available ? p.tip : "The school office has not set the term's dates"}
                  onClick={() => pickPreset(p.key)}
                  className={`${segment(preset === p.key)} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-[1_1_300px] flex-wrap gap-2.5">
          <div className="flex min-w-[140px] flex-1 flex-col gap-1.5">
            <label htmlFor="history-from" className="text-[13px] font-bold text-tl-muted">
              From
            </label>
            <input
              id="history-from"
              type="date"
              value={shown.from ?? ""}
              max={todayDate}
              onChange={(event) => setEnd("from", event.target.value)}
              aria-invalid={Boolean(problem) || undefined}
              aria-describedby={rangeError}
              className={`${inputClass} ${problem ? "border-tl-danger" : "border-tl-control"}`}
            />
          </div>
          <div className="flex min-w-[140px] flex-1 flex-col gap-1.5">
            <label htmlFor="history-to" className="text-[13px] font-bold text-tl-muted">
              To
            </label>
            <input
              id="history-to"
              type="date"
              value={shown.to ?? ""}
              max={todayDate}
              onChange={(event) => setEnd("to", event.target.value)}
              aria-invalid={Boolean(problem) || undefined}
              aria-describedby={rangeError}
              className={`${inputClass} ${problem ? "border-tl-danger" : "border-tl-control"}`}
            />
          </div>
        </div>
        {problem ? (
          <p id="history-range-error" role="alert" className="basis-full text-[13px] font-bold text-tl-danger">
            {problem}
          </p>
        ) : null}
      </div>

      {waitingForLookup || roster.isPending || (!range && !problem) ? (
        <HistorySkeleton label="Loading attendance history" />
      ) : !roster.data ? (
        <ClassLoadError error={roster.error} onRetry={() => void roster.refetch()} />
      ) : problem ? (
        <section className={card}>
          <h2 className={cardTitle}>Check the dates</h2>
          <p className="mt-1.5 text-sm text-tl-muted">{problem} Pick a period above, or change From and To.</p>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold tracking-[-0.3px] text-tl-ink">
              {roster.data.class.name}
              {range ? <span className="font-bold text-tl-muted"> · {rangeText(range)}</span> : null}
            </h2>
            {loadingCount > 0 ? (
              <p className="text-[13px] font-bold text-tl-faint" aria-live="polite">
                Loading {students.length - loadingCount} of {students.length}…
              </p>
            ) : null}
          </div>

          <div data-guide="history-stats" className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]" aria-busy={loadingCount > 0 || undefined}>
            <StatTile
              label="Attendance rate"
              value={allLoaded ? formatRate(totals.rate, "—") : "…"}
              valueClass={`text-2xl ${TONE_TEXT[rateTone(allLoaded ? totals.rate : null)]}`}
              tip="Present and late, out of every marked day; approved leave is left out"
            />
            <StatTile label="Present" value={allLoaded ? totals.present : "…"} valueClass="text-2xl text-tl-success" tip="Student-days present on time" />
            <StatTile label="Late" value={allLoaded ? totals.late : "…"} valueClass="text-2xl text-tl-warning" tip="Late counts as attended" />
            <StatTile label="Absent" value={allLoaded ? totals.absent : "…"} valueClass="text-2xl text-tl-danger" tip="Parents were told on the day" />
            <StatTile label="On leave" value={allLoaded ? totals.onLeave : "…"} valueClass="text-2xl text-tl-accent" tip="Approved by the office; not counted against the rate" />
            <StatTile
              label={`Below ${ON_TRACK_RATE}%`}
              value={allLoaded ? totals.below : "…"}
              valueClass={`text-2xl ${totals.below > 0 ? "text-tl-danger" : "text-tl-ink"}`}
              tip={`Students whose rate over the period is under ${ON_TRACK_RATE}%`}
            />
          </div>

          <section className={cardFrame} aria-labelledby="history-students-title" data-guide="history-students">
            <div className="flex flex-wrap items-end gap-3 border-b border-tl-line-soft px-[18px] py-3.5">
              <h3 id="history-students-title" className={`${cardTitle} mr-auto`}>
                Students <span className="text-[15px] font-bold text-tl-faint">· {students.length}</span>
              </h3>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or admission number"
                aria-label="Search students by name or admission number"
                className={`min-h-[44px] min-w-[220px] flex-[1_1_240px] rounded-[13px] border border-tl-control bg-tl-surface px-3.5 font-semibold text-tl-ink placeholder:text-tl-faint ${focusRing}`}
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="history-sort" className="sr-only">
                  Order
                </label>
                <div className="relative">
                  <select
                    id="history-sort"
                    value={sort}
                    onChange={(event) => setSort(event.target.value as HistorySort)}
                    className={`min-h-[44px] cursor-pointer appearance-none rounded-[13px] border border-tl-control bg-tl-surface py-0 pl-3.5 pr-10 text-sm font-bold text-tl-ink ${focusRing}`}
                  >
                    <option value="name">By name</option>
                    <option value="lowest">Lowest attendance first</option>
                  </select>
                  <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tl-muted" />
                </div>
              </div>
            </div>

            {failed.length > 0 ? (
              <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-tl-line-soft bg-tl-danger-bg px-[18px] py-3 text-sm text-tl-ink">
                <p className="min-w-[200px] flex-1">
                  We could not load the attendance of {failed.length} {failed.length === 1 ? "student" : "students"}.
                </p>
                <button type="button" className={`${ghostButton} min-h-[44px]`} onClick={() => failed.forEach((r) => void r.refetch())}>
                  Try again
                </button>
              </div>
            ) : null}

            {noRecords ? (
              <p className="border-b border-tl-line-soft px-[18px] py-3 text-sm text-tl-muted">
                No registers were taken for {roster.data.class.name} in this period.
              </p>
            ) : null}

            {students.length === 0 ? (
              <p className="px-5 py-5 text-sm text-tl-muted">There are no students in {roster.data.class.name} yet. The school office adds them, and they will show here.</p>
            ) : visible.length === 0 ? (
              <p className="px-5 py-5 text-sm text-tl-muted">No students match that search.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <caption className="sr-only">
                      Attendance of each student in {roster.data.class.name}
                      {range ? `, ${rangeText(range)}` : ""}
                    </caption>
                    <thead>
                      <tr className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">
                        <th scope="col" className="px-5 py-3 font-extrabold">
                          Student
                        </th>
                        <th scope="col" className="w-[260px] px-3.5 py-3 font-extrabold">
                          Attendance rate
                        </th>
                        <th scope="col" className="w-[84px] px-3.5 py-3 text-right font-extrabold">
                          Present
                        </th>
                        <th scope="col" className="w-[70px] px-3.5 py-3 text-right font-extrabold">
                          Late
                        </th>
                        <th scope="col" className="w-[78px] px-3.5 py-3 text-right font-extrabold">
                          Absent
                        </th>
                        <th scope="col" className="w-[92px] px-5 py-3 text-right font-extrabold">
                          On leave
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row) => {
                        const on = row.id === highlight;
                        return (
                          <tr
                            key={row.id}
                            id={historyRowId(row.id)}
                            aria-current={on ? "true" : undefined}
                            className={`border-t border-tl-line-soft ${on ? "bg-tl-select" : ""}`}
                          >
                            <th scope="row" className="px-5 py-3 text-left font-normal">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar id={row.id} name={row.name} src={row.avatarUrl} size={36} />
                                <div className="min-w-0">
                                  <Link href={`/students/${encodeURIComponent(row.id)}`} className={`rounded text-[15px] font-bold text-tl-ink hover:underline ${focusRing}`}>
                                    {row.name}
                                  </Link>
                                  <div className="text-[13px] text-tl-muted">{row.admissionNumber ?? "No admission number"}</div>
                                </div>
                              </div>
                            </th>
                            {row.counts ? (
                              <>
                                <td className="px-3.5 py-3">
                                  <RateBar rate={row.rate} />
                                </td>
                                <td className="px-3.5 py-3 text-right text-sm font-bold text-tl-ink">{row.counts.present}</td>
                                <td className="px-3.5 py-3 text-right text-sm font-bold text-tl-ink">{row.counts.late}</td>
                                <td className="px-3.5 py-3 text-right text-sm font-bold text-tl-ink">{row.counts.absent}</td>
                                <td className="px-5 py-3 text-right text-sm font-bold text-tl-ink">{row.counts.onLeave}</td>
                              </>
                            ) : (
                              <td colSpan={5} className="px-3.5 py-3">
                                {failedIds.has(row.id) ? (
                                  <span className="text-sm font-bold text-tl-danger">Not loaded</span>
                                ) : (
                                  <div className="h-3 w-full animate-pulse rounded bg-tl-line/70">
                                    <span className="sr-only">Loading</span>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="md:hidden" aria-label={`Attendance of each student in ${roster.data.class.name}`}>
                  {visible.map((row) => {
                    const on = row.id === highlight;
                    return (
                      <li key={row.id} className={`border-t border-tl-line-soft px-[18px] py-3 first:border-t-0 ${on ? "bg-tl-select" : ""}`} aria-current={on ? "true" : undefined}>
                        <div className="flex items-center gap-3">
                          <Avatar id={row.id} name={row.name} src={row.avatarUrl} size={36} />
                          <Link href={`/students/${encodeURIComponent(row.id)}`} className={`min-w-0 flex-1 rounded text-[15px] font-bold text-tl-ink hover:underline ${focusRing}`}>
                            {row.name}
                          </Link>
                        </div>
                        {row.counts ? (
                          <>
                            <div className="mt-2">
                              <RateBar rate={row.rate} />
                            </div>
                            <p className="mt-1.5 text-[13px] text-tl-muted">
                              {row.counts.present} present · {row.counts.late} late · {row.counts.absent} absent · {row.counts.onLeave} on leave
                            </p>
                          </>
                        ) : failedIds.has(row.id) ? (
                          <p className="mt-2 text-sm font-bold text-tl-danger">Not loaded</p>
                        ) : (
                          <div className="mt-2 h-3 w-full animate-pulse rounded bg-tl-line/70" aria-hidden />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
