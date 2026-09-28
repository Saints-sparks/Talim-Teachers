"use client";

import React from "react";
import Link from "next/link";
import { card, cardTitle, pill, rowButton, textLink, focusRing } from "@/components/tl/styles";
import { clockTime } from "@/hooks/today/today.logic";
import { TONE_DOT, attentionHref, setupStepHref } from "@/hooks/today/today.routes";
import type { AttentionItem, SetupStep, TodayClass } from "@/types/today";

/**
 * "Needs your attention": what is outstanding, most urgent first, each with
 * one action. "You are all caught up for today." when nothing is.
 *
 * @param props - The items.
 * @param props.items - `attention[]` from Today.
 * @returns The card.
 */
export function AttentionCard({ items }: { items: AttentionItem[] }) {
  return (
    <section aria-labelledby="attention-title" className={card}>
      <div className="mb-1 flex items-baseline justify-between gap-2.5">
        <h2 id="attention-title" className={cardTitle}>
          Needs your attention
        </h2>
        {items.length ? <div className="text-[13px] font-bold text-tl-faint">{items.length} open</div> : null}
      </div>
      {items.length === 0 ? (
        <p className="pb-1 pt-[18px] text-sm text-tl-muted">You are all caught up for today.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3.5 border-t border-tl-line-soft py-3.5">
              <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[item.tone] ?? "tl-dot-neutral"}`} />
              <div className="min-w-[200px] flex-1">
                <div className="text-[15px] font-bold text-tl-ink">{item.title}</div>
                <div className="mt-[3px] text-[13px] leading-normal text-tl-muted">{item.description}</div>
              </div>
              <Link href={attentionHref(item.action.target)} className={rowButton}>
                {item.action.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Props for {@link SetupCard}. */
export interface SetupCardProps {
  percent: number;
  steps: SetupStep[];
  /** Opens the portal tour; the tour step is hidden without it. */
  onTour?: () => void;
  /** Opens the resource upload. */
  onUpload: () => void;
}

/**
 * "Finish setting up": progress through the six first-week steps. Hidden by
 * the caller at 100%.
 *
 * @param props - See {@link SetupCardProps}.
 * @returns The card.
 */
export function SetupCard({ percent, steps, onTour, onUpload }: SetupCardProps) {
  const done = steps.filter((s) => s.done).length;
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const stepClass = `flex min-h-[44px] items-center gap-[7px] rounded-xl px-[13px] py-[9px] text-[13px] font-bold`;
  return (
    <section aria-labelledby="setup-title" className={card}>
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <h2 id="setup-title" className={cardTitle}>
            Finish setting up
          </h2>
          <p className="mt-1 text-[13px] text-tl-muted">
            {done} of {steps.length} done. Each step takes a minute or two.
          </p>
        </div>
        <div className="text-[22px] font-extrabold text-tl-brand">{pct}%</div>
      </div>
      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-3.5 h-2 overflow-hidden rounded bg-tl-line-soft"
      >
        <div className="h-full rounded bg-tl-brand-fill" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {steps.map((step) => {
          if (step.done) {
            return (
              <li key={step.key} className={`${stepClass} bg-tl-success-bg text-tl-success`}>
                <span aria-hidden>✓</span>
                <span>
                  {step.label}
                  <span className="sr-only"> (done)</span>
                </span>
              </li>
            );
          }
          const todo = `${stepClass} border border-tl-control bg-tl-surface text-tl-brand hover:bg-tl-bg ${focusRing}`;
          const content = (
            <>
              <span aria-hidden>○</span>
              <span>{step.label}</span>
            </>
          );
          if (step.key === "tour") {
            return onTour ? (
              <li key={step.key}>
                <button type="button" className={todo} onClick={onTour} title="Do this now">
                  {content}
                </button>
              </li>
            ) : null;
          }
          if (step.key === "resource") {
            return (
              <li key={step.key}>
                <button type="button" className={todo} onClick={onUpload} title="Do this now">
                  {content}
                </button>
              </li>
            );
          }
          const href = setupStepHref(step.key);
          return href ? (
            <li key={step.key}>
              <Link href={href} className={todo} title="Do this now">
                {content}
              </Link>
            </li>
          ) : null;
        })}
      </ul>
    </section>
  );
}

/**
 * One card per class: role, roster against capacity, term attendance and,
 * for the class-teacher class, today's register.
 *
 * @param props - The class and the school's timezone.
 * @param props.cls - The class.
 * @param props.timezone - For the register's submitted time.
 * @returns The card.
 */
export function ClassCard({ cls, timezone }: { cls: TodayClass; timezone: string }) {
  const submitted = cls.register?.submittedAt;
  return (
    <section aria-label={cls.name} className={`${card} flex flex-col gap-3`}>
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="text-xl font-extrabold tracking-[-0.3px] text-tl-ink">{cls.name}</h2>
        <span className={`${pill} ${cls.role === "class_teacher" ? "bg-tl-select text-tl-brand" : "bg-tl-track text-tl-muted"}`}>
          {cls.role === "class_teacher" ? "Class teacher" : "Subject teacher"}
        </span>
      </div>
      <dl className="flex flex-col">
        <div className="flex justify-between gap-2.5 border-t border-tl-line-soft pt-2.5 text-sm">
          <dt className="text-tl-muted">Students</dt>
          <dd className="font-extrabold text-tl-ink">{cls.capacity ? `${cls.studentCount} of ${cls.capacity}` : cls.studentCount}</dd>
        </div>
        <div className="mt-2.5 flex justify-between gap-2.5 border-t border-tl-line-soft pt-2.5 text-sm">
          <dt className="text-tl-muted">Attendance this term</dt>
          <dd className="font-extrabold text-tl-ink">{cls.attendanceRateTerm === null ? "No records yet" : `${Math.round(cls.attendanceRateTerm)}%`}</dd>
        </div>
        {cls.register ? (
          <div className="mt-2.5 flex justify-between gap-2.5 border-t border-tl-line-soft pt-2.5 text-sm">
            <dt className="text-tl-muted">Today&apos;s register</dt>
            <dd className={`font-extrabold ${submitted ? "text-tl-success" : "text-tl-warning"}`}>
              {submitted ? `Submitted ${clockTime(submitted, timezone)}` : "Not submitted"}
            </dd>
          </div>
        ) : null}
      </dl>
      <Link href="/students" className={textLink} title="Roster, guardians and each student's record">
        Open class →
      </Link>
    </section>
  );
}
