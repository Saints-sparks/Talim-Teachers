"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/tl/Avatar";
import { StatTile } from "@/components/tl/StatTile";
import { card, cardTitle, focusRing, ghostButton, pagePad, pill, primaryButton, textLink } from "@/components/tl/styles";
import {
  SCORE_STATUS,
  courseSummary,
  formatRate,
  guardianDetails,
  scoreBar,
  studentDetails,
  telHref,
} from "@/hooks/students/students.logic";
import { useMessageGuardian, useStudentRecord } from "@/hooks/students/useClassroomStudents";
import { ApiError, getErrorMessage } from "@/lib/apiError";
import type { StudentCourseScores, StudentRecord } from "@/types/classroom";

const sectionTitle = "text-base font-extrabold text-tl-ink";

/**
 * One course's scores: header with Total, Grade and Position, one row per
 * assessment with the score bar and class-average marker, and a note.
 *
 * @param props - The course's scores and the student's first name.
 * @param props.course - The course's scores.
 * @param props.firstName - For the bar's tip.
 * @returns The block.
 */
export function CourseScores({ course, firstName }: { course: StudentCourseScores; firstName: string }) {
  const summary = courseSummary(course);
  const label = `${course.course.title} · ${course.className}`;
  return (
    <section aria-label={label} className="mt-4 overflow-hidden rounded-[18px] border border-tl-line-soft">
      <div className="flex flex-wrap items-center gap-3.5 border-b border-tl-line-soft bg-tl-subtle px-[18px] py-4">
        <h3 className="min-w-[160px] flex-1 text-[15px] font-extrabold text-tl-ink">{label}</h3>
        <dl className="flex gap-[22px]">
          {[
            ["Total", summary.total],
            ["Grade", summary.grade],
            ["Position", summary.position],
          ].map(([term, value]) => (
            <div key={term}>
              <dt className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">{term}</dt>
              <dd className="mt-[3px] text-lg font-extrabold text-tl-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ul>
        {course.assessments.map((a) => {
          const bar = scoreBar(a, firstName);
          const status = SCORE_STATUS[a.status];
          return (
            <li
              key={a.id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3.5 gap-y-2 border-t border-tl-line-soft px-[18px] py-3.5 first:border-t-0 sm:grid-cols-[minmax(110px,150px)_minmax(120px,1fr)_64px_84px_110px]"
            >
              <div>
                <div className="text-sm font-bold text-tl-ink">{a.name}</div>
                <div className="mt-0.5 text-xs text-tl-faint">{bar.max}</div>
              </div>
              <div
                role="img"
                aria-label={bar.tip}
                title={bar.tip}
                className="relative col-span-2 row-start-2 h-2 rounded bg-tl-line-soft sm:col-span-1 sm:row-start-auto"
              >
                <div className="absolute inset-y-0 left-0 rounded bg-tl-brand-fill" style={{ width: `${bar.fillPercent}%` }} data-testid="score-fill" />
                {bar.averagePercent !== null ? (
                  <div
                    className="absolute -bottom-1 -top-1 w-0.5 rounded-[1px] bg-[#E0A33B]"
                    style={{ left: `calc(${bar.averagePercent}% - 1px)` }}
                    data-testid="score-average"
                  />
                ) : null}
              </div>
              <div className="hidden text-right text-base font-extrabold text-tl-ink sm:block">{bar.score}</div>
              <div className="hidden text-right text-[13px] text-tl-muted sm:block" title="Class average">
                avg {bar.average}
              </div>
              <div className="flex items-center justify-end gap-3 text-right">
                <span className="text-base font-extrabold text-tl-ink sm:hidden">{bar.score}</span>
                <span className={`${pill} ${status.className}`}>{status.label}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-tl-line-soft px-[18px] py-3 text-[13px] text-tl-muted">{summary.note}</p>
    </section>
  );
}

/**
 * The record itself, once loaded.
 *
 * @param props - The record.
 * @param props.record - `GET /teachers/me/students/:id`.
 * @returns The page body.
 */
export function StudentRecordView({ record }: { record: StudentRecord }) {
  const message = useMessageGuardian();
  const { student, guardian, attendance } = record;
  const tel = telHref(guardian?.phone);
  const classHref = `/students?classId=${encodeURIComponent(student.class.id)}`;

  return (
    <div className={`${pagePad} flex flex-col gap-[18px]`}>
      <Link href={classHref} className={`flex min-h-[44px] w-max items-center gap-2 rounded text-sm font-bold text-tl-link hover:underline ${focusRing}`} title="Back to the student list">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        <span>Students · {student.class.name}</span>
      </Link>

      <section className={card} data-guide="student-header" aria-labelledby="student-name">
        <div className="flex flex-wrap items-center gap-[18px]">
          <Avatar id={student.id} name={student.name} src={student.avatarUrl} size={70} />
          <div className="min-w-[200px] flex-1">
            <h1 id="student-name" className="m-0 text-[clamp(22px,3vw,28px)] font-extrabold tracking-[-0.5px] text-tl-ink">
              {student.name}
            </h1>
            <p className="mt-1 text-sm text-tl-muted">
              Student · {student.class.name} · {record.school.name}
            </p>
          </div>
        </div>
        <h2 className={`${sectionTitle} mt-[22px]`}>Student details</h2>
        <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-tl-line-soft pt-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))]">
          {studentDetails(record).map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-bold uppercase tracking-[0.05em] text-tl-faint">{f.label}</dt>
              <dd className="mt-1 break-words text-[15px] font-bold text-tl-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={card} data-guide="student-guardian" aria-labelledby="guardian-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="guardian-title" className={sectionTitle}>
              Guardian
            </h2>
            <p className="mt-[3px] text-[13px] text-tl-muted">Held by the school office. Ask them to correct anything that looks wrong.</p>
          </div>
          {guardian ? (
            <div className="flex gap-2.5">
              {tel ? (
                <a href={tel} className={`${ghostButton} rounded-xl px-4`} title="Call the guardian">
                  Call
                </a>
              ) : (
                <button type="button" className={`${ghostButton} rounded-xl px-4`} disabled title="No phone number on record">
                  Call
                </button>
              )}
              <button
                type="button"
                className={`${primaryButton} rounded-xl px-4`}
                disabled={!guardian.userId || message.isPending}
                title={guardian.userId ? "Open a conversation with the guardian" : "This guardian has no Talim account yet, so they cannot be messaged"}
                onClick={() => guardian.userId && message.mutate(guardian.userId)}
              >
                {message.isPending ? "Opening…" : "Message"}
              </button>
            </div>
          ) : null}
        </div>
        {guardian ? (
          <dl className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
            {guardianDetails(guardian).map((f) => (
              <div key={f.label} className="rounded-2xl border border-tl-line-soft bg-tl-subtle p-4">
                <dt className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">{f.label}</dt>
                <dd className="mt-1.5 break-words text-[15px] font-bold text-tl-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-4 text-sm text-tl-muted">No guardian is on record for {student.firstName || student.name}. Ask the school office to add one.</p>
        )}
      </section>

      <section className={card} data-guide="student-attendance" aria-labelledby="attendance-title">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 id="attendance-title" className={sectionTitle}>
              Attendance this term
            </h2>
            <p className="mt-[3px] text-[13px] text-tl-muted">
              {attendance.schoolDays} school {attendance.schoolDays === 1 ? "day" : "days"} so far. Approved leave does not count against the rate.
            </p>
          </div>
          <div className="text-[28px] font-extrabold tracking-[-0.5px] text-tl-brand">{formatRate(attendance.rate, "—")}</div>
        </div>
        <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
          <StatTile subtle label="Present" value={attendance.present} valueClass="text-2xl text-tl-success" tip="Arrived on time" />
          <StatTile subtle label="Late" value={attendance.late} valueClass="text-2xl text-tl-warning" tip="Counts as attended" />
          <StatTile subtle label="Absent" value={attendance.absent} valueClass="text-2xl text-tl-danger" tip="Parents are told the same day" />
          <StatTile subtle label="On leave" value={attendance.onLeave} valueClass="text-2xl text-tl-accent" tip="Approved by the school office" />
        </div>
        <Link
          href={`/analytics/attendance?studentId=${encodeURIComponent(student.id)}&classId=${encodeURIComponent(student.class.id)}`}
          className={`${textLink} mt-2`}
          title="Day-by-day attendance and trends"
        >
          Full attendance history →
        </Link>
      </section>

      <section className={card} data-guide="student-scores" aria-labelledby="scores-title">
        <h2 id="scores-title" className={sectionTitle}>
          Scores in your subjects
        </h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-3.5 text-[13px] text-tl-muted" aria-hidden>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-3.5 rounded-[3px] bg-tl-brand-fill" />
            {student.firstName || student.name}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 rounded-[1px] bg-[#E0A33B]" />
            Class average
          </span>
        </div>
        {record.scores.length === 0 ? (
          <p className="mt-4 text-sm text-tl-muted">You don&apos;t teach {student.firstName || student.name} a subject this term, so there are no scores to show.</p>
        ) : (
          record.scores.map((c) => <CourseScores key={c.course.id} course={c} firstName={student.firstName || student.name} />)
        )}
      </section>
    </div>
  );
}

/**
 * The student record page (`/students/:id`): loading, the two refusals the
 * API distinguishes (403 not your class, 404 not found), then the record.
 *
 * @param props - The student id from the route.
 * @param props.studentId - The student.
 * @returns The screen.
 */
export function StudentRecordScreen({ studentId }: { studentId: string | undefined }) {
  const record = useStudentRecord(studentId);

  if (record.isPending) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`} role="status" aria-label="Loading the student's record">
        <div className="h-6 w-40 animate-pulse rounded bg-tl-line/70" />
        <div className="h-[260px] animate-pulse rounded-[22px] bg-tl-line/70" />
        <div className="h-[220px] animate-pulse rounded-[22px] bg-tl-line/70" />
      </div>
    );
  }

  if (!record.data) {
    const status = record.error instanceof ApiError ? record.error.status : 0;
    const title = status === 404 ? "Student not found" : status === 403 ? "Not one of your students" : "We could not load this record";
    const text =
      status === 404
        ? "There is no student with this link in your school."
        : status === 403
          ? "This student is not in a class you teach, so their record is not available to you."
          : getErrorMessage(record.error, "Check your connection and try again.");
    return (
      <div className={pagePad}>
        <div className={card} role="alert">
          <h1 className={cardTitle}>{title}</h1>
          <p className="mt-1.5 text-sm text-tl-muted">{text}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {status !== 403 && status !== 404 ? (
              <button type="button" className={primaryButton} onClick={() => void record.refetch()}>
                Try again
              </button>
            ) : null}
            <Link href="/students" className={ghostButton}>
              Back to Students
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <StudentRecordView record={record.data} />;
}
