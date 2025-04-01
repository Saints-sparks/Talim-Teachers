"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Layout from "@/components/Layout";
import StudentProfile from "@/components/students/StudentProfile";
import { useAuth } from "@/app/hooks/useAuth";
import { Student } from "@/types/student";
import { fetchStudent } from "@/app/services/api.service";

const StudentPage: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const id = params?.id as string;
  const { getToken } = useAuth();

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const token = getToken();
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!student) return <div>No student found.</div>;

  return (
    <Layout>
      <StudentProfile student={student} />
    </Layout>
  );
};

export default StudentPage;
