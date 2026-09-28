"use client";

import React from "react";
import { focusRing } from "@/components/tl/styles";
import { cardMeta, subjectLabel, taughtPercent, weeksTaughtText } from "@/hooks/subjects/scheme.logic";
import { toneIndex } from "@/hooks/timetable/timetableWeek.logic";
import type { SubjectCard } from "@/types/subjects";

/** Props for {@link SubjectCards}. */
export interface SubjectCardsProps {
  cards: readonly SubjectCard[];
  /** The open course. */
  activeId: string | undefined;
  onPick: (courseId: string) => void;
}

/**
 * The subject cards (the design's `subjCards`): code, title, class and lessons
 * a week, and the weeks-taught bar. Each card is a toggle button; the open one
 * has a 2px border in its subject tone (the same tone as on Today and the
 * Timetable).
 *
 * @param props - See {@link SubjectCardsProps}.
 * @returns The grid.
 */
export function SubjectCards({ cards, activeId, onPick }: SubjectCardsProps) {
  return (
    <div
      role="group"
      aria-label="Your subjects"
      data-guide="subjects-cards"
      className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]"
    >
      {cards.map((card) => {
        const on = card.course.id === activeId;
        const percent = taughtPercent(card.taughtCount, card.totalWeeks);
        return (
          <button
            key={card.course.id}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(card.course.id)}
            title={`Open ${subjectLabel(card)}`}
            className={`tl-tone-${toneIndex(card.course.id)} min-h-[44px] rounded-[20px] bg-tl-surface text-left transition-colors hover:bg-tl-subtle ${focusRing} ${
              on ? "border-2 border-tone-fg px-[17px] py-[15px]" : "border border-tl-line px-[18px] py-4"
            }`}
          >
            <span className="block text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">{card.course.code}</span>
            <span className="mt-1.5 block text-[17px] font-extrabold text-tl-ink">{card.course.title}</span>
            <span className="mt-1 block text-[13px] text-tl-muted">{cardMeta(card)}</span>
            <span aria-hidden className="mt-3 block h-1.5 overflow-hidden rounded-[3px] bg-tl-track">
              <span className="block h-full rounded-[3px] bg-tone-fg" style={{ width: `${percent}%` }} />
            </span>
            <span className="mt-1.5 block text-xs font-bold text-tl-muted">{weeksTaughtText(card.taughtCount, card.totalWeeks)}</span>
          </button>
        );
      })}
    </div>
  );
}
