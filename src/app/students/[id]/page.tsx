"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import StudentProfile from "@/components/students/StudentProfile";
import { useAuth } from "@/app/hooks/useAuth";
import { Student } from "@/types/student";
import { fetchStudent } from "@/app/services/api.service";
import { Loader2, AlertCircle, ChevronLeft } from "lucide-react";

const StudentPage: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { getAccessToken } = useAuth();

  useEffect(() => {
    const loadStudent = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getAccessToken();
        if (!token) {
          setError("Authentication required. Please sign in again.");
          return;
        }
        const studentData = await fetchStudent(id, token);
        setStudent(studentData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load student profile."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) loadStudent();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#003366]" />
          <p className="text-sm text-gray-500">Loading student profile…</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <div className="text-center max-w-sm">
            <p className="font-semibold text-gray-800">Could not load profile</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#003366] text-white text-sm font-medium rounded-lg hover:bg-[#002244] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-14 h-14 rounded-full bg-[#003366]/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-[#003366]" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">Student not found</p>
            <p className="text-sm text-gray-500 mt-1">
              No student profile found for this ID.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#003366] text-white text-sm font-medium rounded-lg hover:bg-[#002244] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <StudentProfile student={student} />
    </Layout>
  );
};

export default StudentPage;
