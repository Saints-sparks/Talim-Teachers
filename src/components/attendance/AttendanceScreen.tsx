"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { RegisterRow } from "@/components/attendance/RegisterRow";
import { StatTile } from "@/components/tl/StatTile";
import { card, cardTitle, focusRing, ghostButton, pagePad, pageTitle, primaryButton } from "@/components/tl/styles";
import {
  canEditRegister,
  canSubmitRegister,
  clampRegisterDate,
  countRegister,
  markRestPresent,
  progressText,
  registerBanner,
  registerHeading,
  registerProgress,
  stepSchoolDay,
  type RegisterBanner,
} from "@/hooks/attendance/register.logic";
import { useMyClasses, useRegisterEditor, useRegisterView, type DraftState } from "@/hooks/attendance/useRegister";
import { clockTime } from "@/hooks/today/today.logic";
import { useSchoolNow, useTeacherToday } from "@/hooks/today/useTeacherToday";
import { ApiError, getErrorMessage } from "@/lib/apiError";
import type { MyClass } from "@/types/classroom";

/** Props for {@link AttendanceScreen}. */
export interface AttendanceScreenProps {
  /** `?classId=` or the `/attendance/class/:classId` segment. */
  initialClassId?: string;
  /** `?date=` (`YYYY-MM-DD`); today when absent. */
  initialDate?: string;
}

const BANNER_TONE: Record<RegisterBanner["tone"], string> = {
  info: "bg-tl-select",
  success: "bg-tl-success-bg",
  warning: "bg-tl-warning-bg",
  danger: "bg-tl-danger-bg",
  neutral: "bg-tl-subtle border border-tl-line",
};

/**
 * "Name · class teacher" for the class picker.
 *
 * @param cls - The class.
 * @returns The option label.
 */
export function classOptionLabel(cls: Pick<MyClass, "name" | "role">): string {
  return `${cls.name} · ${cls.role === "class_teacher" ? "class teacher" : "subject teacher"}`;
}

/**
 * The draft indicator's text.
 *
 * @param draft - The draft state.
 * @returns What to show, or an empty string.
 */
function draftText(draft: DraftState): string {
  if (draft.kind === "saving") return "Saving draft…";
  if (draft.kind === "saved") return "Draft saved";
  if (draft.kind === "error") return "Draft not saved";
  return "";
}

/**
 * Grey blocks while the register loads.
 *
 * @returns The skeleton.
 */
function RegisterSkeleton() {
  return (
    <div className="flex flex-col gap-[18px]" role="status" aria-label="Loading the register">
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[84px] animate-pulse rounded-[18px] bg-tl-line/70" />
        ))}
      </div>
      <div className="h-[420px] animate-pulse rounded-[22px] bg-tl-line/70" />
    </div>
  );
}

/**
 * The redesigned Attendance screen: the morning register of one class on one
 * day. Class picker (`GET /teachers/me/classes`), school-day navigation
 * clamped to the term and today, a banner for every access state, five
 * counts, search and "Mark the rest present", one row per student, and a
 * sticky footer to submit. Marks save as a draft while the register is open;
 * the URL keeps `?classId=&date=` so a reload or a shared link lands on the
 * same register.
 *
 * @param props - See {@link AttendanceScreenProps}.
 * @returns The screen.
 */
export function AttendanceScreen({ initialClassId, initialDate }: AttendanceScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const classes = useMyClasses();
  const today = useTeacherToday();
  const [classId, setClassId] = useState<string | undefined>(initialClassId);
  const [date, setDate] = useState<string | undefined>(initialDate);
  const [search, setSearch] = useState("");

  // A link or back/forward that changes the address moves the screen with it.
  useEffect(() => {
    if (initialClassId) setClassId(initialClassId);
    setDate(initialDate);
  }, [initialClassId, initialDate]);

  // No class in the URL: open the first one (class-teacher classes come first).
  const activeClassId = classId ?? classes.data?.[0]?.id;
  const register = useRegisterView(activeClassId, date);
  const view = register.isPlaceholderData ? undefined : register.data;
  const shown = register.data;
  const editor = useRegisterEditor(view, date);
  const nowMs = useSchoolNow(today.data?.now, today.dataUpdatedAt);
  const timezone = today.data?.timezone ?? "Africa/Lagos";

  // Keep the address in step so reloads and shared links land here. The
  // `/attendance/class/:id?date=` links from Today stay as they are until the
  // teacher picks another class or day.
  useEffect(() => {
    if (!activeClassId || typeof window === "undefined") return;
    const onClassRoute = Boolean(pathname?.startsWith("/attendance/class/"));
    if (onClassRoute && classId === initialClassId && date === initialDate) return;
    const params = new URLSearchParams({ classId: activeClassId });
    if (date) params.set("date", date);
    const target = `/attendance?${params.toString()}`;
    if (`${window.location.pathname}${window.location.search}` !== target) router.replace(target, { scroll: false });
  }, [activeClassId, date, pathname, router, classId, initialClassId, initialDate]);

  const todayDate = today.data?.date ?? (shown?.isToday ? shown.date : undefined);
  const bounds = { min: shown?.term?.startDate, max: todayDate };
  const current = shown?.date ?? date ?? todayDate;
  const prev = current ? stepSchoolDay(current, -1, bounds) : null;
  const next = current ? stepSchoolDay(current, 1, bounds) : null;
  const notToday = Boolean(date) && date !== todayDate;

  const pickDate = (value: string) => {
    const result = clampRegisterDate(value, bounds);
    if (!result) return;
    if (result.snapped) toast.info("There is no register at weekends. Showing Friday instead.");
    setDate(result.date === todayDate ? undefined : result.date);
    setSearch("");
  };

  const pickClass = (id: string) => {
    setClassId(id);
    setSearch("");
  };

  // While the next class or day loads, the previous register stays on screen (dimmed, read-only).
  const students = view ? editor.students : (shown?.students ?? []);
  const editable = view ? canEditRegister(view, editor.editing) : false;
  const counts = useMemo(() => countRegister(students), [students]);
  const progress = registerProgress(students);
  const footer = progressText(progress, editor.toNotify);
  const canSubmit = view ? canSubmitRegister(view, editor.editing, students) : false;
  const banner = view ? registerBanner(view, editor.editing, nowMs, timezone) : null;
  const q = search.trim().toLowerCase();
  const rows = q ? students.filter((s) => s.name.toLowerCase().includes(q) || (s.admissionNumber ?? "").toLowerCase().includes(q)) : students;
  const closeTime = shown ? clockTime(shown.closesAt, timezone) : "11:00am";

  const options = classes.data ?? [];
  const pickerOptions =
    activeClassId && shown && !options.some((c) => c.id === activeClassId)
      ? [...options, { id: shown.class.id, name: shown.class.name, role: "subject_teacher" as const, studentCount: shown.students.length, capacity: null, courses: [] }]
      : options;

  const header = (
    <div>
      <h1 className={pageTitle}>Attendance</h1>
      <p className="mt-[5px] text-[15px] text-tl-muted">
        Morning register. Registers close at {closeTime} and parents of absent students are told the same morning.
      </p>
    </div>
  );

  if (classes.isPending) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <RegisterSkeleton />
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

  if (!activeClassId) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <section className={card}>
          <h2 className={cardTitle}>No classes yet</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
            When the school office makes you a class teacher, or assigns you a subject, the class&apos;s register shows here.
          </p>
        </section>
      </div>
    );
  }

  const navArrow = `flex w-11 shrink-0 items-center justify-center hover:bg-tl-bg disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

  return (
    <div className={`${pagePad} flex flex-col gap-[18px] pb-[70px]`}>
      {header}

      <div
        data-guide="attendance-controls"
        className="flex flex-wrap items-end gap-3.5 rounded-[22px] border border-tl-line bg-tl-surface px-[18px] py-4 shadow-[0_1px_2px_rgba(15,27,46,0.04)] dark:shadow-none"
      >
        <div className="flex max-w-[320px] flex-[1_1_220px] flex-col gap-1.5">
          <label htmlFor="att-class" className="text-[13px] font-bold text-tl-muted">
            Class
          </label>
          <div className="relative">
            <select
              id="att-class"
              value={activeClassId}
              onChange={(event) => pickClass(event.target.value)}
              title="Choose a class register"
              className={`min-h-[46px] w-full cursor-pointer appearance-none rounded-[13px] border border-tl-control bg-tl-surface py-0 pl-3.5 pr-10 text-[15px] font-bold text-tl-ink ${focusRing}`}
            >
              {pickerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {classOptionLabel(c)}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tl-muted" />
          </div>
        </div>
        <div className="flex max-w-[340px] flex-[1_1_260px] flex-col gap-1.5">
          <label htmlFor="att-date" className="text-[13px] font-bold text-tl-muted">
            Date
          </label>
          <div className="flex min-h-[46px] items-stretch overflow-hidden rounded-[13px] border border-tl-control bg-tl-surface">
            <button type="button" className={navArrow} onClick={() => prev && pickDate(prev)} disabled={!prev} aria-label="Previous school day" title="Previous school day">
              <ChevronLeft className="h-4 w-4 text-tl-brand" aria-hidden />
            </button>
            <input
              id="att-date"
              type="date"
              value={current ?? ""}
              min={bounds.min}
              max={bounds.max}
              onChange={(event) => pickDate(event.target.value)}
              title={bounds.min ? "Any school day this term, up to today" : "Any school day up to today"}
              className={`min-w-0 flex-1 border-x border-y-0 border-tl-line-soft bg-tl-surface px-3 text-[15px] font-bold text-tl-ink [color-scheme:light] dark:[color-scheme:dark] ${focusRing}`}
            />
            <button type="button" className={navArrow} onClick={() => next && pickDate(next)} disabled={!next} aria-label="Next school day" title="Next school day">
              <ChevronRight className="h-4 w-4 text-tl-brand" aria-hidden />
            </button>
          </div>
        </div>
        {notToday ? (
          <button type="button" className={`${ghostButton} min-h-[46px] rounded-[13px] px-4`} onClick={() => setDate(undefined)} title="Jump back to today's register">
            Back to today
          </button>
        ) : null}
      </div>

      {register.isPending || (register.isPlaceholderData && !shown) ? (
        <RegisterSkeleton />
      ) : register.isError && !shown ? (
        <div className={card} role="alert">
          <h2 className={cardTitle}>We could not load this register</h2>
          <p className="mt-1.5 text-sm text-tl-muted">
            {register.error instanceof ApiError && register.error.status === 403
              ? "You don't teach this class, so its register is not available to you."
              : getErrorMessage(register.error, "Check your connection and try again.")}
          </p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => void register.refetch()}>
            Try again
          </button>
        </div>
      ) : shown ? (
        <div className={`flex flex-col gap-[18px] ${register.isPlaceholderData ? "opacity-60" : ""}`} aria-busy={register.isPlaceholderData || undefined}>
          {banner ? (
            <div role="status" data-guide="attendance-banner" className={`flex flex-wrap items-center gap-3.5 rounded-[18px] px-[18px] py-3.5 text-tl-ink ${BANNER_TONE[banner.tone]}`}>
              <p className="min-w-[220px] flex-1 text-sm leading-[1.55]">{banner.text}</p>
              {banner.action ? (
                <button
                  type="button"
                  className={`inline-flex min-h-[44px] items-center rounded-xl border border-tl-control bg-tl-surface px-[15px] text-sm font-bold text-tl-brand hover:bg-tl-bg ${focusRing}`}
                  onClick={banner.action === "edit" ? editor.startEditing : editor.cancelEditing}
                >
                  {banner.action === "edit" ? "Edit register" : "Cancel"}
                </button>
              ) : null}
            </div>
          ) : null}

          <div data-guide="attendance-stats" className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
            <StatTile label="Present" value={counts.present} valueClass="text-2xl text-tl-success" tip="Late students are counted separately" />
            <StatTile label="Late" value={counts.late} valueClass="text-2xl text-tl-warning" tip="Late counts as attended" />
            <StatTile label="Absent" value={counts.absent} valueClass="text-2xl text-tl-danger" tip="Parents are told when the register is submitted" />
            <StatTile label="On leave" value={counts.onLeave} valueClass="text-2xl text-tl-accent" tip="Approved by the office. Does not count against attendance." />
            <StatTile label="Not marked" value={counts.unmarked} valueClass="text-2xl text-tl-muted" tip="Everyone must be marked before you submit" />
          </div>

          <section className={card} aria-labelledby="register-title" data-guide="attendance-register">
            <div className="px-1 pb-3.5">
              <h2 id="register-title" className={cardTitle}>
                {registerHeading(shown)}
              </h2>
            </div>
            {shown.students.length === 0 ? (
              <p className="border-t border-tl-line-soft px-1 pt-4 text-sm text-tl-muted">
                There are no students in this class yet. The school office adds them, and they will show here.
              </p>
            ) : (
              <>
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or admission number"
                    aria-label="Search the register by name or admission number"
                    title="Filter the register"
                    className={`min-h-[44px] min-w-[220px] flex-1 rounded-[13px] border border-tl-control bg-tl-surface px-3.5 font-semibold text-tl-ink placeholder:text-tl-faint ${focusRing}`}
                  />
                  {editable ? (
                    <button
                      type="button"
                      data-guide="attendance-mark-all"
                      className={`${ghostButton} rounded-xl px-4 py-2.5`}
                      title="Marks everyone not yet marked as present. You can still change individuals afterwards."
                      onClick={() => editor.markRest((overlay) => markRestPresent(students, overlay))}
                      disabled={progress.marked === progress.markable}
                    >
                      Mark the rest present
                    </button>
                  ) : null}
                </div>
                <ul aria-label={`Students in ${shown.class.name}`} data-guide="attendance-rows">
                  {rows.map((student) => (
                    <RegisterRow key={student.id} student={student} editable={editable} onMark={editor.setMark} />
                  ))}
                </ul>
                {rows.length === 0 ? <p className="border-t border-tl-line-soft px-1 pt-4 text-sm text-tl-muted">No students match that search.</p> : null}
              </>
            )}
          </section>

          {editable && shown.students.length > 0 ? (
            <div
              data-print-hide
              data-guide="attendance-submit"
              className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3.5 rounded-[18px] border border-tl-line bg-tl-surface py-3 pl-5 pr-3.5 text-tl-ink shadow-[0_18px_40px_-20px_rgba(15,27,46,0.35)]"
            >
              <div className="min-w-[180px] flex-1">
                <div className="text-[15px] font-extrabold" aria-live="polite">
                  {footer.headline}
                </div>
                <div className="mt-0.5 text-[13px] text-tl-muted">{footer.note}</div>
              </div>
              <div className="flex items-center gap-2 text-[13px] font-bold" aria-live="polite">
                {editor.draft.kind === "error" ? (
                  <>
                    <span className="text-tl-danger" title={editor.draft.message}>
                      {draftText(editor.draft)}
                    </span>
                    <button type="button" className={`min-h-[44px] rounded-lg px-2 text-tl-link underline ${focusRing}`} onClick={editor.retryDraft}>
                      Retry
                    </button>
                  </>
                ) : (
                  <span className="text-tl-faint">{draftText(editor.draft)}</span>
                )}
              </div>
              <button
                type="button"
                className={`${primaryButton} min-h-[46px] rounded-[13px] px-5 font-extrabold`}
                onClick={() => void editor.submit()}
                disabled={!canSubmit || editor.submitting}
                title={progress.allMarked ? "Send the register to the school office" : "Mark every student first"}
              >
                {editor.submitting ? "Submitting…" : editor.editing ? "Resubmit register" : "Submit register"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
