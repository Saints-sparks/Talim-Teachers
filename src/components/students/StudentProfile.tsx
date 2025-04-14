"use client";
import AcademicInformation from "./AcademicInformation";
import ParentDetails from "./ParentDetails";
import StudentDetails from "./StudentDetails";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookOpenText, ChevronLeft, UserRound, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Student } from "@/types/student";

const tabs = [
  { label: "Personal Information", icon: <UserRound /> },
  { label: "Parent/Guardian Information", icon: <UsersRound /> },
  { label: "Academic Information", icon: <BookOpenText /> },
];

const Profile: React.FC<{ student: Student }> = ({ student }) => {
  const [selectedTab, setSelectedTab] = useState("Personal Information");
  const router = useRouter();
  return (
    <div className="flex h-full flex-col p-4 gap-6">
      <div>
        <Button
          className="bg-transparent shadow-none hover:bg-gray-200"
          onClick={() => router.back()}
        >
          <ChevronLeft className="text-[#6F6F6F]" strokeWidth={1.5} />
        </Button>
      </div>
      <div className="flex gap-4 bg-white py-10  sm:p-10 rounded-3xl justify-center sm:justify-start items-center">
        <Avatar className="w-[150px] sm:w-[150px] h-[150px] sm:h-[150px]">
          <AvatarImage src="/image/dash/ade.png" alt="User avatar" />
          <AvatarFallback className="bg-green-300">OA</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-3">
          <p>
            {student.userId.firstName} {student.userId.lastName}
          </p>
          <Button className="border border-[#F0F0F0] text-black bg-white shadow-none hover:bg-gray-200">
            Chat
          </Button>
        </div>
      </div>
      <div className="bg-white h-full p-4 flex flex-col gap-4 rounded-3xl">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <Button
              key={tab.label}
              onClick={() => setSelectedTab(tab.label)}
              className={`rounded-lg border border-[#F0F0F0] text-[#686868] hover:bg-gray-200 shadow-none items-center  ${
                selectedTab === tab.label
                  ? "bg-[#F0F0F0] border-[#ADBECE]"
                  : "bg-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>
        {selectedTab === "Personal Information" && (
          <StudentDetails student={student} />
        )}
        {selectedTab === "Parent/Guardian Information" && (
          <ParentDetails
            parent={{
              ...student.parentId,
              relationship: student.parentContact.relationship,
            }}
          />
        )}
        {selectedTab === "Academic Information" && (
          <AcademicInformation
            academicInfo={{
              classLevel: student.classId.name,
              gradeLevel: student.gradeLevel,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Profile;
