"use client";

import React, { useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { focusRing, pill, pillTone } from "@/components/tl/styles";
import {
  DASH,
  cellText,
  completenessPill,
  formatPercent,
  gradeFor,
  isLocked,
  parseScore,
  percentOf,
  positionLabel,
  rowStatus,
  sanitizeScoreInput,
  tiedRanks,
  type AssessmentDraft,
  type LiveTotal,
} from "@/hooks/grading/grading.logic";
import type { CourseGradingSheet, GradingAssessment } from "@/types/grading";

/** Header cell classes (the design's small uppercase column heads). */
const th = "px-3 py-3 text-left text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint";

/**
 * Moves focus down (or up) the same column: Enter and the arrow keys walk a
 * column of score inputs, so a teacher can type a whole class in one pass.
 *
 * @param event - The key press on a score input.
 * @param table - The table the inputs are in.
 */
function walkColumn(event: KeyboardEvent<HTMLInputElement>, table: HTMLTableElement | null): void {
  const down = (event.key === "Enter" && !event.shiftKey) || event.key === "ArrowDown";
  const up = (event.key === "Enter" && event.shiftKey) || event.key === "ArrowUp";
  if (!down && !up) return;
  event.preventDefault();
  const input = event.currentTarget;
  const column = input.dataset.col;
  const row = Number(input.dataset.row);
  const inputs = Array.from(table?.querySelectorAll<HTMLInputElement>(`input[data-col="${column}"]`) ?? []).filter((el) => !el.disabled);
  const next = down ? inputs.find((el) => Number(el.dataset.row) > row) : [...inputs].reverse().find((el) => Number(el.dataset.row) < row);
  next?.focus();
  next?.select();
}

/** A score input with its "/ max". */
function ScoreInput({
  value,
  max,
  label,
  bad,
  disabled,
  row,
  col,
  describedBy,
  width,
  onChange,
  onKeyDown,
  title,
}: {
  value: string;
  max: number;
  label: string;
  bad: boolean;
  disabled: boolean;
  row: number;
  col: string;
  describedBy?: string;
  width: string;
  onChange: (text: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  title: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={DASH}
        aria-label={label}
        aria-invalid={bad || undefined}
        aria-describedby={describedBy}
        title={title}
        disabled={disabled}
        data-row={row}
        data-col={col}
        onChange={(event) => onChange(sanitizeScoreInput(event.target.value))}
        onKeyDown={onKeyDown}
        onFocus={(event) => event.currentTarget.select()}
        className={`${width} min-h-[44px] rounded-[11px] border px-2 text-center text-[15px] font-bold text-tl-ink placeholder:text-tl-faint disabled:cursor-not-allowed disabled:bg-tl-bg disabled:text-tl-muted ${focusRing} ${
          bad ? "border-tl-danger bg-tl-danger-bg" : "border-tl-control bg-tl-surface"
        }`}
      />
      <span className="text-[13px] font-bold text-tl-faint" aria-hidden>
        / {max}
      </span>
    </span>
  );
}

/** Props for {@link AssessmentScoreTable}. */
export interface AssessmentScoreTableProps {
  sheet: CourseGradingSheet;
  assessment: GradingAssessment;
  draft: AssessmentDraft | undefined;
  /** Every student's running total, for the Total column. */
  totals: readonly LiveTotal[];
  onCell: (studentId: string, text: string) => void;
}

/**
 * One assessment for one class: #, student, the score input (with Clear),
 * %, grade on the school's scale, the running total across assessments and
 * the row's status. Published scores are read-only until unlocked.
 *
 * @param props - See {@link AssessmentScoreTableProps}.
 * @returns The table.
 */
export function AssessmentScoreTable({ sheet, assessment, draft, totals, onCell }: AssessmentScoreTableProps) {
  const table = useRef<HTMLTableElement>(null);
  const locked = isLocked(assessment);
  const max = assessment.maxScore;
  const label = `${sheet.course.title} · ${sheet.class.name}`;

  return (
    <div className="overflow-x-auto">
      <table ref={table} className="w-full min-w-[760px] border-collapse">
        <caption className="sr-only">
          {assessment.name} scores for {label}, out of {max}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${th} w-[52px] pl-5`}>
              #
            </th>
            <th scope="col" className={th}>
              Student
            </th>
            <th scope="col" className={`${th} w-[190px]`}>
              Score
            </th>
            <th scope="col" className={`${th} w-[76px]`}>
              %
            </th>
            <th scope="col" className={`${th} w-[70px]`}>
              Grade
            </th>
            <th scope="col" className={`${th} w-[100px]`} title="Every assessment entered so far">
              Total /{sheet.totalMax}
            </th>
            <th scope="col" className={`${th} w-[140px] pr-5`}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sheet.students.map((student, i) => {
            const text = cellText(student.scores[assessment.id], draft?.[student.id]);
            const parsed = parseScore(text, max);
            const status = rowStatus(parsed, max);
            const pct = parsed.kind === "valid" ? percentOf(parsed.value, max) : null;
            const total = totals.find((t) => t.student.id === student.id)?.total ?? null;
            const statusId = `score-status-${assessment.id}-${student.id}`;
            const bad = parsed.kind === "above" || parsed.kind === "invalid";
            return (
              <tr key={student.id} className="border-t border-tl-line-soft">
                <td className="py-2 pl-5 pr-3 text-[13px] font-bold text-tl-faint">{i + 1}</td>
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <div className="text-[15px] font-bold text-tl-ink">{student.name}</div>
                  <div className="text-xs text-tl-faint">{student.admissionNumber ?? "No admission number"}</div>
                </th>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1">
                    <ScoreInput
                      value={text}
                      max={max}
                      label={`Score for ${student.name}, ${assessment.name}, out of ${max}`}
                      bad={bad}
                      disabled={locked}
                      row={i}
                      col={assessment.id}
                      describedBy={statusId}
                      width="w-[76px]"
                      title={locked ? "Published scores are locked" : `Score out of ${max}`}
                      onChange={(value) => onCell(student.id, value)}
                      onKeyDown={(event) => walkColumn(event, table.current)}
                    />
                    {!locked && text ? (
                      <button
                        type="button"
                        onClick={() => onCell(student.id, "")}
                        aria-label={`Clear the score for ${student.name}`}
                        title="Clear this score"
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tl-faint hover:bg-tl-bg hover:text-tl-ink ${focusRing}`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm font-bold text-tl-ink">{formatPercent(pct)}</td>
                <td className="px-3 py-2 text-sm font-extrabold text-tl-ink">{pct === null ? DASH : (gradeFor(pct, sheet.scale) ?? DASH)}</td>
                <td className="px-3 py-2 text-[15px] font-extrabold text-tl-brand" title="Running total across all assessments">
                  {total === null ? DASH : total}
                </td>
                <td className="py-2 pl-3 pr-5">
                  <span id={statusId} className={`${pill} ${pillTone[status.tone]}`}>
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sheet.students.length === 0 ? (
        <p className="border-t border-tl-line-soft px-5 py-5 text-sm text-tl-muted">
          There are no students in {sheet.class.name} yet. The school office adds them, and they will show here.
        </p>
      ) : null}
    </div>
  );
}

/** Props for {@link TermTotalTable}. */
export interface TermTotalTableProps {
  sheet: CourseGradingSheet;
  /** From `liveTotals`. */
  rows: readonly LiveTotal[];
  drafts: Record<string, AssessmentDraft | undefined>;
  onCell: (assessmentId: string, studentId: string, text: string) => void;
}

/**
 * "All assessments": one column per assessment (published ones read-only),
 * the total, grade, position (ties share a rank: "1st=") and how complete
 * each student is.
 *
 * @param props - See {@link TermTotalTableProps}.
 * @returns The table.
 */
export function TermTotalTable({ sheet, rows, drafts, onCell }: TermTotalTableProps) {
  const table = useRef<HTMLTableElement>(null);
  const tied = tiedRanks(rows.map((r) => r.position));
  const n = sheet.assessments.length;

  return (
    <div className="overflow-x-auto">
      <table ref={table} className="w-full border-collapse" style={{ minWidth: 560 + n * 120 }}>
        <caption className="sr-only">
          Term total for {sheet.course.title} · {sheet.class.name}, out of {sheet.totalMax}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${th} w-[52px] pl-5`}>
              #
            </th>
            <th scope="col" className={th}>
              Student
            </th>
            {sheet.assessments.map((a) => (
              <th key={a.id} scope="col" className={`${th} w-[120px]`} title={`${a.name}, out of ${a.maxScore}`}>
                {a.name}
              </th>
            ))}
            <th scope="col" className={`${th} w-[80px]`}>
              Total
            </th>
            <th scope="col" className={`${th} w-[64px]`}>
              Grade
            </th>
            <th scope="col" className={`${th} w-[64px]`}>
              Pos.
            </th>
            <th scope="col" className={`${th} w-[110px] pr-5`}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const state = completenessPill(r, n);
            const joint = r.position ? tied.has(r.position.rank) : false;
            return (
              <tr key={r.student.id} className="border-t border-tl-line-soft">
                <td className="py-2 pl-5 pr-3 text-[13px] font-bold text-tl-faint">{i + 1}</td>
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <div className="text-[15px] font-bold text-tl-ink">{r.student.name}</div>
                  <div className="text-xs text-tl-faint">{r.student.admissionNumber ?? "No admission number"}</div>
                </th>
                {sheet.assessments.map((a) => {
                  const text = cellText(r.student.scores[a.id], drafts[a.id]?.[r.student.id]);
                  const kind = parseScore(text, a.maxScore).kind;
                  const locked = isLocked(a);
                  return (
                    <td key={a.id} className="px-3 py-2">
                      <ScoreInput
                        value={text}
                        max={a.maxScore}
                        label={`Score for ${r.student.name}, ${a.name}, out of ${a.maxScore}`}
                        bad={kind === "above" || kind === "invalid"}
                        disabled={locked}
                        row={i}
                        col={a.id}
                        width="w-[60px]"
                        title={locked ? `${a.name} is published and locked` : `${a.name} out of ${a.maxScore}`}
                        onChange={(value) => onCell(a.id, r.student.id, value)}
                        onKeyDown={(event) => walkColumn(event, table.current)}
                      />
                    </td>
                  );
                })}
                <td className={`px-3 py-2 text-base font-extrabold ${r.complete ? "text-tl-ink" : "text-tl-faint"}`}>{r.total === null ? DASH : r.total}</td>
                <td className="px-3 py-2 text-sm font-extrabold text-tl-ink">{r.grade ?? DASH}</td>
                <td className="px-3 py-2 text-sm font-bold text-tl-muted">
                  <span aria-hidden>{positionLabel(r.position, joint)}</span>
                  <span className="sr-only">{r.position ? `${joint ? "Joint " : ""}${positionLabel(r.position)} of ${r.position.of}` : "No position yet"}</span>
                </td>
                <td className="py-2 pl-3 pr-5">
                  <span className={`${pill} ${pillTone[state.tone]}`}>{state.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="border-t border-tl-line-soft px-5 py-5 text-sm text-tl-muted">
          There are no students in {sheet.class.name} yet. The school office adds them, and they will show here.
        </p>
      ) : null}
    </div>
  );
}
