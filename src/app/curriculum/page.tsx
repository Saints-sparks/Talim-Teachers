"use client";
import React, { Suspense } from "react";
import Layout from "@/components/Layout";
import CurriculumEditor from "@/components/curriculum/CurriculumEditor";
import CourseCurriculumList from "@/components/curriculum/CourseCurriculumList";
import CurriculumDetailModal from "@/components/curriculum/CurriculumDetailModal";
import CurriculumSkeleton from "@/components/curriculum/CurriculumSkeleton";
import { ConfirmDeleteDialog } from "@/components/curriculum/ConfirmDeleteDialog";
import EmptyCurriculumPage from "@/components/curriculum/EmptyCurriculumPage";
import { ApiErrorState, EmptyState, LoadingState } from "@/components/states";
import { courseTitle } from "@/hooks/curriculum/types";
import { useCurriculumPage } from "@/hooks/curriculum/useCurriculumPage";

/** The page body inside the layout, so every state shares the same frame. */
const Frame = ({ children }: { children: React.ReactNode }) => (
  <Layout>
    <div className="min-h-screen bg-gray-50 p-8">{children}</div>
  </Layout>
);

/**
 * `/curriculum`: a course's curriculum for the current term, with the editor,
 * the detail modal and delete. All state lives in `useCurriculumPage`; this
 * component only decides which screen to draw.
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
        <EmptyState title="Sign in required" message="Please log in to access curriculum." />
      </Frame>
    );
  }

  if (!params.courseId) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 p-8">
          <EmptyCurriculumPage
            title="Select a Course First"
            description="Choose one of your assigned courses before creating or editing a curriculum."
            actionLabel="Choose Course"
            onCreateClick={page.goToSubjects}
          />
        </div>
      </Layout>
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
        <ApiErrorState error={page.error} fallback="We couldn't load this curriculum." onRetry={page.retry} />
      </Frame>
    );
  }

  if (page.editorTarget) {
    if (!access.isReady) {
      return (
        <Frame>
          <LoadingState message="Checking your access…" />
        </Frame>
      );
    }
    if (!access.canCreate) {
      return (
        <Frame>
          <EmptyState
            title="You can't edit this curriculum"
            message="Only the teacher of this course can write its curriculum."
            actionText="Back to subjects"
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
        courseName={course?.title || course?.name || (curriculum ? courseTitle(curriculum, "Course") : "Course")}
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
        title="Delete curriculum?"
        subject={page.pendingDelete ? courseTitle(page.pendingDelete, "this curriculum") : ""}
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
