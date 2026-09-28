"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/CustomToast";
import { useCurrentTerm } from "@/hooks/academic/useCurrentTerm";
import { getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { UploadError, uploadToCloudinary, validateUploadFile } from "./cloudinaryUpload";
import { classOptions, recordId, type ClassOption, type CourseLike } from "./display";
import type { CreateResourcePayload } from "./types";
import { useCreateResource } from "./useResources";
import { useTeacherRoster } from "./useTeacherRoster";

/** How long the success message stays before the modal closes. */
const SUCCESS_CLOSE_MS = 2000;

/** Where the upload is in its life. */
export type UploadPhase = "idle" | "uploading" | "saving" | "done";

/** Inputs of {@link useResourceUpload}. */
export interface ResourceUploadInput {
  /** Whether the modal is open; closing resets the form and cancels any upload. */
  isOpen: boolean;
  /** Closes the modal. */
  onClose: () => void;
  /** Preselects this course (and its class) when the modal opens, e.g. from a lesson. */
  initialCourseId?: string;
  /** Prefills the scheme-of-work week (1..30), e.g. from a lesson's topic or an attention item. */
  initialWeek?: number;
}

/** What {@link useResourceUpload} hands the modal. */
export interface ResourceUpload {
  name: string;
  setName: (name: string) => void;
  classId: string;
  setClassId: (classId: string) => void;
  courseId: string;
  /** Scheme-of-work week the resource is filed under (sent as `week`); undefined for none. */
  week: number | undefined;
  setWeek: (week: number | undefined) => void;
  /** Picks a course and, when the course has one, its class. */
  selectCourse: (courseId: string) => void;
  file: File | null;
  pickFile: (file: File | null) => void;
  courses: CourseLike[];
  classes: ClassOption[];
  rosterLoading: boolean;
  termName: string | undefined;
  termLoading: boolean;
  termFailed: boolean;
  phase: UploadPhase;
  /** File upload progress, 0-1. */
  progress: number;
  canSubmit: boolean;
  submit: () => Promise<void>;
  /** Aborts an upload in flight and closes the modal. */
  cancel: () => void;
}

/**
 * The resource upload form: which class and course, the file, and the two-step
 * upload (file to Cloudinary, then the resource to the API).
 *
 * Every field `CreateResourceDto` requires is required here: a class, a course,
 * the current term and the file. If the file uploads but the API then rejects
 * the resource, the hosted URL is kept so a retry does not upload it again.
 * Whatever happens, `phase` returns to `idle` (or `done`) — nothing is left
 * spinning — and closing the modal aborts an upload in flight.
 *
 * @param input - See {@link ResourceUploadInput}.
 * @returns See {@link ResourceUpload}.
 */
export function useResourceUpload({ isOpen, onClose, initialCourseId, initialWeek }: ResourceUploadInput): ResourceUpload {
  const roster = useTeacherRoster();
  const term = useCurrentTerm();
  const createMutation = useCreateResource();

  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [week, setWeek] = useState<number | undefined>(undefined);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);

  const controllerRef = useRef<AbortController | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadedRef = useRef<{ file: File; url: string } | null>(null);

  const selectedCourse = roster.courses.find((course) => recordId(course) === courseId) ?? null;
  const classes = useMemo(() => classOptions([roster.classes], selectedCourse), [roster.classes, selectedCourse]);

  // Closing (or unmounting) resets the form, stops the timer and aborts a running upload.
  useEffect(() => {
    if (isOpen) return;
    controllerRef.current?.abort();
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    uploadedRef.current = null;
    setName("");
    setClassId("");
    setCourseId("");
    setWeek(undefined);
    setFile(null);
    setPhase("idle");
    setProgress(0);
  }, [isOpen]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  const selectCourse = useCallback(
    (id: string) => {
      setCourseId(id);
      const course = roster.courses.find((item) => recordId(item) === id);
      const courseClassId = recordId(course?.classId);
      if (courseClassId) setClassId(courseClassId);
    },
    [roster.courses],
  );

  // Opening from a lesson or an attention item prefills the scheme-of-work week.
  useEffect(() => {
    if (isOpen && initialWeek && initialWeek >= 1 && initialWeek <= 30) setWeek(initialWeek);
  }, [isOpen, initialWeek]);

  // Opening with a course (from a lesson or Today) preselects it once the roster is in.
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      prefilledRef.current = false;
      return;
    }
    if (prefilledRef.current || !initialCourseId) return;
    if (!roster.courses.some((course) => recordId(course) === initialCourseId)) return;
    prefilledRef.current = true;
    selectCourse(initialCourseId);
  }, [isOpen, initialCourseId, roster.courses, selectCourse]);

  const pickFile = useCallback((next: File | null) => {
    if (!next) return;
    const problem = validateUploadFile(next);
    if (problem) {
      toast.error(problem);
      return;
    }
    setFile(next);
  }, []);

  const termId = term.data?._id ?? "";
  const canSubmit = phase === "idle" && Boolean(name.trim() && classId && courseId && file && termId);

  const submit = async () => {
    if (!file) return void toast.error("Choose a file to upload.");
    if (!name.trim() || !courseId || !classId) {
      return void toast.error("Please add a resource name and select a course and a class.");
    }
    if (!termId) return void toast.error("The current term could not be loaded. Please try again shortly.");

    const controller = new AbortController();
    controllerRef.current = controller;
    setProgress(0);

    try {
      let url = uploadedRef.current?.file === file ? uploadedRef.current.url : "";
      if (!url) {
        setPhase("uploading");
        url = await uploadToCloudinary(file, { signal: controller.signal, onProgress: setProgress });
        uploadedRef.current = { file, url };
      }

      setPhase("saving");
      const payload: CreateResourcePayload = {
        name: name.trim(),
        classId,
        courseId,
        termId,
        uploadDate: new Date().toISOString(),
        image: url,
        files: [url],
        ...(week ? { week } : {}),
      };
      await createMutation.mutateAsync(payload);

      setPhase("done");
      closeTimerRef.current = setTimeout(onClose, SUCCESS_CLOSE_MS);
    } catch (error) {
      setPhase("idle");
      if (error instanceof UploadError && error.aborted) return;
      logger.error("resources", "upload failed", error);
      toast.error(getErrorMessage(error, "Upload failed. Please try again."));
    } finally {
      controllerRef.current = null;
    }
  };

  return {
    name,
    setName,
    classId,
    setClassId,
    courseId,
    week,
    setWeek,
    selectCourse,
    file,
    pickFile,
    courses: roster.courses,
    classes,
    rosterLoading: roster.isLoading,
    termName: term.data?.name,
    termLoading: term.isLoading,
    termFailed: term.isError,
    phase,
    progress,
    canSubmit,
    submit,
    cancel: () => {
      controllerRef.current?.abort();
      onClose();
    },
  };
}
