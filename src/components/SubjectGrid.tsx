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

  useEffect(() => {
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


    loadSubjects();
  }, [user]);

    console.log("Subjects state:", subjects);
  if (loading) {
    return Array.from({ length: 4 }).map((_, i) => (
      <LoadingCard key={i} height="h-48" />
    ));
  }
  if (error) {
    return <p className="p-4 text-center text-red-600">{error}</p>;
  }
  if (subjects.length === 0) {
    return <p className="p-4 text-center">No subjects assigned yet.</p>;
  }


  return (
    <div className="px-6 py-4 h-full">
      <h2 className="text-xl font-medium mb-4 text-[#030E18]">My Subjects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjects.map((subject, index) => (
          <SubjectCard key={index} {...subject} />
        ))}
      </div>
    </div>
  );
};

export default SubjectGrid;
