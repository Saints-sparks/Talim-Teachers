"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { toast } from "@/components/CustomToast";
import { Avatar } from "@/components/tl/Avatar";
import { focusRing, ghostButton } from "@/components/tl/styles";
import { useAuth } from "@/app/context/AuthContext";
import { useAppContext } from "@/app/context/AppContext";
import { ApiError, getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { useSaveProfileField } from "@/hooks/settings/useAccount";
import { useTeacherSettings, useUpdateTeacherAvatar } from "@/hooks/settings/useTeacherSettings";
import { formatJoinedDate, isClassTeacher, profileRecordSections, validateProfileField, type ProfileField } from "@/hooks/settings/settings.logic";
import { PanelError, PanelSkeleton, groupHeading } from "./SettingsRows";

/** The small uppercase label above an Account input (the design's field label). */
const accountLabel = "mb-[7px] block text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint";

/** Where a field's save stands. */
type FieldStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

/** Props for {@link ProfileInput}. */
interface ProfileInputProps {
  field: ProfileField;
  label: string;
  /** The stored value (from `GET /teacher/settings`, else the signed-in user). */
  storedValue: string;
  type?: "text" | "tel";
  autoComplete: string;
  /** Saves the field; throws the `ApiError` on failure. */
  onSave: (field: ProfileField, value: string) => Promise<void>;
}

/**
 * One editable profile field. It saves when the teacher leaves it, and only
 * when the trimmed value changed and passes the §33 rules; the status line
 * under it says "Saving…", "Saved" or what is wrong.
 *
 * @param props - See {@link ProfileInputProps}.
 * @param props.field - Which profile field.
 * @param props.label - The visible label.
 * @param props.storedValue - The value currently saved.
 * @param props.type - The input type.
 * @param props.autoComplete - The autocomplete token.
 * @param props.onSave - Saves the new value.
 * @returns The labelled input and its status.
 */
function ProfileInput({ field, label, storedValue, type = "text", autoComplete, onSave }: ProfileInputProps) {
  const inputId = useId();
  const statusId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(storedValue);
  const [saved, setSaved] = useState(storedValue);
  const [status, setStatus] = useState<FieldStatus>({ kind: "idle" });

  // Follow the server's value (after a refetch) unless the teacher is editing.
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setValue(storedValue);
    setSaved(storedValue);
  }, [storedValue]);

  /**
   * Saves the field when the teacher leaves it, if the trimmed value changed
   * and is valid; otherwise restores or explains.
   *
   * @returns Resolves when the save (if any) has finished.
   */
  const handleBlur = async () => {
    const trimmed = value.trim();
    if (trimmed === saved.trim()) {
      setValue(saved);
      if (status.kind === "error") setStatus({ kind: "idle" });
      return;
    }
    const problem = validateProfileField(field, trimmed);
    if (problem) {
      setStatus({ kind: "error", message: problem });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      await onSave(field, trimmed);
      setSaved(trimmed);
      setValue(trimmed);
      setStatus({ kind: "saved" });
    } catch (error) {
      const named = error instanceof ApiError ? error.fieldErrors()[field] : undefined;
      setStatus({ kind: "error", message: named ?? getErrorMessage(error, "We couldn't save that. Please try again.") });
    }
  };

  const isError = status.kind === "error";
  return (
    <div>
      <label htmlFor={inputId} className={accountLabel}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => {
          setValue(event.target.value);
          if (status.kind === "saved") setStatus({ kind: "idle" });
        }}
        onBlur={handleBlur}
        aria-invalid={isError}
        aria-describedby={isError ? `${statusId} ${errorId}` : statusId}
        className={`min-h-[48px] w-full rounded-[13px] border bg-tl-surface px-3.5 text-[15px] font-semibold text-tl-ink ${
          isError ? "border-tl-danger" : "border-tl-control"
        } ${focusRing}`}
      />
      <div className="mt-1.5 min-h-[20px] text-[13px] font-semibold">
        <p id={statusId} aria-live="polite" className={status.kind === "saved" ? "text-tl-success" : "text-tl-muted"}>
          {status.kind === "saving" ? "Saving…" : status.kind === "saved" ? "Saved" : null}
        </p>
        {isError ? (
          <p id={errorId} role="alert" className="text-tl-danger">
            {status.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The avatar with "Change photo": the image goes to Cloudinary, then its URL
 * is saved on the profile (`useUpdateTeacherAvatar`).
 *
 * @param props - Who is shown.
 * @param props.id - A stable id, for the initials' tone.
 * @param props.name - The teacher's name.
 * @param props.src - The current photo.
 * @returns The photo row.
 */
function PhotoRow({ id, name, src }: { id: string; name: string; src?: string | null }) {
  const updateAvatar = useUpdateTeacherAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const busy = uploading || updateAvatar.isPending;

  /**
   * Uploads the chosen image and saves it as the avatar.
   *
   * @param event - The file input's change.
   * @returns Resolves when the upload and save have finished (failures are toasted).
   */
  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Cloudinary is a third party, so this one call stays on `fetch`. The
      // config module is loaded on use: it reads the environment when imported.
      const { CLOUDINARY_UPLOAD_PRESET, cloudinaryUploadUrl } = await import("@/app/lib/cloudinary");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const response = await fetch(cloudinaryUploadUrl("image"), { method: "POST", body: formData });
      const uploaded: { secure_url?: string } = await response.json();
      if (!uploaded.secure_url) throw new Error("We couldn't upload that image. Please try another file.");
      await updateAvatar.mutateAsync(uploaded.secure_url);
      toast.success("Profile photo updated.");
    } catch (error) {
      logger.error("settings", "avatar upload failed", error);
      toast.error(getErrorMessage(error, "We couldn't upload that image. Please try another file."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar id={id} name={name} src={src} size={64} />
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-extrabold text-tl-ink">{name}</div>
        <div className="mt-0.5 text-[13px] text-tl-muted">Your photo appears on messages, registers and reports.</div>
      </div>
      <button type="button" className={ghostButton} onClick={() => fileInputRef.current?.click()} disabled={busy}>
        {busy ? "Uploading…" : "Change photo"}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" aria-hidden tabIndex={-1} />
    </div>
  );
}

/**
 * A grey block of read-only facts (the design's `accInfo`).
 *
 * @param props - The facts.
 * @param props.items - Label, value and an optional note under the value.
 * @returns The description list.
 */
function InfoGrid({ items }: { items: Array<{ label: string; value: string; note?: string }> }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3 rounded-2xl border border-tl-line-soft bg-tl-subtle p-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">{item.label}</dt>
          <dd className="mt-[5px] break-words text-[15px] font-bold text-tl-ink">{item.value}</dd>
          {item.note ? <dd className="mt-1 text-[13px] text-tl-muted">{item.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/**
 * Settings → Account: the photo, the editable name and phone (saved on
 * blur, §33), the read-only email, role ("· class teacher" from the classes
 * the teacher leads, A6), staff ID, school and join date, and
 * what the old Profile page showed from the teacher record (classes and
 * subjects, qualifications, employment and availability).
 *
 * @returns The panel content.
 */
export function AccountPanel() {
  const { user } = useAuth();
  const { teacherData } = useAppContext();
  const { data, isLoading, error, refetch } = useTeacherSettings();
  const saveField = useSaveProfileField();

  if (isLoading) return <PanelSkeleton label="Loading your account" />;
  if (error) return <PanelError error={error} fallback="We could not load your account." onRetry={() => refetch()} />;

  const profile = data?.profile;
  const employment = data?.employment;
  const firstName = profile?.firstName ?? user?.firstName ?? "";
  const lastName = profile?.lastName ?? user?.lastName ?? "";
  const phone = profile?.phoneNumber ?? user?.phoneNumber ?? "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || profile?.fullName || "Teacher";
  const staffId = employment?.employeeId || employment?.staffNumber || "";
  const sections = profileRecordSections(teacherData, employment?.employmentType);

  return (
    <div className="mt-5 flex flex-col gap-[18px]">
      <PhotoRow id={user?.userId ?? "teacher"} name={displayName} src={profile?.avatar || user?.userAvatar} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-3.5 gap-y-1">
        <ProfileInput field="firstName" label="First name" storedValue={firstName} autoComplete="given-name" onSave={saveField} />
        <ProfileInput field="lastName" label="Last name" storedValue={lastName} autoComplete="family-name" onSave={saveField} />
        <ProfileInput field="phoneNumber" label="Phone" type="tel" storedValue={phone} autoComplete="tel" onSave={saveField} />
      </div>
      <InfoGrid
        items={[
          { label: "Email", value: profile?.email || user?.email || "—", note: "The school office changes your email." },
          { label: "Role", value: `Teacher${isClassTeacher(teacherData, employment?.isFormTeacher) ? " · class teacher" : ""}` },
          { label: "Staff ID", value: staffId || "—" },
          { label: "School", value: profile?.schoolName || user?.schoolName || "—" },
          { label: "Joined", value: formatJoinedDate(profile?.joinedAt) },
        ]}
      />
      {sections.map((section) => (
        <section key={section.heading}>
          <h3 className={groupHeading}>{section.heading}</h3>
          <InfoGrid items={section.items} />
        </section>
      ))}
      <p className="text-[13px] leading-[1.6] text-tl-muted">
        Changes save when you leave a field and appear across the portal. Class and subject assignments are set by your school administrator.
      </p>
    </div>
  );
}
