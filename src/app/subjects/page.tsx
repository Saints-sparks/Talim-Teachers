"use client";
import Layout from "@/components/Layout";
import { RowNumber } from "@/components/RowNumber";
import SubjectGrid from "@/components/SubjectGrid";

const SubjectPage: React.FC = () => {

  return (
    <Layout>
      <div className="flex flex-col justify-between h-full">
        <SubjectGrid />
        <RowNumber />
      </div>
    </Layout>
  );
};
export default SubjectPage;