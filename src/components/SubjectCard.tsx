"use client";
import { useRouter } from "next/navigation";
import { useCurriculum } from "@/app/hooks/useCurriculum";
import { getCurriculumByCourseAndTerm } from "@/app/services/curriculum.services";
import { useAuth } from "@/app/hooks/useAuth";
import { useState } from "react";
import CurriculumActionModal from "./curriculum/CurriculumActionModal";
import { toast } from "react-hot-toast";
import { getCurrentTerm } from "@/app/services/api.service";

interface SubjectCardProps {
  _id: string;
  title: string;
  description?: string;
  courseCode?: string;
  timetable?: Array<{
    day?: string;
    startTime?: string;
    endTime?: string;
    time?: string;
  }>;
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
  timetable,
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
        curriculum,
      );
      if (!curriculum) {
        toast.error("No curriculum found for this course and term.");
        return;
      }
      router.push(
        `/curriculum/view?courseId=${_id}&termId=${term._id}&curriculumId=${curriculum._id}`,
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
        curriculum,
      );
      if (!curriculum) {
        toast.error("No curriculum found for this course and term.");
        return;
      }
      router.push(
        `/curriculum?courseId=${_id}&termId=${term._id}&mode=edit&curriculumId=${curriculum._id}`,
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

  const getTimetableLabel = () => {
    if (!timetable || timetable.length === 0) return "Schedule not set";
    const first = timetable[0] || {};
    const timeRange =
      first.time ||
      [first.startTime, first.endTime].filter(Boolean).join(" - ");
    const label = [first.day, timeRange].filter(Boolean).join(" ");
    if (timetable.length > 1) {
      return `${label} +${timetable.length - 1} more`;
    }
    return label || "Schedule not set";
  };

  // Dummy avatars for demonstration
  const avatars = [
    "https://randomuser.me/api/portraits/men/32.jpg",
    "https://randomuser.me/api/portraits/women/44.jpg",
    "https://randomuser.me/api/portraits/men/45.jpg",
  ];

  return (
    <>
      <div
        className={`group relative bg-white rounded-xl transition-all duration-300 cursor-pointer border border-[#F0F0F0] overflow-hidden ${
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
        {/* Content */}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <span className="inline-block border border-[#F2F2F2] text-[#4D4D4D] text-[15px] rounded-full font-semibold rounded px-2 mb-1">
                {courseCode || "ENG 213"}
              </span>
            </div>
            <div className="flex -space-x-2">
              {avatars.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt="avatar"
                  className="w-8 h-8 rounded-full border-2 border-white shadow -ml-1"
                  style={{ zIndex: 10 - idx }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[14px] text-[#4D4D4D]">
              {description ||
                "English Language, you will be learning on grammar, essay writing and comprehension"}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center bg-gray-100 text-gray-700 text-xs rounded px-3 py-1">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {getTimetableLabel()}
            </span>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 text-[#0A2343] font-medium text-base hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation();
                handleView();
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              View
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 text-[#0A2343] font-medium text-base hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z"
                />
              </svg>
              Edit
            </button>
          </div>
        </div>
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
