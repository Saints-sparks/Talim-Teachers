import React from "react";
import { card, cardTitle, dangerGhostButton, eyebrow, primaryButton, rowButton } from "@/components/tl/styles";
import { courseOf, courseTitle, teacherName, termOf, type Curriculum } from "@/hooks/curriculum/types";

/**
 * A date as the cards show it: "10 Sep 2026".
 *
 * @param value - An ISO date string from the API.
 * @returns The date, or an em dash when the API sent none.
 */
export function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Props for {@link CurriculumCard}. */
export interface CurriculumCardProps {
  curriculum: Curriculum;
  /** Shown when the API carries no course name (a bare id). */
  fallbackTitle: string;
  /** Whether Edit and Delete are offered. */
  canModify: boolean;
  onOpen: (curriculum: Curriculum) => void;
  onEdit: (curriculum: Curriculum) => void;
  onDelete: (curriculum: Curriculum) => void;
}

/**
 * One fact of the card; left out when the API had no value.
 *
 * @param props - The fact.
 * @param props.label - What it is.
 * @param props.value - The value, if any.
 * @returns The row, or nothing.
 */
function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 border-t border-tl-line-soft pt-2.5 text-sm">
      <dt className="text-tl-muted">{label}</dt>
      <dd className="text-right font-extrabold text-tl-ink">{value}</dd>
    </div>
  );
}

/**
 * The course's curriculum on its page, as a redesign card: the course and
 * term, who wrote it and when, then Read (the full text), and Edit and Delete
 * for a teacher of the course. The actions are separate buttons, not a
 * clickable card around buttons.
 *
 * @param props - See {@link CurriculumCardProps}.
 * @param props.curriculum - The curriculum.
 * @param props.fallbackTitle - Title used when the API sent no course name.
 * @param props.canModify - Whether Edit and Delete show.
 * @param props.onOpen - Opens the full text.
 * @param props.onEdit - Opens the editor.
 * @param props.onDelete - Asks to delete.
 * @returns The card element.
 */
const CurriculumCard: React.FC<CurriculumCardProps> = ({ curriculum, fallbackTitle, canModify, onOpen, onEdit, onDelete }) => {
  const course = courseOf(curriculum);
  const title = courseTitle(curriculum, fallbackTitle);
  return (
    <article className={`${card} flex flex-col gap-3`} aria-labelledby={`curriculum-${curriculum._id}`}>
      <div>
        <p className={eyebrow}>{termOf(curriculum)?.name || "Term not recorded"}</p>
        <h2 id={`curriculum-${curriculum._id}`} className={`${cardTitle} mt-1`}>
          {title}
        </h2>
      </div>
      <dl className="flex flex-col gap-2.5">
        <Fact label="Class" value={course?.className} />
        <Fact label="Teacher" value={teacherName(curriculum)} />
        <Fact label="School" value={course?.schoolName} />
        <Fact label="Created" value={formatDate(curriculum.createdAt)} />
        <Fact label="Updated" value={formatDate(curriculum.updatedAt)} />
      </dl>
      <div className="mt-1 flex flex-wrap gap-2">
        <button type="button" className={primaryButton} onClick={() => onOpen(curriculum)}>
          Read<span className="sr-only"> the {title} curriculum</span>
        </button>
        {canModify ? (
          <>
            <button type="button" className={rowButton} onClick={() => onEdit(curriculum)}>
              Edit
            </button>
            <button type="button" className={dangerGhostButton} onClick={() => onDelete(curriculum)}>
              Delete
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
};

export default CurriculumCard;
