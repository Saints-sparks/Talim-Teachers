import { FileText, X } from "lucide-react";
import type { CourseOption } from "./types";

/** Props for {@link EditorHeader}. */
export interface EditorHeaderProps {
  isEditing: boolean;
  /** The course being written for, when known. */
  course: CourseOption | null;
  onClose?: () => void;
}

/**
 * The navy bar at the top of the editor: what is being written, for which
 * course, and the close button.
 *
 * @param props - See {@link EditorHeaderProps}.
 * @param props.isEditing - True when an existing curriculum is open.
 * @param props.course - The course being written for.
 * @param props.onClose - Closes the editor; the button is hidden without it.
 * @returns The header element.
 */
export function EditorHeader({ isEditing, course, onClose }: EditorHeaderProps) {
  const subtitle = course
    ? `${course.title || course.name} - ${course.courseCode || course.code}`
    : "Design your course curriculum";

  return (
    <div className="bg-[#003366] p-4 md:p-6 text-white" data-guide="curriculum-editor-header">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-2 md:p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <FileText className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold">{isEditing ? "Edit Curriculum" : "Create New Curriculum"}</h1>
            <p className="text-white/90 mt-1 text-sm md:text-base">{subtitle}</p>
          </div>
        </div>

        {onClose && (
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Close Editor">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}
      </div>
    </div>
  );
}
