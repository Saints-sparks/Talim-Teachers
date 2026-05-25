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
import { fetchCourseById, getStudentsByClass } from "@/app/services/api.service";

const getCourseClassId = (classId: any) => {
  if (!classId) return "";
  return typeof classId === "string" ? classId : classId._id || classId.id || "";
};

const getStudentPreview = (student: any) => {
  const firstName = student?.userId?.firstName || student?.firstName || "";
  const lastName = student?.userId?.lastName || student?.lastName || "";
  const name = `${firstName} ${lastName}`.trim() || "Student";
  return {
    src: student?.userId?.userAvatar || student?.userAvatar || student?.avatar,
    initials: `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "ST",
    name,
  };
};

const CurriculumViewContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const [curriculum, setCurriculum] = useState<any>(null);
  const [studentAvatars, setStudentAvatars] = useState<
    Array<{ src?: string; initials: string; name: string }>
  >([]);
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

        const course = await fetchCourseById(courseId, token);
        const classId = getCourseClassId(course?.classId);
        if (classId) {
          const classStudents = await getStudentsByClass(classId, token);
          setStudentAvatars(classStudents.slice(0, 3).map(getStudentPreview));
        }
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
          <div className="max-w-4xl mx-auto">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-4">
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
                  className="flex items-center gap-2 px-4 py-2 border border-[#D9D9D9] rounded-lg bg-white text-[#0A2343] hover:bg-gray-100"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#002244]"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>

            {/* Main Card */}
            <div
              ref={contentRef}
              className="bg-white rounded-2xl border border-[#F0F0F0] p-8"
            >
              {/* Subject, code, class, avatars */}
              <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-semibold text-[#030E18]">
                      {curriculum.course?.title || "English Language"}
                    </span>
                    {curriculum.course?.courseCode && (
                      <span className="bg-gray-100 text-[#0A2343] text-xs font-semibold rounded px-3 py-1">
                        {curriculum.course.courseCode}
                      </span>
                    )}
                  </div>
                  {curriculum.course?.description && (
                    <span className="text-[#6F6F6F] text-sm">
                      {curriculum.course.description}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 text-[#0A2343] text-xs font-semibold rounded px-3 py-1">
                      Class
                    </span>
                    <span className="bg-gray-100 text-[#0A2343] text-xs font-semibold rounded px-3 py-1">
                      {curriculum.course?.className || "SS2"}
                    </span>
                  </div>
                  <div className="flex -space-x-2 ml-2">
                    {studentAvatars.length > 0 ? studentAvatars.map((avatar, idx) => (
                      avatar.src ? (
                        <img
                        key={idx}
                        src={avatar.src}
                        alt={avatar.name}
                        className="w-8 h-8 rounded-full border-2 border-white shadow -ml-1"
                        style={{ zIndex: 10 - idx }}
                      />
                      ) : (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded-full border-2 border-white bg-[#003366] text-white shadow -ml-1 flex items-center justify-center text-[10px] font-semibold"
                          style={{ zIndex: 10 - idx }}
                          title={avatar.name}
                        >
                          {avatar.initials}
                        </div>
                      )
                    )) : (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-[#EAF2FB] text-[#003366] shadow flex items-center justify-center text-[10px] font-semibold">
                        ST
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#003366]" />
                  <span className="font-medium text-[#030E18]">Term</span>
                  <span className="bg-gray-100 text-[#0A2343] text-xs font-semibold rounded px-3 py-1">
                    {curriculum.term?.name || "First term"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#030E18]">Teacher</span>
                  <User className="w-5 h-5 text-[#003366]" />
                  <span className="bg-gray-100 text-[#0A2343] text-xs font-semibold rounded px-3 py-1">
                    {curriculum.course?.teacherName || "Assurance Oshiobugie"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <School className="w-5 h-5 text-[#003366]" />
                  <span className="font-medium text-[#030E18]">School</span>
                  <span className="bg-gray-100 text-[#0A2343] text-xs font-semibold rounded px-3 py-1">
                    {curriculum.course?.schoolName || "New School"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#003366]" />
                  <span className="font-medium text-[#030E18]">
                    Last Updated
                  </span>
                  <span className="bg-gray-100 text-[#0A2343] text-xs font-semibold rounded px-3 py-1">
                    {curriculum.updatedAt
                      ? new Date(curriculum.updatedAt).toLocaleDateString()
                      : "9/27/2025"}
                  </span>
                </div>
              </div>

              {/* Curriculum Content */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">
                  Curriculum Content
                </h2>
                <div className="bg-[#F8F8F8] rounded-xl p-5">
                  {curriculum.content && curriculum.content.trim() !== "" ? (
                    <div
                      className="text-[#030E18] leading-relaxed mb-4"
                      dangerouslySetInnerHTML={{ __html: curriculum.content }}
                    />
                  ) : (
                    <div className="text-[#6F6F6F] font-medium mb-2">
                      No content added yet
                    </div>
                  )}
                  {/* Example image below content */}
                  <img
                    src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80"
                    alt="Curriculum visual"
                    className="rounded-xl w-full h-40 object-cover mt-3"
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-8 text-sm text-[#878787] mt-6">
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {curriculum.createdAt
                    ? new Date(curriculum.createdAt).toLocaleDateString()
                    : "7/14/2025"}
                </div>
                <div>
                  <span className="font-medium">Last Modified:</span>{" "}
                  {curriculum.updatedAt
                    ? new Date(curriculum.updatedAt).toLocaleDateString()
                    : "9/27/2025"}
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
