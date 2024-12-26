"use client";


import { Header } from "@/components/HeaderTwo";
import RowNumber from "@/components/RowNumber";
import StudentGrid from "@/components/StudentGrid";
import { use } from "react";

const StudentPage: React.FC = () => {
  const greeting = "Student Overview";
  const tent = "View detailed information and progress for each student.";
  const mogi = "👩‍🎓";
  return (
    <div className=" space-y-1 bg-[F8F8F8]">
      <Header />
      <StudentGrid />
      <RowNumber />
    </div>
  );
};
export default StudentPage;
