"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  User,
  Users,
  BookOpen,
  Mail,
  Phone,
  Hash,
  GraduationCap,
  Home,
  Heart,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ShieldOff,
  Calendar,
  UserCircle,
} from "lucide-react";
import { Student } from "@/types/student";

// ── helpers ──────────────────────────────────────────────────────────────────
const safe = (v: any, fallback = "N/A") =>
  v === null || v === undefined || v === "" ? fallback : String(v);

const getInitials = (first: string, last: string) =>
  ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "?";

// ── Field card (matches mobile ProfileField pattern) ─────────────────────────
const FieldCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100">
    <div className="w-9 h-9 rounded-lg bg-[#003366]/10 border border-[#003366]/15 flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4 text-[#003366]" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-900 mt-0.5 break-words">
        {value}
      </p>
    </div>
  </div>
);

// ── Empty section state ───────────────────────────────────────────────────────
const EmptySection = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center gap-3 py-12">
    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
      <Users className="w-7 h-7 text-gray-300" />
    </div>
    <p className="text-sm text-gray-500 text-center max-w-xs">{message}</p>
  </div>
);

// ── Tab pill ──────────────────────────────────────────────────────────────────
type Tab = "personal" | "parent" | "academic";

const TabPill = ({
  tab,
  active,
  icon: Icon,
  label,
  onClick,
}: {
  tab: Tab;
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none justify-center sm:justify-start ${
      active
        ? "bg-[#003366] text-white shadow-sm"
        : "bg-white text-gray-500 border border-gray-200 hover:text-[#003366] hover:border-[#003366]/30"
    }`}
  >
    <span
      className={`flex items-center justify-center w-6 h-6 rounded-md ${
        active ? "bg-white/20" : "bg-gray-100"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : "text-gray-500"}`} />
    </span>
    <span className="hidden sm:inline">{label}</span>
    <span className="sm:hidden text-xs">{label.split(" ")[0]}</span>
  </button>
);

// ── Main component ────────────────────────────────────────────────────────────
const StudentProfile: React.FC<{ student: Student }> = ({ student }) => {
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const router = useRouter();

  const firstName = student.userId?.firstName ?? "";
  const lastName = student.userId?.lastName ?? "";
  const email = student.userId?.email ?? "";
  const phone = student.userId?.phoneNumber ?? "";
  const avatar = (student.userId as any)?.userAvatar ?? null;
  const isActive = student.isActive !== false;
  const isVerified = (student.userId as any)?.isEmailVerified ?? false;
  const className = student.classId?.name ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Page header bar ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:text-[#003366] hover:border-[#003366]/30 transition-all flex-shrink-0"
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">Student Profile</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {firstName} {lastName}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ── Hero / avatar card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
          {/* Avatar */}
          {avatar ? (
            <img
              src={avatar}
              alt={`${firstName} ${lastName}`}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-[#003366]/15 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#003366] flex items-center justify-center ring-4 ring-[#003366]/15 shadow-md">
              <span className="text-2xl font-bold text-white">
                {getInitials(firstName, lastName)}
              </span>
            </div>
          )}

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            {firstName} {lastName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{email || "No email"}</p>

          {/* Status badges */}
          <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-red-50 text-red-600 border border-red-100"
              }`}
            >
              {isActive ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {isActive ? "Active" : "Inactive"}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
                isVerified
                  ? "bg-[#003366]/10 text-[#003366] border border-[#003366]/15"
                  : "bg-red-50 text-red-600 border border-red-100"
              }`}
            >
              {isVerified ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <ShieldOff className="w-3.5 h-3.5" />
              )}
              {isVerified ? "Verified" : "Not Verified"}
            </span>
            {className && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                <GraduationCap className="w-3.5 h-3.5" />
                {className}
              </span>
            )}
          </div>
        </div>

        {/* ── Tab pills ── */}
        <div className="flex items-center gap-2">
          <TabPill
            tab="personal"
            active={activeTab === "personal"}
            icon={User}
            label="Personal"
            onClick={() => setActiveTab("personal")}
          />
          <TabPill
            tab="parent"
            active={activeTab === "parent"}
            icon={Users}
            label="Parent / Guardian"
            onClick={() => setActiveTab("parent")}
          />
          <TabPill
            tab="academic"
            active={activeTab === "academic"}
            icon={BookOpen}
            label="Academic"
            onClick={() => setActiveTab("academic")}
          />
        </div>

        {/* ── Tab content card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">
              {activeTab === "personal" && "Personal Details"}
              {activeTab === "parent" && "Parent / Guardian Information"}
              {activeTab === "academic" && "Academic Details"}
            </h3>
          </div>

          {/* Card body */}
          <div className="p-5 space-y-3">
            {/* ── Personal tab ── */}
            {activeTab === "personal" && (
              <>
                <FieldCard icon={User} label="First Name" value={safe(firstName)} />
                <FieldCard icon={User} label="Last Name" value={safe(lastName)} />
                <FieldCard icon={Mail} label="Email Address" value={safe(email)} />
                <FieldCard icon={Phone} label="Phone Number" value={safe(phone)} />
                {student.dateOfBirth && (
                  <FieldCard
                    icon={Calendar}
                    label="Date of Birth"
                    value={safe(student.dateOfBirth)}
                  />
                )}
                {student.gender && (
                  <FieldCard
                    icon={UserCircle}
                    label="Gender"
                    value={safe(student.gender)}
                  />
                )}
              </>
            )}

            {/* ── Parent tab ── */}
            {activeTab === "parent" && (
              <>
                {student.parentContact?.fullName || student.parentId?.firstName ? (
                  <>
                    <FieldCard
                      icon={User}
                      label="Full Name"
                      value={
                        student.parentContact?.fullName ||
                        `${student.parentId?.firstName ?? ""} ${student.parentId?.lastName ?? ""}`.trim() ||
                        "N/A"
                      }
                    />
                    <FieldCard
                      icon={Heart}
                      label="Relationship"
                      value={safe(student.parentContact?.relationship)}
                    />
                    <FieldCard
                      icon={Phone}
                      label="Phone Number"
                      value={
                        student.parentContact?.phoneNumber ||
                        student.parentId?.phoneNumber ||
                        "N/A"
                      }
                    />
                    <FieldCard
                      icon={Mail}
                      label="Email Address"
                      value={
                        student.parentContact?.email ||
                        student.parentId?.email ||
                        "N/A"
                      }
                    />
                  </>
                ) : (
                  <EmptySection message="Parent/guardian details are not available for this student." />
                )}
              </>
            )}

            {/* ── Academic tab ── */}
            {activeTab === "academic" && (
              <>
                <FieldCard
                  icon={GraduationCap}
                  label="Class"
                  value={safe(className)}
                />
                <FieldCard
                  icon={Hash}
                  label="Grade Level"
                  value={safe(student.gradeLevel)}
                />
                {(student as any).studentId && (
                  <FieldCard
                    icon={Hash}
                    label="Student ID"
                    value={safe((student as any).studentId)}
                  />
                )}
                {(student as any).schoolName && (
                  <FieldCard
                    icon={Home}
                    label="School"
                    value={safe((student as any).schoolName)}
                  />
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
