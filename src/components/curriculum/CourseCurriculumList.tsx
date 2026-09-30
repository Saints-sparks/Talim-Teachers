import React from "react";
import { ChevronLeft } from "lucide-react";
import { card, cardTitle, focusRing, pageTitle, primaryButton } from "@/components/tl/styles";
import { courseTitle, type Curriculum } from "@/hooks/curriculum/types";
import CurriculumCard from "./CurriculumCard";

/** Props for {@link CourseCurriculumList}. */
export interface CourseCurriculumListProps {
  /** The course's name, for the heading and as the card's fallback title. */
  courseName: string;
  /** The course's curriculum for the term; `null` when none exists yet. */
  curriculum: Curriculum | null;
  canCreate: boolean;
  canModify: boolean;
  onBack: () => void;
  onCreate: () => void;
  onOpen: (curriculum: Curriculum) => void;
  onEdit: (curriculum: Curriculum) => void;
  onDelete: (curriculum: Curriculum) => void;
}

/**
 * A course's curriculum page body in the redesign: Back to Subjects, the
 * heading and what the page is for, the primary action (Write the
 * curriculum, or Edit once the term has one, since a course has one per
 * term), then the curriculum's card or a note that there is none yet.
 *
 * @param props - See {@link CourseCurriculumListProps}.
 * @param props.courseName - The course's name.
 * @param props.curriculum - The curriculum, or `null`.
 * @param props.canCreate - Whether Write shows.
 * @param props.canModify - Whether Edit and Delete show.
 * @param props.onBack - Goes back to Subjects.
 * @param props.onCreate - Opens the editor for a new curriculum.
 * @param props.onOpen - Opens the full text.
 * @param props.onEdit - Opens the editor for the curriculum.
 * @param props.onDelete - Asks to delete the curriculum.
 * @returns The page body.
 */
const CourseCurriculumList: React.FC<CourseCurriculumListProps> = ({
  courseName,
  curriculum,
  canCreate,
  canModify,
  onBack,
  onCreate,
  onOpen,
  onEdit,
  onDelete,
}) => {
  const action = curriculum ? (canModify ? "edit" : null) : canCreate ? "create" : null;
  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-3.5" data-guide="curriculum-header">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className={`-ml-2 mb-1 inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2 text-sm font-bold text-tl-brand hover:bg-tl-select ${focusRing}`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Back to Subjects
          </button>
          <h1 className={pageTitle}>{courseName} curriculum</h1>
          <p className="mt-[5px] max-w-[720px] text-[15px] text-tl-muted">
            The written curriculum students read for this subject in their portal, one for each term. Plan the term week by week in Subjects.
          </p>
        </div>
        {action ? (
          <button
            type="button"
            onClick={() => (curriculum ? onEdit(curriculum) : onCreate())}
            className={primaryButton}
            data-guide="curriculum-primary-action"
          >
            {action === "edit" ? "Edit curriculum" : "Write the curriculum"}
          </button>
        ) : null}
      </div>

      {curriculum ? (
        <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]" data-guide="curriculum-list">
          <CurriculumCard
            curriculum={curriculum}
            fallbackTitle={courseTitle(curriculum, courseName)}
            canModify={canModify}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ) : (
        <section className={card} data-guide="curriculum-list" aria-labelledby="curriculum-empty-title">
          <h2 id="curriculum-empty-title" className={cardTitle}>
            No curriculum yet
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
            {canCreate
              ? "This subject has no written curriculum for the term. Write one and students can read it in their portal."
              : "This subject has no written curriculum for the term. Its teacher writes it."}
          </p>
        </section>
      )}
    </div>
  );
};

export default CourseCurriculumList;
