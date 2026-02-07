"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Layout from "@/components/Layout";
import StudentProfile from "@/components/students/StudentProfile";
import { useAuth } from "@/app/hooks/useAuth";
import { Student } from "@/types/student";
import { fetchStudent } from "@/app/services/api.service";
import LoadingCard from "@/components/LoadingCard";

const StudentPage: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const id = params?.id as string;
  const { getAccessToken } = useAuth();

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;
        const studentData = await fetchStudent(id, token);
        setStudent(studentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred.");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadStudent();
  }, [id]);

  if (loading)
    return (
      <Layout>
        <div className="bg-[#F8F8F8] min-h-screen">
          <div className="container mx-auto py-6 space-y-6 max-w-[95%]">
            <LoadingCard height="h-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <LoadingCard key={i} height="h-48" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  if (error)
    return (
      <Layout>
        <div className="bg-[#F8F8F8] min-h-screen">
          <div className="container mx-auto py-6 max-w-[95%]">
            <div className="bg-white border border-[#F0F0F0] rounded-xl p-6 text-center text-red-600">
              Error: {error}
            </div>
          </div>
        </div>
      </Layout>
    );
  if (!student)
    return (
      <Layout>
        <div className="bg-[#F8F8F8] min-h-screen">
          <div className="container mx-auto py-6 max-w-[95%]">
            <div className="bg-white border border-[#F0F0F0] rounded-xl p-6 text-center">
              No student found.
            </div>
          </div>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <StudentProfile student={student} />
    </Layout>
  );
};

export default StudentPage;
