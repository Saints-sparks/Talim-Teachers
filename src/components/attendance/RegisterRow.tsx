"use client";

import React, { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar } from "@/components/tl/Avatar";
import { focusRing, pill } from "@/components/tl/styles";
import { ABSENCE_REASONS, STATUS_LABEL, type LocalMark } from "@/hooks/attendance/register.logic";
import type { MarkStatus, RegisterStudent } from "@/types/classroom";

const OPTIONS: MarkStatus[] = ["present", "late", "absent"];

/** Selected colours per mark (design `segStyle`). */
const ON: Record<MarkStatus, string> = {
  present: "bg-tl-success-bg text-tl-success shadow-[0_1px_2px_rgba(15,27,46,0.08)]",
  late: "bg-tl-warning-bg text-tl-warning shadow-[0_1px_2px_rgba(15,27,46,0.08)]",
  absent: "bg-tl-danger-bg text-tl-danger shadow-[0_1px_2px_rgba(15,27,46,0.08)]",
};

/** Read-only pill colours per status (design `PST`). */
export const STATUS_PILL: Record<NonNullable<RegisterStudent["status"]> | "none", string> = {
  present: "bg-tl-success-bg text-tl-success",
  late: "bg-tl-warning-bg text-tl-warning",
  absent: "bg-tl-danger-bg text-tl-danger",
  on_leave: "bg-tl-accent-bg text-tl-accent",
  none: "bg-tl-track text-tl-muted",
};

/** Props for {@link StatusSegment}. */
export interface StatusSegmentProps {
  /** Who is being marked (the group's accessible name). */
  name: string;
  firstName: string;
  value: MarkStatus | null;
  onChange: (status: MarkStatus) => void;
}

/**
 * Present / Late / Absent as a radio group: one tab stop, arrow keys (and
 * Home/End) move and select, Space or Enter selects. Each option is a 44px
 * target.
 *
 * @param props - See {@link StatusSegmentProps}.
 * @returns The segmented control.
 */
export function StatusSegment({ name, firstName, value, onChange }: StatusSegmentProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIndex = value ? OPTIONS.indexOf(value) : 0;

  const move = (index: number) => {
    const next = (index + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[next]);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      move(0);
    } else if (event.key === "End") {
      event.preventDefault();
      move(OPTIONS.length - 1);
    }
  };

  return (
    <div role="radiogroup" aria-label={`Attendance for ${name}`} className="flex gap-0.5 rounded-xl bg-tl-track p-[3px]">
      {OPTIONS.map((option, i) => {
        const checked = value === option;
        return (
          <button
            key={option}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={i === focusIndex ? 0 : -1}
            title={`Mark ${firstName} ${STATUS_LABEL[option].toLowerCase()}`}
            onClick={() => onChange(option)}
            onKeyDown={(event) => onKeyDown(event, i)}
            className={`flex min-h-[44px] items-center rounded-[9px] px-3.5 text-sm font-bold ${focusRing} ${checked ? ON[option] : "bg-transparent text-tl-muted hover:text-tl-ink"}`}
          >
            {STATUS_LABEL[option]}
          </button>
        );
      })}
    </div>
  );
}

/** Props for {@link RegisterRow}. */
export interface RegisterRowProps {
  student: RegisterStudent;
  /** Whether the teacher can mark right now. */
  editable: boolean;
  onMark: (studentId: string, patch: Partial<LocalMark>) => void;
}

/**
 * One student on the register: avatar, name and admission number, then the
 * segmented control (or a read-only pill). A student on approved leave is
 * locked with who asked for it; an absent student gets the reason and a note
 * for the school office.
 *
 * @param props - See {@link RegisterRowProps}.
 * @returns The row.
 */
export function RegisterRow({ student, editable, onMark }: RegisterRowProps) {
  const onLeave = student.status === "on_leave";
  const canMark = editable && !onLeave;
  const statusKey = student.status ?? "none";

  let extra = "";
  if (onLeave) {
    extra = `Leave approved by the school office${student.leave?.requestedBy ? ` · requested by ${student.leave.requestedBy}` : ""}`;
  } else if (student.status === "absent" && !canMark && student.absenceReason) {
    extra = `Reason: ${student.absenceReason}${student.note ? ` · ${student.note}` : ""}`;
  }

  const reasonId = `reason-${student.id}`;
  return (
    <li className="flex flex-col gap-2.5 border-t border-tl-line-soft px-1 py-3" data-student={student.id}>
      <div className="flex flex-wrap items-center gap-3.5">
        <Avatar id={student.id} name={student.name} src={student.avatarUrl} size={40} />
        <div className="min-w-[150px] flex-1">
          <div className="text-[15px] font-bold text-tl-ink">{student.name}</div>
          <div className="mt-0.5 text-[13px] text-tl-faint">{student.admissionNumber ?? "No admission number"}</div>
        </div>
        {canMark ? (
          <StatusSegment
            name={student.name}
            firstName={student.firstName || student.name}
            value={student.status === "on_leave" ? null : student.status}
            onChange={(status) => onMark(student.id, { status })}
          />
        ) : (
          <span className={`${pill} ${STATUS_PILL[statusKey]}`}>{STATUS_LABEL[statusKey]}</span>
        )}
      </div>
      {extra ? <div className={`ml-[54px] text-[13px] ${onLeave ? "text-tl-accent" : "text-tl-muted"}`}>{extra}</div> : null}
      {canMark && student.status === "absent" ? (
        <div className="ml-[54px] flex flex-wrap items-center gap-3.5 max-sm:ml-0">
          <div className="relative shrink-0">
            <label htmlFor={reasonId} className="sr-only">
              Why is {student.firstName || student.name} absent?
            </label>
            <select
              id={reasonId}
              value={student.absenceReason ?? ""}
              title="Why is this student absent?"
              onChange={(event) => onMark(student.id, { absenceReason: event.target.value || null })}
              className={`min-h-[44px] appearance-none rounded-[11px] border py-0 pl-3 pr-[34px] text-sm font-semibold ${focusRing} ${
                student.absenceReason ? "border-tl-line bg-tl-surface text-tl-ink" : "border-tl-danger/30 bg-tl-danger-bg text-tl-danger"
              }`}
            >
              <option value="">Select a reason</option>
              {ABSENCE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tl-muted" />
          </div>
          <input
            value={student.note ?? ""}
            onChange={(event) => onMark(student.id, { note: event.target.value || null })}
            placeholder="Note for the school office (optional)"
            aria-label={`Note for the school office about ${student.firstName || student.name} (optional)`}
            className={`min-h-[44px] min-w-[200px] flex-1 border-0 border-b border-tl-line bg-transparent px-0.5 text-sm text-tl-ink placeholder:text-tl-faint ${focusRing}`}
          />
        </div>
      ) : null}
    </li>
  );
}
