"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { useSchoolTerms, type SchoolTerm } from "@/hooks/academic/useSchoolTerms";
import { fieldLabel, focusRing } from "./styles";

/** Props for {@link TermPicker}. */
export interface TermPickerProps {
  /** The term picked, or undefined for the current term. */
  value: string | undefined;
  /** The term the server resolved "current" to (from the page's data), so it can be marked. */
  currentTermId?: string;
  /** The current term's name, shown while the list loads or when it fails. */
  currentTermName?: string;
  /** Undefined picks the current term again. */
  onChange: (termId: string | undefined) => void;
  /** For the label's `htmlFor`. */
  id: string;
  /** The page's guide target, when it has one. */
  guide?: string;
}

/**
 * "Term 2 · 2025/2026 (current)".
 *
 * @param term - The term.
 * @param currentTermId - The current term's id.
 * @returns The option label.
 */
export function termOptionLabel(
  term: Pick<SchoolTerm, "_id" | "name" | "session" | "academicYearName">,
  currentTermId?: string,
): string {
  const session = term.session ?? term.academicYearName;
  const year = session ? ` · ${session}` : "";
  return `${term.name}${year}${term._id === currentTermId ? " (current)" : ""}`;
}

/**
 * The term picker on Grading and Subjects: the school's terms, with the
 * current one marked. While the list loads (or if it cannot be read) it shows
 * only the current term.
 *
 * @param props - See {@link TermPickerProps}.
 * @returns The labelled select.
 */
export function TermPicker({ value, currentTermId, currentTermName, onChange, id, guide }: TermPickerProps) {
  const terms = useSchoolTerms();
  const list = terms.data ?? [];
  const current = currentTermId ?? list.find((t) => t.isCurrent ?? t.isActive)?._id;
  const selected = value ?? current ?? "";
  const hasSelected = list.some((t) => t._id === selected);

  return (
    <div className="flex min-w-[200px] max-w-[300px] flex-col gap-1.5" data-guide={guide}>
      <label htmlFor={id} className={fieldLabel}>
        Term
      </label>
      <div className="relative">
        <select
          id={id}
          value={selected}
          onChange={(event) => onChange(event.target.value && event.target.value !== current ? event.target.value : undefined)}
          title="Choose a term"
          className={`min-h-[44px] w-full cursor-pointer appearance-none rounded-[13px] border border-tl-control bg-tl-surface py-0 pl-3.5 pr-10 text-sm font-bold text-tl-ink ${focusRing}`}
        >
          {!hasSelected ? (
            <option value={selected}>{value ? "Selected term" : currentTermName ? `${currentTermName} (current)` : "Current term"}</option>
          ) : null}
          {list.map((t) => (
            <option key={t._id} value={t._id}>
              {termOptionLabel(t, current)}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tl-muted" />
      </div>
    </div>
  );
}
