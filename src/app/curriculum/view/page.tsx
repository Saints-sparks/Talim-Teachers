"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { useAuth } from "@/app/hooks/useAuth";
import {
  ArrowLeft,
  Download,
  Edit,
  Calendar,
  BookOpen,
  User,
  School,
  Clock,
  FileText,
  Plus,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getCurriculumByCourseAndTerm } from "../../services/curriculum.services";
import LoadingCard from "@/components/LoadingCard";

const CurriculumViewContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const [curriculum, setCurriculum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const courseId = searchParams.get("courseId");
  const termId = searchParams.get("termId");
  const curriculumId = searchParams.get("curriculumId");

  useEffect(() => {
    const fetchCurriculum = async () => {
      const token = getAccessToken();
      if (!token || !courseId || !termId) {
        setError("Missing required parameters");
        setLoading(false);
        return;
      }

      try {
        const data = await getCurriculumByCourseAndTerm({
          courseId,
          termId,
          token,
        });
        setCurriculum(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch curriculum");
      } finally {
        setLoading(false);
      }
    };

    fetchCurriculum();
  }, [courseId, termId]);

  const handleDownload = async () => {
    if (contentRef.current && curriculum) {
      try {
        // Create a new jsPDF instance
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        let yPosition = margin;

        // Set up fonts and colors
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(20);
        pdf.setTextColor(3, 14, 24); // #030E18

        // Add title
        const title = curriculum.course?.title || "Untitled Course";
        pdf.text(title, margin, yPosition);
        yPosition += 15;

        // Add course code if available
        if (curriculum.course?.courseCode) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(12);
          pdf.setTextColor(0, 51, 102); // #003366
          pdf.text(
            `Course Code: ${curriculum.course.courseCode}`,
            margin,
            yPosition
          );
          yPosition += 10;
        }

        // Add description if available
        if (curriculum.course?.description) {
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(11);
          pdf.setTextColor(111, 111, 111); // #6F6F6F
          const description = curriculum.course.description;
          const splitDescription = pdf.splitTextToSize(
            description,
            contentWidth
          );
          pdf.text(splitDescription, margin, yPosition);
          yPosition += splitDescription.length * 5 + 10;
        }

        // Add a line separator
        pdf.setDrawColor(240, 240, 240); // #F0F0F0
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 15;

        // Add course information
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(3, 14, 24); // #030E18
        pdf.text("Course Information", margin, yPosition);
        yPosition += 10;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(135, 135, 135); // #878787

        const courseInfo = [
          { label: "Term:", value: curriculum.term?.name || "N/A" },
          { label: "Class:", value: curriculum.course?.className || "N/A" },
          {
            label: "Teacher:",
            value: curriculum.course?.teacherName || "Unknown",
          },
          {
            label: "School:",
            value: curriculum.course?.schoolName || "Unknown",
          },
          {
            label: "Created:",
            value: curriculum.createdAt
              ? new Date(curriculum.createdAt).toLocaleDateString()
              : "N/A",
          },
          {
            label: "Last Updated:",
            value: curriculum.updatedAt
              ? new Date(curriculum.updatedAt).toLocaleDateString()
              : "N/A",
          },
        ];

        courseInfo.forEach((info) => {
          pdf.text(`${info.label} ${info.value}`, margin, yPosition);
          yPosition += 6;
        });

        yPosition += 10;

        // Add another line separator
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 15;

        // Add content section
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(3, 14, 24); // #030E18
        pdf.text("Curriculum Content", margin, yPosition);
        yPosition += 10;

        // Add content
        if (curriculum.content) {
          // Remove HTML tags for PDF
          const textContent = curriculum.content.replace(/<[^>]*>/g, "").trim();
          if (textContent) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            pdf.setTextColor(3, 14, 24); // #030E18

            const splitContent = pdf.splitTextToSize(textContent, contentWidth);

            // Check if content fits on current page
            const contentHeight = splitContent.length * 5;
            if (yPosition + contentHeight > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }

            pdf.text(splitContent, margin, yPosition);
            yPosition += contentHeight + 10;
          }
        } else {
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(11);
          pdf.setTextColor(135, 135, 135); // #878787
          pdf.text(
            "No content available for this curriculum.",
            margin,
            yPosition
          );
          yPosition += 10;
        }

        // Add attachments if any
        if (curriculum.attachments && curriculum.attachments.length > 0) {
          yPosition += 10;

          // Check if we need a new page
          if (yPosition + 30 > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(14);
          pdf.setTextColor(3, 14, 24); // #030E18
          pdf.text("Attachments", margin, yPosition);
          yPosition += 10;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(11);
          pdf.setTextColor(0, 51, 102); // #003366

          curriculum.attachments.forEach((url: string, index: number) => {
            const fileName = url.split("/").pop() || `Attachment ${index + 1}`;
            pdf.text(`• ${fileName}`, margin, yPosition);
            yPosition += 6;
          });
        }

        // Add footer with page numbers
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(135, 135, 135); // #878787
          pdf.text(
            `Page ${i} of ${pageCount}`,
            pageWidth - margin - 20,
            pageHeight - 10
          );
        }

        // Save the PDF
        const fileName = `${curriculum.course?.title || "curriculum"}.pdf`;
        pdf.save(fileName);
      } catch (error) {
        console.error("Failed to generate PDF:", error);
      }
    }
  };

  const handleEdit = () => {
    const actualCurriculumId = curriculum?._id || curriculumId;
    router.push(
      `/curriculum?courseId=${courseId}&termId=${termId}&mode=edit&curriculumId=${actualCurriculumId}`
    );
  };

  const handleCreateCurriculum = () => {
    router.push(
      `/curriculum?courseId=${courseId}&termId=${termId}&mode=create`
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#F8F8F8] p-6">
          <div className="max-w-4xl mx-auto">
            <LoadingCard />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#F8F8F8] p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-8 border border-[#F0F0F0] text-center">
              <p className="text-[#878787] text-lg mb-4">{error}</p>
              <button
                onClick={() => router.back()}
                className="px-6 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors duration-200"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Empty state when no curriculum has been created
  if (!curriculum) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#F8F8F8] p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-[#6F6F6F] hover:text-[#030E18] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </button>
            </div>

            {/* Empty State Card */}
            <div className="bg-white rounded-xl border border-[#F0F0F0] overflow-hidden">
              <div className="text-center py-16 px-8">
                <div className="mx-auto w-24 h-24 bg-[#F8F8F8] rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-12 h-12 text-[#878787]" />
                </div>

                <h2 className="text-2xl font-bold text-[#030E18] mb-3">
                  No Curriculum Created Yet
                </h2>

                <p className="text-[#6F6F6F] text-lg mb-8 max-w-md mx-auto">
                  It looks like no curriculum has been created for this course
                  yet. Click on the button below to create one.
                </p>

                <div className="space-y-4">
                  <button
                    onClick={handleCreateCurriculum}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-[#003366] text-white font-medium rounded-lg hover:bg-[#002244] transition-colors duration-200 shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                    Create Curriculum
                  </button>
                </div>

                {/* Course Information (if available from URL params) */}
                {/* <div className="mt-12 pt-8 border-t border-[#F0F0F0]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                    <div className="text-center">
                      <p className="text-sm font-medium text-[#030E18]">Course ID</p>
                      <p className="text-[#6F6F6F]">{courseId}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-[#030E18]">Term ID</p>
                      <p className="text-[#6F6F6F]">{termId}</p>
                    </div>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#F8F8F8]">
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-[#6F6F6F] hover:text-[#030E18] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 text-[#003366] border border-[#003366] rounded-lg hover:bg-[#003366] hover:text-white transition-colors duration-200"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#002244] transition-colors duration-200"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div
              ref={contentRef}
              className="bg-white rounded-xl border border-[#F0F0F0] overflow-hidden"
            >
              {/* Header Section */}
              <div className="bg-gradient-to-r from-[#003366] to-[#004080] text-white p-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold">
                      {curriculum.course?.title || "Untitled Course"}
                    </h1>
                    {curriculum.course?.courseCode && (
                      <div className="inline-block bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-3 py-1 rounded-full">
                        {curriculum.course.courseCode}
                      </div>
                    )}
                    <p className="text-white/90 mt-2">
                      {curriculum.course?.description ||
                        "No description available"}
                    </p>
                  </div>
                  <div className="text-right text-white/90">
                    <p className="text-sm">Class</p>
                    <p className="font-semibold">
                      {curriculum.course?.className || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Cards */}
              <div className="p-8 border-b border-[#F0F0F0]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-[#F8F8F8] rounded-lg">
                    <Calendar className="w-5 h-5 text-[#003366]" />
                    <div>
                      <p className="text-sm text-[#878787]">Term</p>
                      <p className="font-medium text-[#030E18]">
                        {curriculum.term?.name || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#F8F8F8] rounded-lg">
                    <User className="w-5 h-5 text-[#003366]" />
                    <div>
                      <p className="text-sm text-[#878787]">Teacher</p>
                      <p className="font-medium text-[#030E18]">
                        {curriculum.course?.teacherName || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#F8F8F8] rounded-lg">
                    <School className="w-5 h-5 text-[#003366]" />
                    <div>
                      <p className="text-sm text-[#878787]">School</p>
                      <p className="font-medium text-[#030E18]">
                        {curriculum.course?.schoolName || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#F8F8F8] rounded-lg">
                    <Clock className="w-5 h-5 text-[#003366]" />
                    <div>
                      <p className="text-sm text-[#878787]">Last Updated</p>
                      <p className="font-medium text-[#030E18]">
                        {curriculum.updatedAt
                          ? new Date(curriculum.updatedAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-[#003366]" />
                    <h2 className="text-xl font-semibold text-[#030E18]">
                      Curriculum Content
                    </h2>
                  </div>

                  <div className="bg-[#F8F8F8] rounded-lg p-6">
                    {curriculum.content && curriculum.content.trim() !== "" ? (
                      <div
                        className="prose max-w-none text-[#030E18] leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: curriculum.content }}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
                          <BookOpen className="w-8 h-8 text-[#878787]" />
                        </div>
                        <p className="text-[#6F6F6F] font-medium mb-2">
                          No content added yet
                        </p>
                        <p className="text-[#878787] text-sm mb-4">
                          This curriculum exists but doesn't have any content
                          yet.
                        </p>
                        <button
                          onClick={handleEdit}
                          className="inline-flex items-center gap-2 px-4 py-2 text-[#003366] border border-[#003366] rounded-lg hover:bg-[#003366] hover:text-white transition-colors duration-200"
                        >
                          <Edit className="w-4 h-4" />
                          Add Content
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  {curriculum.attachments &&
                    curriculum.attachments.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-[#030E18]">
                          Attachments
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {curriculum.attachments.map(
                            (url: string, index: number) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-4 bg-white border border-[#F0F0F0] rounded-lg hover:bg-[#F8F8F8] transition-colors"
                              >
                                <div className="w-10 h-10 bg-[#003366] rounded-lg flex items-center justify-center">
                                  <Download className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium text-[#030E18]">
                                    {url.split("/").pop() ||
                                      `Attachment ${index + 1}`}
                                  </p>
                                  <p className="text-sm text-[#878787]">
                                    Click to view attachment
                                  </p>
                                </div>
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Metadata */}
                  <div className="border-t border-[#F0F0F0] pt-6">
                    <div className="flex flex-wrap gap-6 text-sm text-[#878787]">
                      <div>
                        <span className="font-medium">Created:</span>{" "}
                        {curriculum.createdAt
                          ? new Date(curriculum.createdAt).toLocaleDateString()
                          : "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Last Modified:</span>{" "}
                        {curriculum.updatedAt
                          ? new Date(curriculum.updatedAt).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const CurriculumViewPage = () => {
  return (
    <Suspense fallback={<LoadingCard />}>
      <CurriculumViewContent />
    </Suspense>
  );
};

export default CurriculumViewPage;
