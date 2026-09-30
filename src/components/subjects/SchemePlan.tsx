"use client";

import React from "react";
import { focusRing, pill, pillTone, rowButton } from "@/components/tl/styles";
import { canMarkWeek, resourcesSharedText, weekTag } from "@/hooks/subjects/scheme.logic";
import type { SchemeOfWork, SchemeWeek, SubjectCard } from "@/types/subjects";
import { curriculumHref } from "@/hooks/subjects/legacyRoutes";
import { EarlierNotes, NoWrittenCurriculum } from "./EarlierNotes";

/**
 * The DOM id of a week row, for deep links (`?week=`) to scroll to.
 *
 * @param week - The week.
 * @returns The id.
 */
export function weekRowId(week: number): string {
  return `subjects-week-${week}`;
}

/** Props for {@link SchemePlan}. */
export interface SchemePlanProps {
  card: SubjectCard;
  scheme: SchemeOfWork;
  /** The week a deep link pointed at, briefly highlighted. */
  flashWeek?: number;
  /** The week whose taught toggle is being saved. */
  pendingWeek?: number;
  onToggleTaught: (week: SchemeWeek) => void;
  onEdit: (week: SchemeWeek) => void;
  /** The term picked on the page, when it is not the current one (the Curriculum page opens on it). */
  termParam?: string;
}

/**
 * The Scheme of work tab (the design's `weekRows`): one row per week with its
 * topic, tag, objectives and resources, "Mark taught" / "Undo" for weeks up
 * to the current one, and "Edit". Below the weeks, the written (text)
 * curriculum students read: under "Earlier notes" when the course has one,
 * else a line saying so; both link to the Curriculum page, where it is
 * written and edited.
 *
 * @param props - See {@link SchemePlanProps}.
 * @returns The tab's content.
 */
export function SchemePlan({ card, scheme, flashWeek, pendingWeek, onToggleTaught, onEdit, termParam }: SchemePlanProps) {
  const writtenHref = curriculumHref(card.course.id, termParam);
  const firstToggle = scheme.weeks.find((w) => canMarkWeek(w.week, scheme.currentWeek))?.week;
  return (
    <div>
      <ol aria-label={`Weeks of the scheme of work for ${card.course.title} · ${card.class.name}`} data-guide="subjects-plan">
        {scheme.weeks.map((w) => {
          const tag = weekTag(w, scheme.currentWeek);
          const current = w.week === scheme.currentWeek;
          const taught = Boolean(w.taughtAt);
          const topic = w.topic.trim();
          return (
            <li
              key={w.week}
              id={weekRowId(w.week)}
              aria-current={current ? "date" : undefined}
              className={`flex flex-wrap items-start gap-3.5 border-t border-tl-line-soft px-5 py-4 transition-shadow first:border-t-0 ${current ? "bg-tl-subtle" : ""} ${
                flashWeek === w.week ? "ring-2 ring-inset ring-tl-link" : ""
              }`}
            >
              <div aria-hidden className="w-[70px] shrink-0 pt-0.5 text-[13px] font-extrabold text-tl-faint">
                Week {w.week}
              </div>
              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className={`text-[15px] font-bold ${topic ? "text-tl-ink" : "text-tl-muted"}`}>
                    <span className="sr-only">Week {w.week}: </span>
                    {topic || "No topic yet"}
                  </h3>
                  <span className={`${pill} ${pillTone[tag.tone]}`}>{tag.label}</span>
                </div>
                {w.objectives.trim() ? (
                  <p className="mt-[5px] whitespace-pre-line text-[13px] leading-[1.55] text-tl-muted">{w.objectives}</p>
                ) : (
                  <p className="mt-[5px] text-[13px] font-bold text-tl-warning">No objectives written yet</p>
                )}
                {w.resourceCount > 0 ? <p className="mt-1.5 text-xs font-bold text-tl-link">{resourcesSharedText(w.resourceCount)}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {canMarkWeek(w.week, scheme.currentWeek) ? (
                  <button
                    type="button"
                    onClick={() => onToggleTaught(w)}
                    disabled={pendingWeek === w.week}
                    title={taught ? "Mark as not yet taught" : "Record that you have covered this week"}
                    data-guide={w.week === firstToggle ? "subjects-mark-taught" : undefined}
                    className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-[11px] px-3.5 py-2 text-[13px] font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${focusRing} ${
                      taught ? "border border-tl-control text-tl-muted hover:bg-tl-bg" : "bg-tl-success-bg text-tl-success hover:bg-tl-success-soft"
                    }`}
                  >
                    {taught ? "Undo" : "Mark taught"}
                    <span className="sr-only">{taught ? ` taught for week ${w.week}` : ` for week ${w.week}`}</span>
                  </button>
                ) : null}
                <button type="button" onClick={() => onEdit(w)} title="Edit the topic and objectives for this week" className={rowButton}>
                  Edit<span className="sr-only"> week {w.week}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {card.legacyCurriculum ? <EarlierNotes legacy={card.legacyCurriculum} editHref={writtenHref} /> : <NoWrittenCurriculum writeHref={writtenHref} />}
    </div>
  );
}
