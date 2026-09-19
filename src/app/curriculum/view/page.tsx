"use client";
import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Edit, FileText, Plus } from "lucide-react";
import Layout from "@/components/Layout";
import LoadingCard from "@/components/LoadingCard";
import { toast } from "@/components/CustomToast";
import CurriculumViewCard from "@/components/curriculum/CurriculumViewCard";
import { downloadCurriculumPdf } from "@/components/curriculum/curriculumPdf";
import { ApiErrorState, ErrorState } from "@/components/states";
import { useClassPreview } from "@/hooks/curriculum/useClassPreview";
import { useCurriculumAccess } from "@/hooks/curriculum/useCurriculumAccess";
import { useCurriculumByCourseTerm } from "@/hooks/curriculum/useCurriculumQueries";
import { logger } from "@/lib/logger";

/** The page frame every state of the view shares. */
const Frame = ({ children }: { children: React.ReactNode }) => (
  <Layout>
    <div className="min-h-screen bg-[#F8F8F8] p-6">
      <div className="max-w-4xl mx-auto">{children}</div>
    </div>
  </Layout>
);

/** The Back button. */
const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="flex items-center gap-2 text-[#6F6F6F] hover:text-[#030E18] transition-colors">
    <ArrowLeft className="w-5 h-5" />
    <span className="font-medium">Back</span>
  </button>
);

/**
 * `/curriculum/view`: a course's curriculum for a term, read-only, with Edit
 * (for teachers of the course) and a PDF download.
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
        <ErrorState title="Can't open this curriculum" message="The link is missing the course or term." retryText="Go Back" onRetry={() => router.back()} />
      </Frame>
    );
  }

  if (query.isLoading) {
    return (
      <Frame>
        <LoadingCard />
      </Frame>
    );
  }

  if (query.error) {
    return (
      <Frame>
        <ApiErrorState error={query.error} fallback="We couldn't load this curriculum." onRetry={() => query.refetch()} />
      </Frame>
    );
  }

  if (!curriculum) {
    return (
      <Frame>
        <div className="flex items-center justify-between mb-6">
          <BackButton onClick={() => router.back()} />
        </div>
        <div className="bg-white rounded-xl border border-[#F0F0F0] overflow-hidden">
          <div className="text-center py-16 px-8">
            <div className="mx-auto w-24 h-24 bg-[#F8F8F8] rounded-full flex items-center justify-center mb-6">
              <FileText className="w-12 h-12 text-[#878787]" />
            </div>
            <h2 className="text-2xl font-bold text-[#030E18] mb-3">No Curriculum Created Yet</h2>
            <p className="text-[#6F6F6F] text-lg mb-8 max-w-md mx-auto">
              {access.canCreate
                ? "It looks like no curriculum has been created for this course yet. Click on the button below to create one."
                : "No curriculum has been created for this course yet."}
            </p>
            {access.canCreate && (
              <button
                type="button"
                onClick={() => goToEditor("create")}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#003366] text-white font-medium rounded-lg hover:bg-[#002244] transition-colors duration-200 shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Create Curriculum
              </button>
            )}
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="flex items-center justify-between mb-4">
        <BackButton onClick={() => router.back()} />
        <div className="flex items-center gap-3">
          {access.canModify && (
            <button
              type="button"
              onClick={() => goToEditor("edit")}
              className="flex items-center gap-2 px-4 py-2 border border-[#D9D9D9] rounded-lg bg-white text-[#0A2343] hover:bg-gray-100"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#002244] disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Preparing…" : "Download"}
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
  <Suspense fallback={<LoadingCard />}>
    <CurriculumViewContent />
  </Suspense>
);

export default CurriculumViewPage;
