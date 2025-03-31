"use client";

import { GradingSystem } from "@/components/grading/grading-system";
import { Header } from "@/components/HeaderTwo";
import Layout from "@/components/Layout";
import RowNumber from "@/components/RowNumber";

import { use } from "react";

const GradingPage: React.FC = () => {
  return (
    <Layout>
      <div>
        <GradingSystem />
        <RowNumber />
      </div>
    </Layout>
  );
};
export default GradingPage;
