"use client";



import { Header } from "@/components/HeaderTwo";
import RowNumber from "@/components/RowNumber";
import Timetable from "@/components/Timetable";


const TimetablePage: React.FC = () => {
 
  return (
    <div className=" space-y-1 bg-[F8F8F8]">
      <Header />
      <Timetable/>
      <RowNumber />
    </div>
  );
};
export default TimetablePage;
