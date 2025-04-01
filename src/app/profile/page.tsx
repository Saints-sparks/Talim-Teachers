"use client";
import Layout from "@/components/Layout";
import PersonalInformation from "@/components/profile/PersonalInformation";
import EmploymentDetails from "@/components/profile/EmploymentDetails";
import Qualifications from "@/components/profile/Qualifications";
import Availability from "@/components/profile/Availability";
import ClassAndSubjects from "@/components/profile/ClassAndSubjects";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookOpenText, BriefcaseBusiness, ChevronLeft, Clock, Medal, UserRound, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { fetchTeacherDetails, getAssignedClasses } from "../services/api.service";
import { Teacher } from "@/types/student";

const tabs = [
  { label: "Personal Information", icon: <UserRound /> },
  { label: "Qualifications and Experience", icon: <Medal /> },
  { label: "Employment Details", icon: <BriefcaseBusiness /> },
  { label: "Class and Subjects", icon: <BookOpenText /> },
  { label: "Availability", icon: <Clock /> },
];

const Profile = () => {
  const { getUser, getToken } = useAuth(); // Get logged-in teacher's info
  const [user, setUser] = useState<any>(null); // Store user information locally
  const [teacher, setTeacher] = useState<Teacher | null>(null); // Store teacher's details
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]); // Store assigned classes
  const [loading, setLoading] = useState<boolean>(true); // Handle loading state
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("Personal Information");
  const router = useRouter();

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  useEffect(() => {
    if (!user) return; // Prevent fetching if no user is found

    const fetchData = async () => {
      setLoading(true);
      try {
        const token = getToken(); // Get the access token
        if (!token) {
          setError("Unauthorized: No token found.");
          return;
        }

        // Fetch teacher details using user ID and token
        const teacherDetails = await fetchTeacherDetails(user.userId, token);
        setTeacher(teacherDetails); // Store the teacher details in state
        const classes = await getAssignedClasses(user.userId, token);
        setAssignedClasses(classes); // Store the classes in state
      } catch (err) {
        setError("Failed to fetch teacher details.");
      } finally {
        setLoading(false);
        console.log("teacher", teacher);
      }
    };

    fetchData(); // Call the fetch function when the usejkhkjr is available
  }, [user]); // Dependency

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

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
          {selectedTab === "Personal Information" && (
            <PersonalInformation
              firstName={teacher?.userId?.firstName || ""}
              lastName={teacher?.userId?.lastName || ""}
              email={teacher?.userId?.email || ""}
              phoneNumber={teacher?.userId?.phoneNumber || ""}
            />
          )}
          {selectedTab === "Qualifications and Experience" && (
            <Qualifications
              highestAcademicQualification={
                teacher?.highestAcademicQualification || ""
              }
              yearsOfExperience={teacher?.yearsOfExperience || 1}
              specialization={teacher?.specialization || ""}
            />
          )}
          {selectedTab === "Employment Details" && <EmploymentDetails employmentType={teacher?.employmentType || ""} role={teacher?.userId.role || ""} />}
          {selectedTab === "Class and Subjects" && <ClassAndSubjects assignedClasses={assignedClasses} assignedCourses={teacher?.assignedCourses || []} />}
          {selectedTab === "Availability" && <Availability availableDays={teacher?.availabilityDays || []} availableTime={teacher?.availableTime || ""} />}
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
