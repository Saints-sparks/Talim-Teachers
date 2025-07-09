"use client";
import { useRouter } from "next/navigation";
import { BookOpen, Code, GraduationCap, ChevronRight } from "lucide-react";

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
  } else if (subject.includes("english") || subject.includes("language") || code.includes("eng")) {
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
  } else if (subject.includes("computer") || subject.includes("programming") || code.includes("comp")) {
    return "💻";
  } else {
    return "📖";
  }
};

const getGradientColor = (title: string) => {
  const rainbowColors = [
    "from-red-400 via-red-500 to-red-600",           // Red
    "from-orange-400 via-orange-500 to-pink-500",   // Orange to Pink
    "from-yellow-400 via-yellow-500 to-orange-500", // Yellow to Orange
    "from-lime-400 via-green-500 to-emerald-600",   // Lime to Green
    "from-cyan-400 via-blue-500 to-indigo-600",     // Cyan to Blue
    "from-blue-400 via-indigo-500 to-purple-600",   // Blue to Purple
    "from-purple-400 via-pink-500 to-rose-500",     // Purple to Pink
    "from-emerald-400 via-teal-500 to-cyan-600",    // Emerald to Cyan
    "from-pink-400 via-rose-500 to-red-500",        // Pink to Red
    "from-indigo-400 via-purple-500 to-pink-500",   // Indigo to Pink
    "from-teal-400 via-green-500 to-lime-500",      // Teal to Lime
    "from-rose-400 via-pink-500 to-purple-500"      // Rose to Purple
  ];
  
  const index = title.charCodeAt(0) % rainbowColors.length;
  return rainbowColors[index];
};

const SubjectCard: React.FC<SubjectCardProps> = ({
  _id,
  title,
  description,
  courseCode
}) => {
  const router = useRouter();
  console.log("SubjectCard props:", { _id, title, description, courseCode });

  const handleCardClick = () => {
    router.push(`/subjects/${_id}`);
  };

  return (
    <div
      className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Header with gradient background */}
      <div className={`relative h-32 bg-gradient-to-br ${getGradientColor(title)} flex items-center justify-center`}>
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
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-tight">
            {title}
          </h3>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 ml-2" />
        </div>
        
        {description && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <GraduationCap className="w-4 h-4" />
            <span>Course</span>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-blue-600 group-hover:text-blue-700 transition-colors">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">View Details</span>
          </div>
        </div>
      </div>

      {/* Hover effect border */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-200 transition-colors duration-300 pointer-events-none" />
    </div>
  );
};

export default SubjectCard;
