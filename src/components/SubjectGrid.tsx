"use client";
import { useAppContext } from "@/app/context/AppContext";
import SubjectCard from "./SubjectCard";
import { useAuth } from "@/app/hooks/useAuth";
import { useEffect, useState } from "react";
import {
  fetchCourseById,
  fetchTeacherDetails,
} from "@/app/services/api.service";
import LoadingCard from "./LoadingCard";
import { Button } from "./ui/button";
import { BookOpen, RefreshCw } from "lucide-react";

interface Course {
  _id: string;
  title: string;
  courseCode: string;
  description: string;
  // …any other fields your API returns
}

const subjects = [
  {
    subject: "English Language",
    title: "Mrs",
    name: "Yetunde Adebayo",
    subjectImageUrl: "/image/subject/english.png",
    profileImageUrl: "/image/teachers/english.png",
  },
  {
    subject: "Mathematics",
    title: "Mrs",
    name: "Yetunde Adebayo",
    subjectImageUrl: "/image/subject/mathematics.png",
    profileImageUrl: "/image/teachers/mathematics.png",
  },
  {
    subject: "Civic Education",
    title: "Mrs",
    name: "Yetunde Adebayo",
    subjectImageUrl: "/image/subject/civic-education.png",
    profileImageUrl: "/image/teachers/civic.png",
  },
];

const SubjectGrid: React.FC = () => {
  const { user } = useAppContext();
  const { getAccessToken } = useAuth();
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = async () => {
    if (!user?.userId) return;
    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) throw new Error("No auth token");

      // 1) Fetch teacher, grab assignedCourses (array of course objects)
      const teacher = await fetchTeacherDetails(user.userId, token);
      console.log("Fetched teacher details:", teacher);

      // Check if assignedCourses exists and is an array
      if (!teacher.assignedCourses || !Array.isArray(teacher.assignedCourses)) {
        console.log("No assigned courses found");
        setSubjects([]);
        return;
      }

      const teachersCourses = teacher.assignedCourses.map((course: any) => ({
        _id: course._id,
        title: course.title,
        courseCode: course.courseCode,
        description: course.description,
      }));

      console.log("Teachers courses:", teachersCourses);

      if (teachersCourses.length === 0) {
        setSubjects([]);
        return;
      }

      setSubjects(teachersCourses);
      // console.log(courses);
    } catch (err: any) {
      console.error("Failed to load subjects:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [user]);

  console.log("Subjects state:", subjects);

  if (loading) {
    return (
      <div className="px-6 py-4 h-full">
        <h2 className="text-xl font-medium mb-4 text-[#030E18]">My Subjects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingCard key={i} height="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-4 h-full">
        <h2 className="text-xl font-medium mb-4 text-[#030E18]">My Subjects</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-[#F0F0F0] rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-[#878787]" />
          </div>
          <h3 className="text-lg font-medium text-[#030E18] mb-2">
            Failed to Load Subjects
          </h3>
          <p className="text-[#6F6F6F] mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={loadSubjects}
            className="border-[#F0F0F0] text-[#030E18] hover:bg-[#F0F0F0]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="px-6 py-4 h-full">
        <h2 className="text-xl font-medium mb-4 text-[#030E18]">My Subjects</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-[#F0F0F0] rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-[#878787]" />
          </div>
          <h3 className="text-lg font-medium text-[#030E18] mb-2">
            No Subjects Assigned
          </h3>
          <p className="text-[#6F6F6F] mb-4">
            You haven't been assigned to any subjects yet.
          </p>
          <Button
            variant="outline"
            onClick={loadSubjects}
            className="border-[#F0F0F0] text-[#030E18] hover:bg-[#F0F0F0]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium text-[#030E18]">My Subjects</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadSubjects}
          className="text-[#6F6F6F] hover:text-[#030E18] hover:bg-[#F0F0F0]"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjects.map((subject, index) => (
          <SubjectCard key={subject._id || index} {...subject} />
        ))}
      </div>
    </div>
  );
};

export default SubjectGrid;
