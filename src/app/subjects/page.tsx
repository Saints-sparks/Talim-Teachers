"use client";


import { Header } from "@/components/HeaderTwo";
import RowNumber from "@/components/RowNumber";
import SubjectGrid from "@/components/SubjectGrid";

import { use } from "react";

const SubjectPage: React.FC = () => {

  return (
    <div className=" space-y-1 bg-[#Fbfbfb] h-screen">
      <Header/>
      <SubjectGrid />
      <RowNumber />
    </div>
  );
};
export default SubjectPage;