"use client";
import React from "react";
import StudentCard from "./StudentCard";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Button from "../Button";
import RowNumber from "../RowNumber";

const students = Array(12)
  .fill(null)
  .map((_, i) => ({
    id: i + 1,
    name: "Emeka Adewale",
    classLevel: "SS 3",
    imageUrl: "/image/dash/ade.png",
  }));

const StudentGrid: React.FC = () => {
  return (
    <div className="container mx-auto  py-6 space-y-6 max-w-[95%]">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium text-[#2F2F2F]">Students</h1>
          <p className="text-[#AAAAAA]">View all the students in your class</p>
        </div>
        <Button variant="primary" size="medium" className="bg-[#002147]">
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </div>

      <div className="grid grid-cols-1  md:grid-cols-2 lg:grid-cols-4 gap-4">
        {students.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
    </div>
  );
};

export default StudentGrid;
