"use client";

import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ChevronLeft } from "lucide-react";
import Layout from "@/components/Layout";
import StudentProfile from "@/components/students/StudentProfile";
import { ApiErrorState, LoadingState } from "@/components/states";
import { useStudent } from "@/hooks/students/useStudent";

/** A back button for the states that have no profile to show. */
function GoBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 bg-[#003366] text-white text-sm font-medium rounded-lg hover:bg-[#002244] transition-colors"
    >
      <ChevronLeft className="w-4 h-4" />
      Go back
    </button>
  );
}

/**
 * One student's profile. Loading, a failed request (keyed on the error code)
 * and a student the server has no record of are three different screens.
 *
 * @returns The page.
 */
const StudentPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const student = useStudent(params?.id);
  const back = () => router.back();

  return (
    <Layout>
      {student.isPending ? (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0F1629]">
          <LoadingState message="Loading student profile…" fullHeight />
        </div>
      ) : student.isError ? (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4 dark:bg-[#0F1629]">
          <ApiErrorState
            error={student.error}
            fallback="Failed to load student profile."
            onRetry={() => void student.refetch()}
          />
          <GoBack onClick={back} />
        </div>
      ) : !student.data ? (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4 dark:bg-[#0F1629]">
          <div className="w-14 h-14 rounded-full bg-[#003366]/10 flex items-center justify-center dark:bg-[#10233E]">
            <AlertCircle className="w-7 h-7 text-[#003366] dark:text-blue-200" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-slate-100">Student not found</p>
            <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">No student profile found for this ID.</p>
          </div>
          <GoBack onClick={back} />
        </div>
      ) : (
        <StudentProfile student={student.data} />
      )}
    </Layout>
  );
};

export default StudentPage;
