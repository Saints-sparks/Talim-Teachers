"use client";
import { useAppContext } from "@/app/context/AppContext";
import SubjectCard from "./SubjectCard";
import { useAuth } from "@/app/hooks/useAuth";
import { useEffect, useState } from "react";
import {
  fetchTeacherDetails,
  getStudentsByClass,
} from "@/app/services/api.service";
import LoadingCard from "./LoadingCard";
import { Button } from "./ui/button";
import { BookOpen, RefreshCw } from "lucide-react";

interface Course {
  _id: string;
  title: string;
  courseCode: string;
  description: string;
  classId?: string | { _id?: string; id?: string };
  studentAvatars?: Array<{ src?: string; initials: string; name: string }>;
  timetable?: Array<{
    day?: string;
    startTime?: string;
    endTime?: string;
    time?: string;
  }>;
  // …any other fields your API returns
}

const getCourseClassId = (classId: Course["classId"]) => {
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
     

      // Check if assignedCourses exists and is an array
      if (!teacher.assignedCourses || !Array.isArray(teacher.assignedCourses)) {
       
        setSubjects([]);
        return;
      }

      const teachersCourses = await Promise.all(
        teacher.assignedCourses.map(async (course: any) => {
          const classId = getCourseClassId(course.classId);
          let studentAvatars: Course["studentAvatars"] = [];

          if (classId) {
            const classStudents = await getStudentsByClass(classId, token);
            studentAvatars = classStudents.slice(0, 3).map(getStudentPreview);
          }

          return {
            _id: course._id,
            title: course.title,
            courseCode: course.courseCode,
            description: course.description,
            classId: course.classId,
            studentAvatars,
            timetable: course.timetable || [],
          };
        })
      );

     

      if (teachersCourses.length === 0) {
        setSubjects([]);
        return;
      }

      setSubjects(teachersCourses);
      
    } catch (err: any) {
     
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [user]);

  

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
