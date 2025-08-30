"use client";
import { useRouter } from "next/navigation";
import { BookOpen, Code, GraduationCap, ChevronRight } from "lucide-react";
import { useCurriculum } from "@/app/hooks/useCurriculum";
import { getCurriculumByCourseAndTerm } from "@/app/services/curriculum.services";
import { useAuth } from "@/app/hooks/useAuth";
import { useState } from "react";
import CurriculumActionModal from "./curriculum/CurriculumActionModal";
import { toast } from "react-hot-toast";
import { getCurrentTerm } from "@/app/services/api.service";
import { get } from "http";

interface SubjectCardProps {
  _id: string;
  title: string;
  description?: string;
  courseCode?: string;
}

const getSubjectIcon = (title: string, courseCode?: string) => {
  const subject = title.toLowerCase();
  const code = courseCode?.toLowerCase() || "";

  if (subject.includes("math") || code.includes("math")) {
    return "📊";
  } else if (
    subject.includes("english") ||
    subject.includes("language") ||
    code.includes("eng")
  ) {
    return "📝";
  } else if (subject.includes("science") || code.includes("sci")) {
    return "🔬";
  } else if (subject.includes("history") || code.includes("hist")) {
    return "📚";
  } else if (subject.includes("art") || code.includes("art")) {
    return "🎨";
  } else if (subject.includes("music") || code.includes("mus")) {
    return "🎵";
  } else if (subject.includes("physics") || code.includes("phy")) {
    return "⚡";
  } else if (subject.includes("chemistry") || code.includes("chem")) {
    return "🧪";
  } else if (subject.includes("biology") || code.includes("bio")) {
    return "🌱";
  } else if (subject.includes("geography") || code.includes("geo")) {
    return "🌍";
  } else if (
    subject.includes("computer") ||
    subject.includes("programming") ||
    code.includes("comp")
  ) {
    return "💻";
  } else {
    return "📖";
  }
};

const getGradientColor = (title: string) => {
  // Return consistent brand color instead of multiple gradients
  return "bg-[#003366]";
};

const SubjectCard: React.FC<SubjectCardProps> = ({
  _id,
  title,
  description,
  courseCode,
}) => {
  const router = useRouter();
  const { fetchCurriculumByCourse, isLoading } = useCurriculum();
  const { getAccessToken } = useAuth();
  const [isCheckingCurriculum, setIsCheckingCurriculum] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [hasCurriculum, setHasCurriculum] = useState<boolean | null>(null);
  const [curriculumData, setCurriculumData] = useState<any>(null);

  console.log("SubjectCard props:", { _id, title, description, courseCode });

  // Show modal on card click
  // Open the action modal immediately on card click
  const handleCardClick = () => {
    setShowActionModal(true);
  };

  // Handler for modal actions
  const handleView = async () => {
    console.log("[SubjectCard] handleView called for courseId:", _id);
    const token = getAccessToken();
    if (!token) {
      console.log("[SubjectCard] No token found");
      toast.error("You must be logged in to view curriculum.");
      return;
    }
    try {
      const term = await getCurrentTerm(token);
      console.log("[SubjectCard] getCurrentTerm result:", term);
      if (!term || !term._id) {
        console.log("[SubjectCard] No current term found");
        toast.error("No current term selected.");
        return;
      }
      // Log the exact parameters being sent to the API
      console.log("[SubjectCard] Calling getCurriculumByCourseAndTerm with:", {
        courseId: _id,
        termId: term._id,
        token: token ? "***" : "MISSING",
      });
      const curriculum = await getCurriculumByCourseAndTerm({
        courseId: _id,
        termId: term._id,
        token,
      });
      console.log(
        "[SubjectCard] getCurriculumByCourseAndTerm result:",
        curriculum
      );
      if (!curriculum) {
        toast.error("No curriculum found for this course and term.");
        return;
      }
      router.push(
        `/curriculum/view?courseId=${_id}&termId=${term._id}&curriculumId=${curriculum._id}`
      );
    } catch (error) {
      console.error("[SubjectCard] Error in handleView:", error);
      const err = error as any;
      if (err?.response) {
        console.error("[SubjectCard] API error response:", err.response);
      }
      toast.error("Failed to fetch curriculum.");
    }
  };
  const handleEdit = async () => {
    console.log("[SubjectCard] handleEdit called for courseId:", _id);
    const token = getAccessToken();
    if (!token) {
      console.log("[SubjectCard] No token found");
      toast.error("You must be logged in to edit curriculum.");
      return;
    }
    try {
      const term = await getCurrentTerm(token);
      console.log("[SubjectCard] getCurrentTerm result:", term);
      if (!term || !term._id) {
        console.log("[SubjectCard] No current term found");
        toast.error("No current term selected.");
        return;
      }
      // Log the exact parameters being sent to the API
      console.log("[SubjectCard] Calling getCurriculumByCourseAndTerm with:", {
        courseId: _id,
        termId: term._id,
        token: token ? "***" : "MISSING",
      });
      const curriculum = await getCurriculumByCourseAndTerm({
        courseId: _id,
        termId: term._id,
        token,
      });
      console.log(
        "[SubjectCard] getCurriculumByCourseAndTerm result:",
        curriculum
      );
      if (!curriculum) {
        toast.error("No curriculum found for this course and term.");
        return;
      }
      router.push(
        `/curriculum?courseId=${_id}&termId=${term._id}&mode=edit&curriculumId=${curriculum._id}`
      );
    } catch (error) {
      console.error("[SubjectCard] Error in handleEdit:", error);
      const err = error as any;
      if (err?.response) {
        console.error("[SubjectCard] API error response:", err.response);
      }
      toast.error("Failed to fetch curriculum for editing.");
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActionModal(true);
  };

  return (
    <>
      <div
        className={`group relative bg-white rounded-xl shadow-none hover:shadow-none transition-all duration-300 cursor-pointer border border-[#F0F0F0] overflow-hidden ${
          isCheckingCurriculum || isLoading
            ? "opacity-75 pointer-events-none"
            : ""
        }`}
        onClick={handleCardClick}
      >
        {/* Loading overlay */}
        {(isCheckingCurriculum || isLoading) && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366]"></div>
          </div>
        )}
        {/* Header with gradient background */}
        <div
          className={`relative h-32 ${getGradientColor(
            title
          )} flex items-center justify-center`}
        >
          <div className="text-6xl opacity-90">
            {getSubjectIcon(title, courseCode)}
          </div>
          {/* Course Code Badge */}
          {courseCode && (
            <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
              {courseCode}
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-[#030E18] line-clamp-2 leading-tight">
              {title}
            </h3>
            <ChevronRight className="w-5 h-5 text-[#878787] group-hover:text-[#030E18] transition-colors flex-shrink-0 ml-2" />
          </div>
          {description && (
            <p className="text-sm text-[#6F6F6F] line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F0F0F0]">
            <div className="flex items-center gap-2 text-sm text-[#878787]">
              <GraduationCap className="w-4 h-4" />
              <span>Course</span>
            </div>
            <div
              className="flex items-center gap-1 text-sm text-[#003366] group-hover:text-[#002244] transition-colors cursor-pointer"
              onClick={handleViewDetails}
            >
              <BookOpen className="w-4 h-4" />
              <span className="font-medium">View Curriculum</span>
            </div>
          </div>
        </div>
        {/* Hover effect border */}
        <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-[#F0F0F0] transition-colors duration-300 pointer-events-none" />
      </div>
      {/* Curriculum Action Modal */}
      <CurriculumActionModal
        open={showActionModal}
        onClose={() => setShowActionModal(false)}
        onView={handleView}
        onEdit={handleEdit}
      />
    </>
  );
};

export default SubjectCard;
