"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/CustomToast";
import { logger } from "@/lib/logger";
import { UploadError, uploadToCloudinary, validateUploadFile } from "@/hooks/resources/cloudinaryUpload";

/** What {@link useAttachmentUploads} gives the editor. */
export interface AttachmentUploads {
  /** Hosted URLs of the files attached so far. */
  attachments: string[];
  /** Replaces the list (used when an existing curriculum loads). */
  setAttachments: (urls: string[]) => void;
  /** True while files are being uploaded. */
  uploading: boolean;
  /** Overall progress of the current batch, 0-1. */
  progress: number;
  /** Uploads the picked files and appends the ones that succeed. */
  upload: (files: File[]) => Promise<void>;
  /** Drops one attachment from the list. */
  remove: (url: string) => void;
}

/**
 * Uploads a curriculum's attachments to Cloudinary, one after another, with
 * overall progress. A file that is too large or fails is reported and skipped;
 * the rest still upload. `uploading` is always cleared when the batch ends —
 * on success, on failure and when the editor unmounts mid-upload.
 *
 * @param initial - Attachments the curriculum already has (when editing).
 * @returns The attachment list and the actions that change it.
 */
export function useAttachmentUploads(initial: string[] = []): AttachmentUploads {
  const [attachments, setAttachments] = useState<string[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const upload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const accepted: File[] = [];
    for (const file of files) {
      const problem = validateUploadFile(file);
      if (problem) toast.error(problem);
      else accepted.push(file);
    }
    if (accepted.length === 0) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    setUploading(true);
    setProgress(0);

    const uploaded: string[] = [];
    try {
      for (const [index, file] of accepted.entries()) {
        try {
          const url = await uploadToCloudinary(file, {
            signal: controller.signal,
            onProgress: (fraction) => setProgress((index + fraction) / accepted.length),
          });
          uploaded.push(url);
        } catch (error) {
          if (error instanceof UploadError && error.aborted) return;
          logger.error("curriculum/attachments", `upload of ${file.name} failed`, error);
          toast.error(error instanceof UploadError ? `${file.name}: ${error.message}` : `Failed to upload ${file.name}`);
        }
      }
    } finally {
      if (uploaded.length > 0) {
        setAttachments((current) => [...current, ...uploaded]);
        toast.success(`${uploaded.length} file(s) uploaded successfully`);
      }
      setUploading(false);
      setProgress(0);
      controllerRef.current = null;
    }
  }, []);

  const remove = useCallback((url: string) => {
    setAttachments((current) => current.filter((item) => item !== url));
    toast.success("Attachment removed");
  }, []);

  return { attachments, setAttachments, uploading, progress, upload, remove };
}
