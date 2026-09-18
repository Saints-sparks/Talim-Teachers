"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpen, Camera, GraduationCap, Key, Shield, UserCircle, Users } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { ApiErrorState } from "@/components/states";
import { useAuth } from "@/app/context/AuthContext";
import { getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { CLOUDINARY_UPLOAD_PRESET, cloudinaryUploadUrl } from "@/app/lib/cloudinary";
import { useTeacherSettings, useUpdateTeacherAvatar } from "@/hooks/settings/useTeacherSettings";
import { ActionCard, Card, CardHeader, InfoRow, SectionHeader, SettingsSkeleton, SummaryCard } from "./primitives";
import ChangePasswordModal from "./ChangePasswordModal";

/**
 * Formats a stored timestamp for display, or an em dash when there is none.
 *
 * @param value - An ISO timestamp.
 * @returns The formatted date.
 */
function formatJoined(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Account overview: who the teacher is, what they are assigned, and the three
 * things they can change themselves (photo, password, profile).
 *
 * @returns The Account section element.
 */
export function AccountSection() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useTeacherSettings();
  const updateAvatar = useUpdateTeacherAvatar();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = data?.profile;
  const summary = data?.summary;
  const fullName = profile?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Teacher";
  const avatar = profile?.avatar || user?.userAvatar;
  const isActive = (profile?.isActive ?? user?.isActive) !== false;

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      // Cloudinary is a third party, so this one call stays on `fetch`; the
      // cloud name and preset come from the environment, never a literal.
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const uploadResponse = await fetch(cloudinaryUploadUrl("image"), { method: "POST", body: formData });
      const uploadData: { secure_url?: string } = await uploadResponse.json();
      if (!uploadData.secure_url) throw new Error("We couldn't upload that image. Please try another file.");

      await updateAvatar.mutateAsync(uploadData.secure_url);
      toast.success("Profile photo updated.");
    } catch (uploadError) {
      logger.error("settings", "avatar upload failed", uploadError);
      toast.error(getErrorMessage(uploadError, "Failed to upload profile photo."));
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Account" desc="View and manage your personal account information." />
        <SettingsSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Account" desc="View and manage your personal account information." />
        <ApiErrorState error={error} fallback="We couldn't load your account details." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Account" desc="View and manage your personal account information." />

      <Card>
        <CardHeader title="Profile" />
        <div className="p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-5 sm:flex-row">
            <div className="shrink-0 self-start">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-[#EAF2FB] dark:border-slate-700">
                {avatar ? (
                  <img src={avatar} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#003366] dark:bg-blue-700">
                    <span className="text-2xl font-bold text-white">
                      {(profile?.firstName?.[0] ?? user?.firstName?.[0] ?? "T").toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <InfoRow label="Full Name" value={fullName} />
              <InfoRow
                label="Role"
                value={
                  <span className="inline-flex items-center rounded-md bg-[#E7F0FF] px-2 py-0.5 text-xs font-semibold capitalize text-[#003366] dark:bg-blue-900/30 dark:text-blue-400">
                    {(profile?.role ?? user?.role ?? "teacher").replace(/_/g, " ")}
                  </span>
                }
              />
              <InfoRow label="Email Address" value={profile?.email ?? user?.email ?? "—"} />
              <InfoRow label="Employee ID" value={data?.employment?.employeeId ?? "—"} />
              <InfoRow label="School ID" value={profile?.schoolIdentifier ?? "—"} />
              <InfoRow label="School" value={profile?.schoolName ?? user?.schoolName ?? "—"} />
              <InfoRow label="Phone Number" value={profile?.phoneNumber ?? user?.phoneNumber ?? "—"} />
              <InfoRow label="Joined" value={formatJoined(profile?.joinedAt)} />
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-[#BFD7FF] bg-[#EFF5FF] p-3 dark:border-blue-800/50 dark:bg-blue-900/20">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#003366] dark:text-blue-400" />
            <p className="text-xs leading-relaxed text-[#003366] dark:text-blue-300">
              Employment, class assignments, and subjects are managed by your school administrator.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Account Actions" />
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          <ActionCard
            icon={<UserCircle size={22} />}
            iconBg="bg-[#E7F0FF] dark:bg-blue-900/30"
            iconColor="text-[#003366] dark:text-blue-400"
            title="View Profile"
            desc="View your full profile and teaching assignments"
            action={
              <Link href="/profile" className="text-sm font-semibold text-[#003366] hover:underline dark:text-blue-400">
                Open Profile
              </Link>
            }
          />
          <ActionCard
            icon={<Camera size={22} />}
            iconBg="bg-emerald-50 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
            title="Change Photo"
            desc="Update your profile photo that appears across Talim"
            action={
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto || updateAvatar.isPending}
                  className="text-sm font-semibold text-[#003366] hover:underline disabled:opacity-60 dark:text-blue-400"
                >
                  {uploadingPhoto || updateAvatar.isPending ? "Uploading…" : "Upload Photo"}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </>
            }
          />
          <ActionCard
            icon={<Key size={22} />}
            iconBg="bg-purple-50 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            title="Change Password"
            desc="Update your password to keep your account secure"
            action={
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="text-sm font-semibold text-[#003366] hover:underline dark:text-blue-400"
              >
                Change Password
              </button>
            }
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Account Summary" />
        <div className="grid grid-cols-1 gap-3 p-4 min-[420px]:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <SummaryCard
            label="Classes Assigned"
            value={summary?.classesAssigned ?? 0}
            sub="Active classes"
            icon={<Users size={20} />}
            color="text-[#003366] dark:text-blue-400"
          />
          <SummaryCard
            label="Subjects Teaching"
            value={summary?.subjectsTeaching ?? 0}
            sub="Active subjects"
            icon={<BookOpen size={20} />}
            color="text-purple-600 dark:text-purple-400"
          />
          <SummaryCard
            label="Students Teaching"
            value={summary?.studentsTeaching ?? "—"}
            sub="Total students"
            icon={<GraduationCap size={20} />}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <SummaryCard
            label="Account Status"
            value={isActive ? "Active" : "Inactive"}
            sub={isActive ? "Your account is active" : "Account inactive"}
            icon={<Shield size={20} />}
            color={isActive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}
          />
        </div>
      </Card>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}

export default AccountSection;
