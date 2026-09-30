import { X } from "lucide-react";
import { eyebrow, ghostButton, pageTitle } from "@/components/tl/styles";
import type { CourseOption } from "./types";

/** Props for {@link EditorHeader}. */
export interface EditorHeaderProps {
  isEditing: boolean;
  /** The course being written for, when known. */
  course: CourseOption | null;
  onClose?: () => void;
}

/**
 * The editor's heading in the redesign: what is being written, for which
 * course, and Close.
 *
 * @param props - See {@link EditorHeaderProps}.
 * @param props.isEditing - True when an existing curriculum is open.
 * @param props.course - The course being written for.
 * @param props.onClose - Closes the editor; the button is hidden without it.
 * @returns The header element.
 */
export function EditorHeader({ isEditing, course, onClose }: EditorHeaderProps) {
  const name = course ? course.title || course.name : null;
  const code = course ? course.courseCode || course.code : null;
  return (
    <div className="flex flex-wrap items-end justify-between gap-3.5" data-guide="curriculum-editor-header">
      <div className="min-w-0">
        <p className={eyebrow}>Written curriculum</p>
        <h1 className={`${pageTitle} mt-1`}>{isEditing ? "Edit the curriculum" : "Write the curriculum"}</h1>
        <p className="mt-[5px] text-[15px] text-tl-muted">
          {name ? `${name}${code ? ` · ${code}` : ""}. ` : ""}Students read this in their portal for the term.
        </p>
      </div>
      {onClose ? (
        <button type="button" onClick={onClose} className={ghostButton} title="Close the editor without saving">
          <X className="h-4 w-4" aria-hidden />
          Close
        </button>
      ) : null}
    </div>
  );
}
