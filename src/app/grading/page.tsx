"use client";

import { GradingSystem } from "@/components/grading/grading-system";
import { Header } from "@/components/HeaderTwo";
import RowNumber from "@/components/RowNumber";

import { use } from "react";

const GradingPage: React.FC = () => {
  return (
    <div className=" space-y-1 bg-[F8F8F8]">
      <Header />
      <GradingSystem />
      <RowNumber />
    </div>
  );
};
export default GradingPage;
