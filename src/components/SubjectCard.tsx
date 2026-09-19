"use client";
import { useState } from "react";
import { Eye, Pencil } from "lucide-react";
import CurriculumActionModal from "./curriculum/CurriculumActionModal";
import { AvatarStack } from "./subjects/AvatarStack";
import { useClassAvatars } from "@/hooks/subjects/useClassAvatars";
import { useSubjectCurriculumActions } from "@/hooks/subjects/useSubjectCurriculumActions";
import { courseClassId, timetableLabel, type SubjectCourse } from "@/hooks/subjects/subjects.logic";

const actionButton =
  "flex min-w-0 items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-sm font-medium text-[#0A2343] hover:bg-gray-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-slate-800 sm:text-base disabled:opacity-60";

/**
 * One subject the teacher teaches: course code, description, next slot, a
 * stack of the class's students, and View / Edit for the current-term
 * curriculum. Edit is offered only to users who may write that curriculum; a
 * read-only user's card click goes straight to the view.
 *
 * @param props - The course to show.
 * @returns The card.
 */
const SubjectCard: React.FC<SubjectCourse> = (course) => {
  const { _id, title, description, courseCode, timetable } = course;
  const [showActionModal, setShowActionModal] = useState(false);
  const avatars = useClassAvatars(courseClassId(course.classId));
  const actions = useSubjectCurriculumActions({ _id, title, courseCode });

  const handleCardClick = () => {
    if (actions.canModify) setShowActionModal(true);
    else void actions.view();
  };

  return (
    <>
      <div
        className={`group relative bg-white rounded-xl transition-all duration-300 cursor-pointer border border-[#F0F0F0] overflow-hidden dark:bg-slate-900 dark:border-slate-800 ${
          actions.busy ? "opacity-75 pointer-events-none" : ""
        }`}
        onClick={handleCardClick}
      >
        {actions.busy && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366] dark:border-blue-300" />
          </div>
        )}
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-2">
              <span className="mb-1 inline-block max-w-full truncate rounded-full border border-[#F2F2F2] px-2 text-[15px] font-semibold text-[#4D4D4D] dark:border-slate-700 dark:text-slate-200">
                {courseCode || title}
              </span>
            </div>
            <AvatarStack avatars={avatars.data ?? []} />
          </div>
          <p className="text-[14px] leading-6 text-[#4D4D4D] dark:text-slate-300">
            {description || `${title} — no description has been added yet.`}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex min-w-0 items-center rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-slate-800 dark:text-slate-300">
              <svg
                className="w-4 h-4 mr-1 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="truncate">{timetableLabel(timetable)}</span>
            </span>
          </div>
          <div className={`grid gap-2 sm:gap-3 mt-4 ${actions.canModify ? "grid-cols-2" : "grid-cols-1"}`}>
            <button
              type="button"
              className={actionButton}
              disabled={actions.busy}
              onClick={(e) => {
                e.stopPropagation();
                void actions.view();
              }}
            >
              <Eye className="w-5 h-5" />
              View
            </button>
            {actions.canModify && (
              <button
                type="button"
                className={actionButton}
                disabled={actions.busy}
                onClick={(e) => {
                  e.stopPropagation();
                  void actions.edit();
                }}
              >
                <Pencil className="w-5 h-5" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
      <CurriculumActionModal
        open={showActionModal}
        onClose={() => setShowActionModal(false)}
        onView={() => void actions.view()}
        onEdit={() => void actions.edit()}
      />
    </>
  );
};

export default SubjectCard;
