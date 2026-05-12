"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpenText,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Medal,
  Upload,
  UserRound,
} from "lucide-react";
import { useAppContext } from "@/app/context/AppContext";
import { useAuth } from "@/app/hooks/useAuth";
import { fetchTeacherDetails } from "@/app/services/api.service";
import { API_BASE_URL } from "@/app/lib/api/config";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";

export default function TeacherOnboardingPhase1() {
  const router = useRouter();
  const { user, updateUser } = useAppContext();
  const { getAccessToken } = useAuth();
  const { isHydrated, phase1Completed, completePhase1 } =
    useTeacherOnboarding();

  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && phase1Completed) {
      router.replace("/onboarding/setup");
    }
  }, [isHydrated, phase1Completed, router]);

  useEffect(() => {
    let cancelled = false;

    const loadTeacher = async () => {
      const token = getAccessToken();
      const userId = user?.userId || user?._id;
      if (!token || !userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchTeacherDetails(userId, token);
        if (cancelled) return;
        setTeacher(data);
        setAvatarPreview(user?.userAvatar || data?.userId?.userAvatar || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTeacher();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, user]);

  const teacherInfo = useMemo(() => {
    const teacherUser = teacher?.userId || user || {};
    return {
      name:
        [teacherUser.firstName, teacherUser.lastName].filter(Boolean).join(" ") ||
        "Not set",
      email: teacherUser.email || user?.email || "Not set",
      phone: teacherUser.phoneNumber || user?.phoneNumber || "Not set",
      role: teacher?.employmentRole || "Teacher",
      employmentType: teacher?.employmentType || "Not set",
      qualification: teacher?.highestAcademicQualification || "Not set",
      experience:
        typeof teacher?.yearsOfExperience === "number"
          ? `${teacher.yearsOfExperience} year${teacher.yearsOfExperience === 1 ? "" : "s"}`
          : "Not set",
      specialization: teacher?.specialization || "Not set",
      availability:
        Array.isArray(teacher?.availabilityDays) && teacher.availabilityDays.length
          ? teacher.availabilityDays.join(", ")
          : "Not set",
      classes: teacher?.classTeacherClasses || teacher?.assignedClasses || [],
      courses: teacher?.assignedCourses || teacher?.classTeacherCourses || [],
    };
  }, [teacher, user]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const token = getAccessToken();
    if (!file || !token) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "presetOne");

      const cloudRes = await fetch(
        "https://api.cloudinary.com/v1_1/ddbs7m7nt/image/upload",
        { method: "POST", body: formData }
      );
      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) throw new Error("Image upload failed");

      const apiRes = await fetch(`${API_BASE_URL}/auth/profile/avatar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarUrl: cloudData.secure_url }),
      });
      if (!apiRes.ok) throw new Error("Failed to update profile photo");

      setAvatarPreview(cloudData.secure_url);
      updateUser({ userAvatar: cloudData.secure_url });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleContinue = () => {
    completePhase1();
    router.push("/onboarding/setup");
  };

  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#003366] p-12">
        <div className="text-center max-w-sm">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
            <UserRound className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Teacher Setup</h1>
          <p className="mt-3 text-sm text-white/70 leading-relaxed">
            Confirm your profile and teaching information. School-controlled
            details remain read-only and can be changed by your admin.
          </p>
        </div>
      </div>

      <main className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <p className="text-sm font-semibold text-[#003366]">Phase 1</p>
            <h2 className="mt-1 text-2xl font-bold text-[#030E18]">
              Confirm your profile
            </h2>
            <p className="mt-2 text-sm text-[#6F6F6F]">
              Review your details before continuing to your teacher setup
              checklist.
            </p>
          </div>

          <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-full bg-[#EAF2FB] flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={teacherInfo.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-9 w-9 text-[#003366]" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#030E18]">
                  {teacherInfo.name}
                </h3>
                <p className="text-sm text-[#6F6F6F]">{teacherInfo.email}</p>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#003366]">
                  <Upload className="h-4 w-4" />
                  {avatarPreview ? "Change photo" : "Upload photo"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
          </section>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoPanel
              icon={<UserRound className="h-5 w-5" />}
              title="Personal details"
              items={[
                ["Full name", teacherInfo.name],
                ["Email", teacherInfo.email],
                ["Phone", teacherInfo.phone],
              ]}
            />
            <InfoPanel
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              title="Employment"
              items={[
                ["Role", teacherInfo.role],
                ["Type", teacherInfo.employmentType],
                ["Specialization", teacherInfo.specialization],
              ]}
            />
            <InfoPanel
              icon={<Medal className="h-5 w-5" />}
              title="Qualifications"
              items={[
                ["Highest qualification", teacherInfo.qualification],
                ["Experience", teacherInfo.experience],
              ]}
            />
            <InfoPanel
              icon={<Clock className="h-5 w-5" />}
              title="Availability"
              items={[["Available days", teacherInfo.availability]]}
            />
          </div>

          <section className="mt-5 rounded-2xl border border-[#F0F0F0] bg-[#FBFBFB] p-5">
            <div className="flex items-start gap-3">
              <BookOpenText className="mt-0.5 h-5 w-5 text-[#003366]" />
              <div>
                <h3 className="text-sm font-semibold text-[#030E18]">
                  Classes and courses
                </h3>
                <p className="mt-1 text-sm text-[#6F6F6F]">
                  {teacherInfo.classes.length} class
                  {teacherInfo.classes.length === 1 ? "" : "es"} assigned,{" "}
                  {teacherInfo.courses.length} course
                  {teacherInfo.courses.length === 1 ? "" : "s"} assigned.
                </p>
              </div>
            </div>
          </section>

          <div className="mt-5 flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3">
            <Lock className="h-4 w-4 shrink-0 text-blue-600" />
            <p className="text-xs text-blue-700">
              Contact your school admin to change employment, class, course, or
              contact information.
            </p>
          </div>

          <button
            onClick={handleContinue}
            className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#003366] text-sm font-semibold text-white hover:bg-[#002244]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm & Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: Array<[string, string]>;
}) {
  return (
    <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5">
      <div className="flex items-center gap-2 text-[#003366]">
        {icon}
        <h3 className="text-sm font-semibold text-[#030E18]">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-[#878787]">{label}</p>
            <p className="text-sm font-medium text-[#030E18]">{value || "Not set"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
