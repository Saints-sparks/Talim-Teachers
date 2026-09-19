import React from "react";
import { Edit, Trash2 } from "lucide-react";
import { courseOf, courseTitle, teacherName, termOf, type Curriculum } from "@/hooks/curriculum/types";

/**
 * A date as the cards show it.
 *
 * @param value - An ISO date string from the API.
 * @returns The local date, or an em dash when the API sent none.
 */
export function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
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

/** One line of the card's facts; hidden when the API had no value. */
function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <p>
      <span className="font-medium">{label}:</span> {value}
    </p>
  );
}

/**
 * A curriculum on the course page: title, term, who wrote it, when, and the
 * Edit / Delete actions the teacher is allowed.
 *
 * @param props - See {@link CurriculumCardProps}.
 * @param props.curriculum - The curriculum.
 * @param props.fallbackTitle - Title used when the API sent no course name.
 * @param props.canModify - Whether Edit and Delete show.
 * @param props.onOpen - Opens the detail view.
 * @param props.onEdit - Opens the editor.
 * @param props.onDelete - Asks to delete.
 * @returns The card element.
 */
const CurriculumCard: React.FC<CurriculumCardProps> = ({ curriculum, fallbackTitle, canModify, onOpen, onEdit, onDelete }) => {
  const course = courseOf(curriculum);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(curriculum)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(curriculum);
        }
      }}
      className="bg-white border border-[#F0F0F0] rounded-xl p-6 shadow-none transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003366]"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{courseTitle(curriculum, fallbackTitle)}</h3>
      <p className="text-sm text-gray-500 mb-4">Term: {termOf(curriculum)?.name || "N/A"}</p>
      <div className="space-y-3 text-sm text-gray-600">
        <Fact label="Class" value={course?.className} />
        <Fact label="Teacher" value={teacherName(curriculum)} />
        <Fact label="School" value={course?.schoolName} />
        <Fact label="Created" value={formatDate(curriculum.createdAt)} />
        <Fact label="Updated" value={formatDate(curriculum.updatedAt)} />
      </div>
      {canModify && (
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(curriculum);
            }}
            className="text-[#003366] hover:text-[#002244] text-sm flex items-center gap-2 font-medium"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(curriculum);
            }}
            className="text-[#878787] hover:text-[#6F6F6F] text-sm flex items-center gap-2 font-medium"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default CurriculumCard;
