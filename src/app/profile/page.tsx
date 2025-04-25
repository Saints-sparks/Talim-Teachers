"use client";
import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import PersonalInformation from "@/components/profile/PersonalInformation";
import EmploymentDetails from "@/components/profile/EmploymentDetails";
import Qualifications from "@/components/profile/Qualifications";
import Availability from "@/components/profile/Availability";
import ClassAndSubjects from "@/components/profile/ClassAndSubjects";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  BookOpenText,
  BriefcaseBusiness,
  ChevronLeft,
  Clock,
  Loader2,
  Medal,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import {
  fetchTeacherDetails,
  getAssignedClasses,
} from "../services/api.service";
import { Teacher } from "@/types/student";
import { useAppContext } from "../context/AppContext";

const tabs = [
  { label: "Personal Information", icon: <UserRound /> },
  { label: "Qualifications and Experience", icon: <Medal /> },
  { label: "Employment Details", icon: <BriefcaseBusiness /> },
  { label: "Class and Subjects", icon: <BookOpenText /> },
  { label: "Availability", icon: <Clock /> },
];

export default function Profile() {
  const { user } = useAppContext();
  const { getAccessToken } = useAuth(); // Get logged-in teacher's info
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(tabs[0].label);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const token = getAccessToken();
        if (!token) throw new Error("Unauthorized");
        const teacherDetails = await fetchTeacherDetails(user.userId, token);
        setTeacher(teacherDetails);
        const classes = await getAssignedClasses(user.userId, token);
        setAssignedClasses(classes);
      } catch (err: any) {
        setError(
          err.message || "Please check your internet connection and try again"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <Layout>
      {loading || error ? (
        // show spinner or error message in one spot
        error ? (
          <div className="p-6 text-center text-red-600">{error}</div>
        ) : (
          <div className="flex justify-center items-center h-full">
            <Loader2
              className="animate-spin text-gray-500"
              size={32}
              strokeWidth={1}
            />
          </div>
        )
      ) : (
        // main content when loaded and no error
        <div className="flex h-full flex-col p-4 gap-6">
          <Button
            className="bg-transparent shadow-none hover:bg-gray-200 self-start"
            onClick={() => router.back()}
          >
            <ChevronLeft className="text-[#6F6F6F]" strokeWidth={1.5} />
          </Button>

          <div className="flex gap-4 bg-white py-10 sm:p-10 rounded-3xl justify-center sm:justify-start items-center">
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
            {/* Tab Buttons */}
            <div className="flex gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <Button
                  key={tab.label}
                  onClick={() => setSelectedTab(tab.label)}
                  className={`rounded-lg border border-[#F0F0F0] text-[#686868] hover:bg-gray-200 shadow-none items-center ${
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

            {/* Tab Content */}
            {selectedTab === "Personal Information" && (
              <PersonalInformation
                firstName={teacher!.userId.firstName}
                lastName={teacher!.userId.lastName}
                email={teacher!.userId.email}
                phoneNumber={teacher!.userId.phoneNumber}
              />
            )}
            {selectedTab === "Qualifications and Experience" && (
              <Qualifications
                highestAcademicQualification={
                  teacher!.highestAcademicQualification
                }
                yearsOfExperience={teacher!.yearsOfExperience}
                specialization={teacher!.specialization}
              />
            )}
            {selectedTab === "Employment Details" && (
              <EmploymentDetails
                employmentType={teacher!.employmentType}
                role={teacher!.userId.role}
              />
            )}
            {selectedTab === "Class and Subjects" && (
              <ClassAndSubjects
                assignedClasses={assignedClasses}
                assignedCourses={teacher!.assignedCourses}
              />
            )}
            {selectedTab === "Availability" && (
              <Availability
                availableDays={teacher!.availabilityDays}
                availableTime={teacher!.availableTime}
              />
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
