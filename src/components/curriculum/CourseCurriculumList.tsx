import React from "react";
import { ArrowLeft, Edit, Plus } from "lucide-react";
import { courseTitle, type Curriculum } from "@/hooks/curriculum/types";
import CurriculumCard from "./CurriculumCard";

/** Props for {@link CourseCurriculumList}. */
export interface CourseCurriculumListProps {
  /** The course's name, for the heading and as the cards' fallback title. */
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
 * A course's curriculum page body: the heading with its primary action (Create,
 * or Edit once a curriculum exists, since a course has one per term), then
 * either the curriculum card or an invitation to write the first one.
 *
 * @param props - See {@link CourseCurriculumListProps}.
 * @param props.courseName - The course's name.
 * @param props.curriculum - The curriculum, or `null`.
 * @param props.canCreate - Whether the Create buttons show.
 * @param props.canModify - Whether Edit and Delete show on the card.
 * @param props.onBack - Goes back to the subjects.
 * @param props.onCreate - Opens the editor for a new curriculum.
 * @param props.onOpen - Opens the detail modal.
 * @param props.onEdit - Opens the editor for the curriculum.
 * @param props.onDelete - Asks to delete the curriculum.
 * @returns The list element.
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
}) => (
  <div className="max-w-7xl mx-auto">
    <div className="flex justify-between items-center mb-8" data-guide="curriculum-header">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to subjects"
          className="flex items-center gap-2 text-[#6F6F6F] hover:text-[#030E18] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-[#030E18]">{courseName} Curriculum</h1>
      </div>
      {(curriculum ? canModify : canCreate) && (
        <button
          type="button"
          onClick={() => (curriculum ? onEdit(curriculum) : onCreate())}
          className="bg-[#003366] text-white px-6 py-2 rounded-lg hover:bg-[#002244] transition-colors duration-200 shadow-none flex items-center gap-2"
          data-guide="curriculum-primary-action"
        >
          {curriculum ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {curriculum ? "Edit Curriculum" : "Create Curriculum"}
        </button>
      )}
    </div>

    {curriculum ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-guide="curriculum-list">
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
      <div className="bg-white rounded-xl p-8 text-center shadow-none border border-[#F0F0F0]" data-guide="curriculum-list">
        <div className="max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-[#030E18] mb-2">No Curriculum Found</h3>
          <p className="text-[#6F6F6F] mb-6">
            {canCreate
              ? "This course doesn't have any curriculum yet. Create one to get started."
              : "This course doesn't have any curriculum yet."}
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="bg-[#003366] text-white px-6 py-3 rounded-lg hover:bg-[#002244] transition-colors duration-200 shadow-none flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create First Curriculum
            </button>
          )}
        </div>
      </div>
    )}
  </div>
);

export default CourseCurriculumList;
