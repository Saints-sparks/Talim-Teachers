"use client";
import React, { Suspense, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { toast } from "@/components/CustomToast";
import CurriculumSkeleton from "@/components/curriculum/CurriculumSkeleton";
import CurriculumViewCard from "@/components/curriculum/CurriculumViewCard";
import { downloadCurriculumPdf } from "@/components/curriculum/curriculumPdf";
import { card, cardTitle, focusRing, ghostButton, pagePad, primaryButton } from "@/components/tl/styles";
import { useClassPreview } from "@/hooks/curriculum/useClassPreview";
import { useCurriculumAccess } from "@/hooks/curriculum/useCurriculumAccess";
import { useCurriculumByCourseTerm } from "@/hooks/curriculum/useCurriculumQueries";
import { getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";

/**
 * The page frame every state of the view shares: the shell and the
 * redesign's padding, at most 960px wide.
 *
 * @param props - The content.
 * @param props.children - The state to show.
 * @returns The framed page.
 */
const Frame = ({ children }: { children: ReactNode }) => (
  <Layout>
    <div className={`${pagePad} flex max-w-[960px] flex-col gap-[18px]`}>{children}</div>
  </Layout>
);

/**
 * The Back button.
 *
 * @param props - What it does.
 * @param props.onClick - Goes back.
 * @returns The button.
 */
const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`-ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2 text-sm font-bold text-tl-brand hover:bg-tl-select ${focusRing}`}
  >
    <ChevronLeft className="h-4 w-4" aria-hidden />
    Back
  </button>
);

/**
 * `/curriculum/view`: a course's written curriculum for a term, read-only,
 * in the redesign, with Edit (for teachers of the course) and a PDF download.
 *
 * @returns The page element.
 */
const CurriculumViewContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams.get("courseId");
  const termId = searchParams.get("termId");
  const curriculumId = searchParams.get("curriculumId");

  const query = useCurriculumByCourseTerm(courseId, termId);
  const students = useClassPreview(courseId);
  const access = useCurriculumAccess(courseId);
  const [downloading, setDownloading] = useState(false);
  const curriculum = query.data ?? null;

  const handleDownload = async () => {
    if (!curriculum) return;
    setDownloading(true);
    try {
      await downloadCurriculumPdf(curriculum);
    } catch (error) {
      logger.error("curriculum", "generating the PDF failed", error);
      toast.error("Could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const goToEditor = (mode: "edit" | "create") => {
    const editing = mode === "edit" ? `&mode=edit&curriculumId=${curriculum?._id || curriculumId}` : "&mode=create";
    router.push(`/curriculum?courseId=${courseId}&termId=${termId}${editing}`);
  };

  if (!courseId || !termId) {
    return (
      <Frame>
        <section className={card} role="alert">
          <h1 className={cardTitle}>Can&apos;t open this curriculum</h1>
          <p className="mt-1.5 text-sm text-tl-muted">The link is missing the subject or the term.</p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => router.back()}>
            Go back
          </button>
        </section>
      </Frame>
    );
  }

  if (query.isLoading) {
    return (
      <Frame>
        <CurriculumSkeleton />
      </Frame>
    );
  }

  if (query.error) {
    return (
      <Frame>
        <section className={card} role="alert">
          <h1 className={cardTitle}>We could not load this curriculum</h1>
          <p className="mt-1.5 text-sm text-tl-muted">{getErrorMessage(query.error, "Check your connection and try again.")}</p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => void query.refetch()}>
            Try again
          </button>
        </section>
      </Frame>
    );
  }

  if (!curriculum) {
    return (
      <Frame>
        <div>
          <BackButton onClick={() => router.back()} />
        </div>
        <section className={card}>
          <h1 className={cardTitle}>No curriculum yet</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
            {access.canCreate
              ? "This subject has no written curriculum for the term. Write one and students can read it in their portal."
              : "This subject has no written curriculum for the term yet."}
          </p>
          {access.canCreate ? (
            <button type="button" onClick={() => goToEditor("create")} className={`${primaryButton} mt-4`}>
              Write the curriculum
            </button>
          ) : null}
        </section>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <BackButton onClick={() => router.back()} />
        <div className="flex flex-wrap gap-2.5">
          {access.canModify ? (
            <button type="button" onClick={() => goToEditor("edit")} className={ghostButton}>
              Edit
            </button>
          ) : null}
          <button type="button" onClick={handleDownload} disabled={downloading} className={primaryButton}>
            {downloading ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </div>
      <CurriculumViewCard curriculum={curriculum} students={students.data ?? []} />
    </Frame>
  );
};

/**
 * The route entry: `useSearchParams` needs a Suspense boundary.
 *
 * @returns The page element.
 */
const CurriculumViewPage = () => (
  <Suspense fallback={<CurriculumSkeleton />}>
    <CurriculumViewContent />
  </Suspense>
);

export default CurriculumViewPage;
