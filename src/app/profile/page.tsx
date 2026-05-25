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
import { fetchTeacherDetails } from "../services/api.service";
import { Teacher } from "@/types/student";
import { useAppContext } from "../context/AppContext";
import { API_BASE_URL } from "../lib/api/config";

const tabs = [
  { label: "Personal Information", icon: <UserRound /> },
  { label: "Qualifications and Experience", icon: <Medal /> },
  { label: "Employment Details", icon: <BriefcaseBusiness /> },
  { label: "Class and Subjects", icon: <BookOpenText /> },
  { label: "Availability", icon: <Clock /> },
];

export default function Profile() {
  const { user, updateUser } = useAppContext();
  const { getAccessToken } = useAuth(); // Get logged-in teacher's info
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(tabs[0].label);
  const CLOUD_NAME = "ddbs7m7nt";
  const UPLOAD_PRESET = "presetOne";
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();
  const token = getAccessToken();

   const getInitials = () => {
    if (!user) return "US"; // Default if no user

    const firstNameInitial = user.firstName?.[0]?.toUpperCase() || "";
    const lastNameInitial = user.lastName?.[0]?.toUpperCase() || "";

    // Handle cases where only one name exists
    return `${firstNameInitial}${lastNameInitial}` || "US";
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) throw new Error("Cloudinary upload failed");
      // Send to backend
      const avatarUrl = cloudData.secure_url;
      
      const apiRes = await fetch(`${API_BASE_URL}/auth/profile/avatar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarUrl }),
      });
      if (!apiRes.ok) throw new Error("Failed to update avatar");
      updateUser({ userAvatar: avatarUrl });
    } catch (err: any) {
      setErrorMsg(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        if (!token) throw new Error("Unauthorized");
        const teacherDetails = await fetchTeacherDetails(user.userId, token);
        setTeacher(teacherDetails);
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
        <div className="flex min-h-full flex-col gap-4 p-3 sm:gap-6 sm:p-4">
          <Button
            className="bg-transparent shadow-none hover:bg-gray-200 self-start"
            onClick={() => router.back()}
          >
            <ChevronLeft className="text-[#6F6F6F]" strokeWidth={1.5} />
          </Button>

          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white px-4 py-8 dark:bg-slate-900 sm:flex-row sm:justify-start sm:rounded-3xl sm:p-10">
             <Avatar className="w-[100px] sm:w-[150px] h-[100px] sm:h-[150px]">
                <AvatarImage src={user?.userAvatar || "/placeholder.svg"} alt="User avatar" />
                <AvatarFallback className="bg-green-300">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            <div className="flex w-full max-w-xs flex-col items-center gap-3 text-center sm:w-auto sm:items-start sm:text-left">
              <p className="text-[#030E18] dark:text-slate-100">My Profile</p>
              <Button
                className="w-full border border-[#003366] bg-[#F3F3F3] text-[#003366] shadow-none hover:bg-gray-200 sm:w-auto"
                onClick={handleUploadClick}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Photo"}
              </Button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              {errorMsg && (
                <div className="text-red-500 text-sm mt-2">{errorMsg}</div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl bg-white p-3 dark:bg-slate-900 sm:rounded-3xl sm:p-4">
            {/* Tab Buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => (
                <Button
                  key={tab.label}
                  onClick={() => setSelectedTab(tab.label)}
                  className={`shrink-0 rounded-lg border border-[#F0F0F0] text-[#686868] hover:bg-gray-200 shadow-none items-center dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${
                    selectedTab === tab.label
                      ? "bg-[#F0F0F0] border-[#ADBECE] dark:bg-slate-800"
                      : "bg-white dark:bg-slate-900"
                  }`}
                >
                  <span className="h-4 w-4 shrink-0">{tab.icon}</span>
                  <span className="whitespace-nowrap">{tab.label}</span>
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
                staffNumber={teacher!.staffNumber}
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
                assignedClasses={teacher!.classTeacherClasses || []}
                assignedCourses={teacher!.assignedCourses || []}
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
