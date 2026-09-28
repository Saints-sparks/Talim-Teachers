/**
 * Pure logic for the Subjects page's upload sheet: the size cap, what must
 * be filled in before Upload is enabled, the MIME type and the `POST
 * /resources` body (§24). No React, and no Cloudinary import, so it runs in
 * any test.
 */
import { getErrorMessage } from "@/lib/apiError";
import { kindFromFile } from "@/hooks/subjects/scheme.logic";
import type { CreateCourseResourceBody, ResourceVisibility } from "@/types/subjects";

/** The cap when `NEXT_PUBLIC_MAX_UPLOAD_MB` is unset or unusable. */
export const DEFAULT_MAX_UPLOAD_MB = 50;

/** The file types the picker suggests (the design: "PDF, Word, slides, images or video"). */
export const UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.odt,.rtf,.txt,.ppt,.pptx,.odp,.key,.xls,.xlsx,.csv,image/*,video/*,application/pdf";

/**
 * The upload cap in megabytes, from `NEXT_PUBLIC_MAX_UPLOAD_MB`.
 *
 * @param raw - The setting; read from the environment when omitted.
 * @returns A positive number of megabytes; {@link DEFAULT_MAX_UPLOAD_MB} for an empty, zero, negative or non-numeric value.
 */
export function maxUploadMb(raw: string | undefined = process.env.NEXT_PUBLIC_MAX_UPLOAD_MB): number {
  const value = Number((raw ?? "").trim());
  return (raw ?? "").trim() !== "" && Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_UPLOAD_MB;
}

/**
 * The upload cap in bytes.
 *
 * @param raw - The `NEXT_PUBLIC_MAX_UPLOAD_MB` value; read from the environment when omitted.
 * @returns The cap.
 */
export function maxUploadBytes(raw: string | undefined = process.env.NEXT_PUBLIC_MAX_UPLOAD_MB): number {
  return Math.round(maxUploadMb(raw) * 1024 * 1024);
}

/**
 * "50" for the sheet's description and error messages.
 *
 * @param maxBytes - The cap in bytes.
 * @returns Whole megabytes (one decimal below 10).
 */
export function megabytes(maxBytes: number): string {
  const mb = maxBytes / (1024 * 1024);
  return String(mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10);
}

/** What the upload sheet has so far. */
export interface UploadDraft {
  name: string;
  file: File | null;
  courseId: string;
  classId: string;
  /** From the chosen course's scheme (`term.id`). */
  termId: string;
  /** The scheme-of-work week, 1..30. */
  week: number | undefined;
}

/**
 * The first thing stopping an upload, in the teacher's words.
 *
 * @param draft - The sheet's values.
 * @param maxBytes - The size cap.
 * @returns The problem, or null when Upload may go ahead.
 */
export function validateUpload(draft: UploadDraft, maxBytes: number = maxUploadBytes()): string | null {
  if (!draft.name.trim()) return "Give the resource a name.";
  if (!draft.file) return "Choose a file to upload.";
  if (draft.file.size === 0) return `${draft.file.name} is empty.`;
  if (draft.file.size > maxBytes) return `${draft.file.name} is larger than ${megabytes(maxBytes)} MB.`;
  if (!draft.courseId || !draft.classId) return "Choose the subject and class.";
  if (!draft.termId) return "The term is still loading. Try again in a moment.";
  if (draft.week !== undefined && !(Number.isInteger(draft.week) && draft.week >= 1 && draft.week <= 30)) return "Choose a week.";
  return null;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
  txt: "text/plain",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odp: "application/vnd.oasis.opendocument.presentation",
  key: "application/vnd.apple.keynote",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mp3: "audio/mpeg",
};

/**
 * A file's MIME type: what the browser says, else guessed from the extension.
 *
 * @param file - The file (only `name` and `type` are read).
 * @returns The type; `application/octet-stream` when unknown.
 */
export function mimeTypeOf(file: Pick<File, "name" | "type">): string {
  if (file.type) return file.type;
  const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

/** Inputs of {@link buildResourcePayload}. */
export interface ResourcePayloadInput {
  name: string;
  courseId: string;
  classId: string;
  termId: string;
  week: number | undefined;
  visibility: ResourceVisibility;
  file: Pick<File, "name" | "type" | "size">;
  /** The hosted file (Cloudinary `secure_url`). */
  url: string;
  /** When it was uploaded; now by default. */
  uploadDate?: string;
}

/**
 * The `POST /resources` body (§24): the existing fields plus `visibility`,
 * `kind`, `mimeType`, `sizeBytes` and the week. `image` is sent too, the same
 * URL as `files[0]`.
 *
 * @param input - See {@link ResourcePayloadInput}.
 * @returns The body.
 */
export function buildResourcePayload(input: ResourcePayloadInput): CreateCourseResourceBody {
  const mimeType = mimeTypeOf(input.file);
  return {
    name: input.name.trim(),
    classId: input.classId,
    courseId: input.courseId,
    termId: input.termId,
    uploadDate: input.uploadDate ?? new Date().toISOString(),
    image: input.url,
    files: [input.url],
    ...(input.week ? { week: input.week } : {}),
    visibility: input.visibility,
    kind: kindFromFile(mimeType, input.file.name),
    mimeType,
    sizeBytes: input.file.size,
  };
}

/** Where an upload is. */
export type UploadPhase = "idle" | "uploading" | "saving" | "done";

/**
 * The live status line while uploading.
 *
 * @param phase - The phase.
 * @param fraction - Upload progress, 0-1.
 * @returns "Uploading… 42%", "Saving…" or an empty string.
 */
export function uploadStatusText(phase: UploadPhase, fraction: number): string {
  if (phase === "uploading") return `Uploading… ${Math.max(0, Math.min(100, Math.round(fraction * 100)))}%`;
  if (phase === "saving") return "Saving…";
  return "";
}

/**
 * Whether an error is a cancelled upload (Cancel or closing the sheet), which
 * needs no message. Duck-typed so this module does not import the Cloudinary
 * helper (which reads the Cloudinary settings when loaded).
 *
 * @param error - Whatever was thrown.
 * @returns True for an aborted `UploadError`.
 */
export function isUploadAborted(error: unknown): boolean {
  return error instanceof Error && error.name === "UploadError" && (error as Error & { aborted?: boolean }).aborted === true;
}

/**
 * The message shown in the sheet when an upload or the save fails. Upload
 * errors are already worded for the teacher; API errors carry the server's
 * message.
 *
 * @param error - Whatever was thrown.
 * @returns The message.
 */
export function uploadErrorMessage(error: unknown): string {
  return getErrorMessage(error, "The resource was not saved. Please try again.");
}
