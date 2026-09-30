"use client";
import React, { Suspense, type ReactNode } from "react";
import Layout from "@/components/Layout";
import CurriculumEditor from "@/components/curriculum/CurriculumEditor";
import CourseCurriculumList from "@/components/curriculum/CourseCurriculumList";
import CurriculumDetailModal from "@/components/curriculum/CurriculumDetailModal";
import CurriculumSkeleton from "@/components/curriculum/CurriculumSkeleton";
import { ConfirmDeleteDialog } from "@/components/curriculum/ConfirmDeleteDialog";
import { card, cardTitle, pagePad, primaryButton } from "@/components/tl/styles";
import { courseTitle } from "@/hooks/curriculum/types";
import { useCurriculumPage } from "@/hooks/curriculum/useCurriculumPage";
import { getErrorMessage } from "@/lib/apiError";

/**
 * The page frame every state shares: the shell and the redesign's padding.
 *
 * @param props - The content.
 * @param props.children - The state to show.
 * @returns The framed page.
 */
const Frame = ({ children }: { children: ReactNode }) => (
  <Layout>
    <div className={`${pagePad} flex flex-col gap-[18px]`}>{children}</div>
  </Layout>
);

/**
 * A card that says why the curriculum is not shown, with one way on.
 *
 * @param props - What to say.
 * @param props.title - The heading.
 * @param props.text - The explanation.
 * @param props.action - The button's label; no button without it.
 * @param props.onAction - What the button does.
 * @param props.alert - Announce it (a failure) rather than just show it.
 * @returns The card.
 */
function Notice({ title, text, action, onAction, alert = false }: { title: string; text: string; action?: string; onAction?: () => void; alert?: boolean }) {
  return (
    <section className={card} role={alert ? "alert" : undefined}>
      <h1 className={cardTitle}>{title}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">{text}</p>
      {action && onAction ? (
        <button type="button" className={`${primaryButton} mt-4`} onClick={onAction}>
          {action}
        </button>
      ) : null}
    </section>
  );
}

/**
 * `/curriculum`: a course's written curriculum for the term (the text
 * students read in their portal), in the redesign, with the editor, the full
 * text and delete. Subjects links here from each subject's scheme of work.
 * All state lives in `useCurriculumPage`; this component only decides which
 * screen to draw.
 *
 * @returns The page element.
 */
const CurriculumContent = () => {
  const page = useCurriculumPage();
  const { params, course, access, curriculumQuery } = page;
  const curriculum = curriculumQuery.data ?? null;

  if (!page.isAuthenticated) {
    return (
      <Frame>
        <Notice title="Sign in required" text="Sign in to read and write your subjects' curriculum." />
      </Frame>
    );
  }

  if (!params.courseId) {
    return (
      <Frame>
        <Notice
          title="Choose a subject first"
          text="Each subject has its own written curriculum. Open one of your subjects, then use Curriculum under its scheme of work."
          action="Open Subjects"
          onAction={page.goToSubjects}
        />
      </Frame>
    );
  }

  if (page.isLoading) {
    return (
      <Frame>
        <CurriculumSkeleton />
      </Frame>
    );
  }

  if (page.error) {
    return (
      <Frame>
        <Notice alert title="We could not load this curriculum" text={getErrorMessage(page.error, "Check your connection and try again.")} action="Try again" onAction={page.retry} />
      </Frame>
    );
  }

  if (page.editorTarget) {
    if (!access.isReady) {
      return (
        <Frame>
          <CurriculumSkeleton />
        </Frame>
      );
    }
    if (!access.canCreate) {
      return (
        <Frame>
          <Notice
            title="You can't edit this curriculum"
            text="Only the teacher of this subject can write its curriculum."
            action="Back to Subjects"
            onAction={page.goToSubjects}
          />
        </Frame>
      );
    }
    return (
      <Layout>
        <CurriculumEditor
          key={page.editorTarget.curriculum?._id ?? "new"}
          onClose={page.closeEditor}
          initialCourseId={params.courseId}
          courseInfo={course}
          curriculum={page.editorTarget.curriculum}
          teacherCourses={page.teacherCourses}
          currentTerm={page.currentTerm}
          termLoading={page.termLoading}
        />
      </Layout>
    );
  }

  // `?mode=view` shows the curriculum straight away, over an empty page.
  if (params.mode === "view" && curriculum) {
    return (
      <Layout>
        <CurriculumDetailModal curriculum={curriculum} onClose={page.goBack} />
      </Layout>
    );
  }

  return (
    <Frame>
      <CurriculumDetailModal curriculum={page.detail} onClose={page.closeDetail} />
      <CourseCurriculumList
        courseName={course?.title || course?.name || (curriculum ? courseTitle(curriculum, "Course") : "Subject")}
        curriculum={curriculum}
        canCreate={access.canCreate}
        canModify={access.canModify}
        onBack={page.goToSubjects}
        onCreate={page.openCreate}
        onOpen={page.openDetail}
        onEdit={page.openEdit}
        onDelete={page.requestDelete}
      />
      <ConfirmDeleteDialog
        open={Boolean(page.pendingDelete)}
        title="Delete the curriculum?"
        subject={page.pendingDelete ? `the ${courseTitle(page.pendingDelete, "subject's")} curriculum` : ""}
        busy={page.isDeleting}
        onConfirm={page.confirmDelete}
        onCancel={page.cancelDelete}
      />
    </Frame>
  );
};

/**
 * The route entry: `useSearchParams` needs a Suspense boundary.
 *
 * @returns The page element.
 */
const CurriculumPage = () => (
  <Suspense fallback={<CurriculumSkeleton />}>
    <CurriculumContent />
  </Suspense>
);

export default CurriculumPage;
