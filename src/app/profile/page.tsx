"use client";
import Layout from "@/components/Layout";
import PersonalInformation from "@/components/profile/PersonalInformation";
import EmploymentDetails from "@/components/profile/EmploymentDetails";
import Qualifications from "@/components/profile/Qualifications";
import Availability from "@/components/profile/Availability";
import ClassAndSubjects from "@/components/profile/ClassAndSubjects";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookOpenText, ChevronLeft, UserRound, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const tabs = [
  { label: "Personal Information", icon: <UserRound /> },
  { label: "Qualifications and Experience", icon: <UsersRound /> },
  { label: "Employment Details", icon: <BookOpenText /> },
  { label: "Class and Subjects", icon: <BookOpenText /> },
  { label: "Availability", icon: <BookOpenText /> },
];

const Profile = () => {
  const [selectedTab, setSelectedTab] = useState("Personal Information");
  const router = useRouter();
  return (
    <Layout>
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
          <Avatar className="w-[100px] sm:w-[150px] h-[100px] sm:h-[150px]">
            <AvatarImage src="/placeholder.svg" alt="User avatar" />
            <AvatarFallback className="bg-green-300">OA</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-3">
            <p>My Profile</p>
            <Button className="border border-[#003366] text-[#003366] bg-[#F3F3F3] shadow-none hover:bg-gray-200">
              Upload Photo
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
          {selectedTab === "Personal Information" && <PersonalInformation />}
          {selectedTab === "Qualifications and Experience" && (
            <Qualifications />
          )}
          {selectedTab === "Employment Details" && <EmploymentDetails />}
          {selectedTab === "Class and Subjects" && <ClassAndSubjects />}
          {selectedTab === "Availability" && <Availability />}
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
