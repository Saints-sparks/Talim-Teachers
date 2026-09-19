"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronLeft,
  GraduationCap,
  Hash,
  Heart,
  Mail,
  Phone,
  User,
  UserCircle,
  Users,
  XCircle,
} from "lucide-react";
import { isStudentActive, type StudentRecord } from "@/app/services/students/students.service";
import { EmptySection, FieldCard, TabPill, formatBirthDate, safe, type ProfileTab } from "./ProfilePrimitives";

const TAB_TITLES: Record<ProfileTab, string> = {
  personal: "Personal Details",
  parent: "Parent / Guardian Information",
  academic: "Academic Details",
};

/**
 * A student's profile: hero card and three tabs (personal, parent/guardian,
 * academic). Date of birth and gender come from the populated user, which is
 * where `GET /students/:id` puts them; fields the endpoint does not return
 * (email verification, student number, school name) are not shown.
 *
 * @param props - Component props.
 * @param props.student - The student record.
 * @returns The profile.
 */
const StudentProfile: React.FC<{ student: StudentRecord }> = ({ student }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const router = useRouter();

  const firstName = student.userId?.firstName ?? "";
  const lastName = student.userId?.lastName ?? "";
  const email = student.userId?.email ?? "";
  const phone = student.userId?.phoneNumber ?? "";
  const avatar = student.userId?.userAvatar ?? null;
  const dateOfBirth = student.userId?.dateOfBirth;
  const gender = student.userId?.gender;
  const isActive = isStudentActive(student);
  const className = student.classId?.name ?? "";
  const initials = ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() || "?";

  const parentName =
    student.parentContact?.fullName ||
    `${student.parentId?.firstName ?? ""} ${student.parentId?.lastName ?? ""}`.trim();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F1629]" data-guide="student-profile-shell">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 dark:bg-[#0F172A] dark:border-[#263A5C]">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-600 hover:text-[#003366] hover:border-[#003366]/30 transition-all flex-shrink-0 dark:border-[#315F95] dark:text-blue-200 dark:hover:bg-[#132742] dark:hover:text-white"
            title="Go back"
            aria-label="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-slate-100">Student Profile</h1>
            <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">
              {firstName} {lastName}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center dark:bg-[#0F172A] dark:border-[#263A5C]">
          {avatar ? (
            <img
              src={avatar}
              alt={`${firstName} ${lastName}`}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-[#003366]/15 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#003366] flex items-center justify-center ring-4 ring-[#003366]/15 shadow-md">
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
          )}

          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-slate-100">
            {firstName} {lastName}
          </h2>
          <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">{email || "No email"}</p>

          <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-500/40"
                  : "bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-500/40"
              }`}
            >
              {isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {isActive ? "Active" : "Inactive"}
            </span>
            {className && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 dark:bg-[#1B2B45] dark:text-slate-200 dark:border-[#263A5C]">
                <GraduationCap className="w-3.5 h-3.5" />
                {className}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TabPill active={activeTab === "personal"} icon={User} label="Personal" onClick={() => setActiveTab("personal")} />
          <TabPill
            active={activeTab === "parent"}
            icon={Users}
            label="Parent / Guardian"
            onClick={() => setActiveTab("parent")}
          />
          <TabPill active={activeTab === "academic"} icon={BookOpen} label="Academic" onClick={() => setActiveTab("academic")} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden dark:bg-[#0F172A] dark:border-[#263A5C]">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 dark:bg-[#111C31] dark:border-[#263A5C]">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">{TAB_TITLES[activeTab]}</h3>
          </div>

          <div className="p-5 space-y-3">
            {activeTab === "personal" && (
              <>
                <FieldCard icon={User} label="First Name" value={safe(firstName)} />
                <FieldCard icon={User} label="Last Name" value={safe(lastName)} />
                <FieldCard icon={Mail} label="Email Address" value={safe(email)} />
                <FieldCard icon={Phone} label="Phone Number" value={safe(phone)} />
                {dateOfBirth && <FieldCard icon={Calendar} label="Date of Birth" value={formatBirthDate(dateOfBirth)} />}
                {gender && <FieldCard icon={UserCircle} label="Gender" value={safe(gender)} />}
              </>
            )}

            {activeTab === "parent" &&
              (parentName ? (
                <>
                  <FieldCard icon={User} label="Full Name" value={parentName} />
                  <FieldCard icon={Heart} label="Relationship" value={safe(student.parentContact?.relationship)} />
                  <FieldCard
                    icon={Phone}
                    label="Phone Number"
                    value={safe(student.parentContact?.phoneNumber || student.parentId?.phoneNumber)}
                  />
                  <FieldCard
                    icon={Mail}
                    label="Email Address"
                    value={safe(student.parentContact?.email || student.parentId?.email)}
                  />
                </>
              ) : (
                <EmptySection message="Parent/guardian details are not available for this student." />
              ))}

            {activeTab === "academic" && (
              <>
                <FieldCard icon={GraduationCap} label="Class" value={safe(className)} />
                <FieldCard icon={Hash} label="Grade Level" value={safe(student.gradeLevel ?? student.classId?.gradeLevel)} />
                {student.admissionNumber && (
                  <FieldCard icon={Hash} label="Admission No." value={safe(student.admissionNumber)} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
