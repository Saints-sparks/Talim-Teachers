"use client";

import { Header } from "@/components/HeaderTwo";
import Layout from "@/components/Layout";
import RowNumber from "@/components/RowNumber";
import Timetable from "@/components/Timetable";

const TimetablePage: React.FC = () => {
  return (
    <Layout>
      <div className="h-full">
        {/* <Header /> */}
        <Timetable />
      </div>
    </Layout>
  );
};
export default TimetablePage;
