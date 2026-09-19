"use client";
import Layout from "@/components/Layout";
import StudentGrid from "@/components/students/StudentGrid";

/**
 * The students page: class chooser, then the chosen class's roster.
 *
 * @returns The page.
 */
const StudentPage: React.FC = () => {
  return (
    <Layout>
      <div className="bg-[#F8F8F8] min-h-screen dark:bg-[#0F1629]">
        <StudentGrid />
      </div>
    </Layout>
  );
};
export default StudentPage;
