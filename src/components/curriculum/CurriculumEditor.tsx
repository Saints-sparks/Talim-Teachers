"use client";
import React from "react";
import { EditorContent } from "@tiptap/react";
import { LoadingState } from "@/components/states";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useAttachmentUploads } from "@/hooks/curriculum/useAttachmentUploads";
import { useCurriculumForm } from "@/hooks/curriculum/useCurriculumForm";
import { useRichTextEditor } from "@/hooks/curriculum/useRichTextEditor";
import { hasContent, type Curriculum } from "@/hooks/curriculum/types";
import { AttachmentsCard } from "./editor/AttachmentsCard";
import { CourseCard, StatusCard, TermCard } from "./editor/ConfigCards";
import { EditorActionBar } from "./editor/EditorActionBar";
import { EditorHeader } from "./editor/EditorHeader";
import { EditorToolbar, DEFAULT_FONT_SIZE } from "./editor/EditorToolbar";
import type { CardSize, CourseOption, TermOption } from "./editor/types";

/** Props for {@link CurriculumEditor}. */
export interface CurriculumEditorProps {
  /** Closes the editor (after a save, or on Cancel). */
  onClose?: () => void;
  /** The course fixed by the page's URL; the teacher picks one when absent. */
  initialCourseId?: string | null;
  /** What the URL said about the course, for the header before the roster loads. */
  courseInfo?: CourseOption | null;
  /** The curriculum being edited; omit to write a new one. */
  curriculum?: Curriculum | null;
  /** The teacher's courses. */
  teacherCourses?: CourseOption[];
  /** The school's current term, or `null` when it could not be loaded. */
  currentTerm?: TermOption | null;
  /** True while the current term is still loading. */
  termLoading?: boolean;
  /** False when the teacher may not write for this course (the API would refuse). */
  canSave?: boolean;
}

/**
 * Full-page rich-text editor for a course's curriculum. Layout only: the form
 * rules live in `useCurriculumForm`, the editor in `useRichTextEditor` and the
 * uploads in `useAttachmentUploads`.
 *
 * @param props - See {@link CurriculumEditorProps}.
 * @returns The editor element.
 */
const CurriculumEditor: React.FC<CurriculumEditorProps> = ({
  onClose,
  initialCourseId,
  courseInfo,
  curriculum = null,
  teacherCourses = [],
  currentTerm = null,
  termLoading = false,
  canSave = true,
}) => {
  useBodyScrollLock(true);

  const { editor, html } = useRichTextEditor(curriculum?.content);
  const uploads = useAttachmentUploads(curriculum?.attachments ?? []);
  const form = useCurriculumForm({
    initialCourseId,
    curriculum,
    currentTermId: currentTerm?._id,
    html,
    attachments: uploads.attachments,
    onSaved: () => onClose?.(),
  });

  if (!editor) return <LoadingState message="Loading editor…" fullHeight />;

  const selectedCourse: CourseOption | null =
    teacherCourses.find((course) => course._id === form.courseId) ??
    (courseInfo ? { ...courseInfo, _id: courseInfo._id || form.courseId } : null);
  const isCourseFixed = Boolean(initialCourseId);
  const contentReady = hasContent(html);

  const configCards = (size: CardSize) => (
    <>
      <CourseCard
        size={size}
        isFixed={isCourseFixed}
        fixedCourse={selectedCourse}
        courses={teacherCourses}
        courseId={form.courseId}
        onSelect={form.selectCourse}
      />
      <TermCard size={size} term={currentTerm} isLoading={termLoading} />
      <AttachmentsCard
        size={size}
        attachments={uploads.attachments}
        uploading={uploads.uploading}
        progress={uploads.progress}
        onPick={uploads.upload}
        onRemove={uploads.remove}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <div className="max-w-7xl mx-auto p-3 md:p-6">
        <div className="bg-white rounded-xl shadow-none border border-[#F0F0F0] overflow-hidden">
          <EditorHeader isEditing={Boolean(curriculum)} course={selectedCourse} onClose={onClose} />

          {/* Phones and tablets: configuration sits above the editor. */}
          <div className="lg:hidden bg-[#F8F8F8] border-b border-[#F0F0F0] p-4" data-guide="curriculum-editor-config">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {configCards("sm")}
              <StatusCard
                size="sm"
                className="sm:col-span-2"
                hasCourse={Boolean(form.courseId)}
                hasTerm={Boolean(form.termId)}
                hasContent={contentReady}
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Desktop: configuration is a sidebar. */}
            <div className="hidden lg:block w-80 bg-[#F8F8F8] border-r border-[#F0F0F0] p-6 space-y-6" data-guide="curriculum-editor-config">
              <div className="space-y-4">
                {configCards("md")}
                <StatusCard size="md" hasCourse={Boolean(form.courseId)} hasTerm={Boolean(form.termId)} hasContent={contentReady} />
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <EditorToolbar editor={editor} />

              <div className="flex-1 p-6 bg-gray-50" data-guide="curriculum-editor-canvas">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px]">
                  <EditorContent
                    editor={editor}
                    className="prose prose-lg max-w-none p-6 focus:outline-none min-h-[600px] dark:prose-invert"
                    style={{ fontFamily: "Arial", fontSize: `${DEFAULT_FONT_SIZE}px` }}
                  />
                </div>
              </div>

              <EditorActionBar
                isComplete={form.isComplete}
                isEditing={Boolean(curriculum)}
                isSaving={form.isSaving}
                isUploading={uploads.uploading}
                canSave={canSave && Boolean(form.courseId && form.termId)}
                onSave={form.save}
                onCancel={onClose}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurriculumEditor;
