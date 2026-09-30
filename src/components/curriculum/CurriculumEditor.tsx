"use client";
import React from "react";
import { EditorContent } from "@tiptap/react";
import { cardFrame, pagePad } from "@/components/tl/styles";
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
import { paperClass } from "./richText";
import type { CourseOption, TermOption } from "./editor/types";

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
 * The rich-text editor for a course's curriculum, in the redesign: heading
 * and Close, a side column (subject, term, attachments, a checklist), and the
 * toolbar over a white page with Cancel and Save below it. Layout only: the
 * form rules live in `useCurriculumForm`, the editor in `useRichTextEditor`
 * and the uploads in `useAttachmentUploads`.
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

  if (!editor) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`} role="status" aria-label="Loading the editor">
        <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-tl-line/70" />
        <div className="h-[560px] animate-pulse rounded-[22px] bg-tl-line/70" />
      </div>
    );
  }

  const selectedCourse: CourseOption | null =
    teacherCourses.find((course) => course._id === form.courseId) ??
    (courseInfo ? { ...courseInfo, _id: courseInfo._id || form.courseId } : null);
  const isCourseFixed = Boolean(initialCourseId);
  const contentReady = hasContent(html);

  return (
    <div className={`${pagePad} flex flex-col gap-[18px]`}>
      <EditorHeader isEditing={Boolean(curriculum)} course={selectedCourse} onClose={onClose} />

      <div className="grid items-start gap-[18px] lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3" data-guide="curriculum-editor-config">
          <CourseCard
            size="md"
            isFixed={isCourseFixed}
            fixedCourse={selectedCourse}
            courses={teacherCourses}
            courseId={form.courseId}
            onSelect={form.selectCourse}
          />
          <TermCard size="md" term={currentTerm} isLoading={termLoading} />
          <AttachmentsCard
            size="md"
            attachments={uploads.attachments}
            uploading={uploads.uploading}
            progress={uploads.progress}
            onPick={uploads.upload}
            onRemove={uploads.remove}
          />
          <StatusCard size="md" hasCourse={Boolean(form.courseId)} hasTerm={Boolean(form.termId)} hasContent={contentReady} />
        </div>

        <section className={`${cardFrame} flex min-w-0 flex-col overflow-hidden`} aria-label="Curriculum text">
          <EditorToolbar editor={editor} />
          <div className="flex-1 bg-tl-bg p-3 sm:p-5" data-guide="curriculum-editor-canvas">
            <div className="min-h-[520px] rounded-2xl border border-tl-line-soft bg-white shadow-[0_1px_2px_rgba(15,27,46,0.06)]">
              <EditorContent editor={editor} className={paperClass} style={{ fontFamily: "Arial", fontSize: `${DEFAULT_FONT_SIZE}px` }} />
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
        </section>
      </div>
    </div>
  );
};

export default CurriculumEditor;
