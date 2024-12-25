"use client"

import { Student } from "../../types/student";
import { Pencil } from "lucide-react";
import Button from "../Button";

interface AcademicInformationProps {
  student: Student;
}

export function AcademicInformation({ student }: AcademicInformationProps) {
  const subjects = [
    "Mathematics",
    "English Language",
    "Physics",
    "Chemistry",
    "Biology",
  ];
  return (
    <div className="grid md:grid-cols-2 gap-6 mt-6 items-start">
      <div className="bg-white rounded-lg border">
        <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50 ">
          <h3 className="font-medium  text-[#454545]">Academic Information</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <span className=" text-[#969696]">Edit</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="text-gray-600">Current Class/Grade Level:</span>
            <span className="text-[#525252]">SS 2</span>
          </div>

          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="text-gray-600 block mb-2">Subjects Enrolled:</span>
            <div className="space-y-3">
              {subjects.map((subject) => (
                <span key={subject} className="block text-[#525252]">
                  {subject}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50">
          <h3 className="font-medium  text-[#454545]">Academic Performance</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <span className=" text-[#969696]">Edit</span>
          </div>
        </div>
        

        <div className="space-y-6">
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="text-gray-600">Academic Year:</span>
            <span className="text-[#030E18] font-medium">2024/2025</span>
          </div>

          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="text-gray-600">Overall Academic Performance:</span>
            <span className="text-[#030E18] font-medium">85%</span>
          </div>

          <div className="text-[#525252] grid grid-cols-2 px-4 py-3 ">
            <span className="text-gray-600 block mb-2">
              Previous Academic Performance:
            </span>
            <div className="space-y-2">
              <div className="flex gap-4">
                <span>Term 1:</span>
                <span>85%</span>
              </div>
              <div className="flex gap-4">
                <span>Term 2:</span>
                <span>90%</span>
              </div>
              <div className="flex gap-4">
                <span>Term 3:</span>
                <span>88%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
