"use client";
import Layout from "@/components/Layout";
import { RowNumber } from "@/components/RowNumber";
import StudentGrid from "@/components/students/StudentGrid";

const StudentPage: React.FC = () => {

  return (
    <Layout>
      <div className=" space-y-1 bg-[F8F8F8]">
        <StudentGrid />
        <RowNumber />
      </div>
    </Layout>
  );
};
export default StudentPage;
