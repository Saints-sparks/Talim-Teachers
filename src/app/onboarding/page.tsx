"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Upload } from "lucide-react";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";
import { Avatar } from "@/components/tl/Avatar";
import { card, cardTitle, ghostButton, pill, pillTone, primaryButton } from "@/components/tl/styles";
import { useAppContext } from "@/app/context/AppContext";
import { useAuth } from "@/app/hooks/useAuth";
import { fetchTeacherDetails } from "@/app/services/api.service";
import { uploadProfileAvatar } from "../lib/avatarUpload";
import { getErrorMessage } from "@/lib/apiError";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";

/** The parts of the teacher record the onboarding summary reads. */
interface TeacherRecord {
  userId?: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
  employmentRole?: string;
  employmentType?: string;
  highestAcademicQualification?: string;
  yearsOfExperience?: number;
  specialization?: string;
  availabilityDays?: string[];
  classTeacherClasses?: Array<{ _id?: string; name?: string }>;
  assignedClasses?: Array<{ _id?: string; name?: string }>;
  assignedCourses?: Array<{ _id?: string; title?: string; courseCode?: string }>;
  classTeacherCourses?: Array<{ _id?: string; title?: string; courseCode?: string }>;
}

/**
 * `/onboarding`, the first step of first-run setup, in the redesign: the
 * teacher checks the profile the school office holds (name, contact,
 * employment, qualifications, availability, classes and subjects), adds a
 * photo, and confirms. Confirming completes phase 1 in the onboarding store
 * and opens the setup checklist; a teacher who has confirmed before goes
 * straight there.
 *
 * @returns The page.
 */
export default function TeacherOnboardingPhase1() {
  const router = useRouter();
  const { user, updateUser } = useAppContext();
  const { getAccessToken } = useAuth();
  const { isHydrated, phase1Completed, completePhase1 } =
    useTeacherOnboarding();

  const [teacher, setTeacher] = useState<TeacherRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const userId = user?.userId || user?._id || user?.id;
  const userAvatar = user?.userAvatar;

  useEffect(() => {
    if (isHydrated && phase1Completed) {
      router.replace("/onboarding/setup");
    }
  }, [isHydrated, phase1Completed, router]);

  useEffect(() => {
    let cancelled = false;

    const loadTeacher = async () => {
      const token = getAccessToken();
      if (!token || !userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchTeacherDetails(userId, token);
        if (cancelled) return;
        setTeacher(data);
        setAvatarPreview(userAvatar || data?.userId?.userAvatar || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTeacher();
    return () => {
      cancelled = true;
    };
  }, [userId, userAvatar]);

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
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const avatarUrl = await uploadProfileAvatar(file);
      setAvatarPreview(avatarUrl);
      updateUser({ userAvatar: avatarUrl });
    } catch (err) {
      setUploadError(getErrorMessage(err, "The photo could not be saved. Please try again."));
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
      <OnboardingFrame stepText="Step 1 of 2" title="Confirm your profile" description="Loading what the school office has on record…">
        <div className="flex flex-col gap-[18px]" role="status" aria-label="Loading your profile">
          <div className="h-[118px] animate-pulse rounded-[22px] bg-tl-line/70" />
          <div className="grid gap-[18px] md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[170px] animate-pulse rounded-[22px] bg-tl-line/70" />
            ))}
          </div>
        </div>
      </OnboardingFrame>
    );
  }

  const classNames = teacherInfo.classes.map((c) => c.name).filter((n): n is string => Boolean(n));
  const courseNames = teacherInfo.courses.map((c) => c.title || c.courseCode).filter((n): n is string => Boolean(n));

  return (
    <OnboardingFrame
      stepText="Step 1 of 2"
      title="Confirm your profile"
      description="Check what the school office has on record for you. Add a photo so students and parents recognise you; ask the office to change anything else."
    >
      <section className={`${card} flex flex-wrap items-center gap-4`} aria-label="Your photo">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full">
          {avatarPreview ? (
            <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <Avatar id={String(userId ?? teacherInfo.name)} name={teacherInfo.name} size={72} />
          )}
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(15,27,46,0.45)]">
              <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
            </div>
          ) : null}
        </div>
        <div className="min-w-[200px] flex-1">
          <h2 className="text-xl font-extrabold tracking-[-0.3px] text-tl-ink">{teacherInfo.name}</h2>
          <p className="mt-0.5 text-sm text-tl-muted">{teacherInfo.email}</p>
        </div>
        <div>
          <input id="onboarding-photo" type="file" className="peer sr-only" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
          <label
            htmlFor="onboarding-photo"
            className={`${ghostButton} cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-tl-link peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-tl-surface ${uploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <Upload className="h-4 w-4" aria-hidden />
            {uploading ? "Saving photo…" : avatarPreview ? "Change photo" : "Add a photo"}
          </label>
        </div>
        {uploadError ? (
          <p role="alert" className="basis-full text-sm font-bold text-tl-danger">
            {uploadError}
          </p>
        ) : null}
      </section>

      <div className="grid gap-[18px] md:grid-cols-2">
        <InfoPanel
          title="Personal details"
          items={[
            ["Full name", teacherInfo.name],
            ["Email", teacherInfo.email],
            ["Phone", teacherInfo.phone],
          ]}
        />
        <InfoPanel
          title="Employment"
          items={[
            ["Role", teacherInfo.role],
            ["Type", teacherInfo.employmentType],
            ["Specialisation", teacherInfo.specialization],
          ]}
        />
        <InfoPanel
          title="Qualifications"
          items={[
            ["Highest qualification", teacherInfo.qualification],
            ["Experience", teacherInfo.experience],
          ]}
        />
        <InfoPanel title="Availability" items={[["Available days", teacherInfo.availability]]} />
      </div>

      <section className={card} aria-labelledby="onboarding-classes">
        <h2 id="onboarding-classes" className={cardTitle}>
          Classes and subjects
        </h2>
        <p className="mt-1 text-[13px] text-tl-muted">
          {teacherInfo.classes.length} {teacherInfo.classes.length === 1 ? "class" : "classes"} and {teacherInfo.courses.length}{" "}
          {teacherInfo.courses.length === 1 ? "subject" : "subjects"} assigned to you.
        </p>
        {classNames.length || courseNames.length ? (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Assigned classes and subjects">
            {classNames.map((name) => (
              <li key={`c-${name}`} className={`${pill} ${pillTone.info}`}>
                {name}
              </li>
            ))}
            {courseNames.map((name) => (
              <li key={`k-${name}`} className={`${pill} ${pillTone.muted}`}>
                {name}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <p className="flex items-start gap-2.5 rounded-[18px] bg-tl-select px-[18px] py-3.5 text-sm leading-[1.55] text-tl-ink">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-tl-brand" aria-hidden />
        To change your employment, classes, subjects or contact details, ask the school office.
      </p>

      <div>
        <button type="button" onClick={handleContinue} className={`${primaryButton} w-full sm:w-auto`}>
          Confirm and continue
        </button>
      </div>
    </OnboardingFrame>
  );
}

/**
 * One panel of the profile: a heading over label and value rows (the
 * design's class-card rows). An empty value reads "Not set".
 *
 * @param props - The panel.
 * @param props.title - The heading.
 * @param props.items - Label and value pairs.
 * @returns The panel.
 */
function InfoPanel({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className={card} aria-label={title}>
      <h2 className={cardTitle}>{title}</h2>
      <dl className="mt-2 flex flex-col">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-t border-tl-line-soft py-2.5 text-sm first:border-t-0">
            <dt className="text-tl-muted">{label}</dt>
            <dd className={`text-right font-extrabold ${value && value !== "Not set" ? "text-tl-ink" : "text-tl-faint"}`}>{value || "Not set"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
