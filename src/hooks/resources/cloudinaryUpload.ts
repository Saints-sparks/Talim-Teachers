/**
 * Browser-to-Cloudinary uploads with progress and cancellation.
 *
 * Cloudinary is a third party, so this deliberately does not go through the
 * API client (which would attach the Talim bearer token). The cloud name and
 * unsigned preset come from `src/app/lib/cloudinary.ts`, which reads them from
 * the environment. `fetch` cannot report upload progress, so this uses
 * `XMLHttpRequest`.
 */
import { CLOUDINARY_UPLOAD_PRESET, cloudinaryUploadUrl } from "@/app/lib/cloudinary";

/** Largest file the upload forms accept, in bytes (10 MB). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** How long one upload may take before it is abandoned. */
const UPLOAD_TIMEOUT_MS = 120_000;

/** A failed upload, with a message safe to show the teacher. */
export class UploadError extends Error {
  /** True when the teacher cancelled it, so no error toast is warranted. */
  readonly aborted: boolean;

  /**
   * @param message - What went wrong, in the teacher's terms.
   * @param aborted - True when the upload was cancelled rather than failed.
   */
  constructor(message: string, aborted = false) {
    super(message);
    this.name = "UploadError";
    this.aborted = aborted;
  }
}

/** Options for {@link uploadToCloudinary}. */
export interface UploadOptions {
  /** Called with a 0-1 fraction as bytes are sent. */
  onProgress?: (fraction: number) => void;
  /** Aborts the request when signalled. */
  signal?: AbortSignal;
}

/**
 * Checks a file against the size limit before any bytes are sent.
 *
 * @param file - The file the teacher picked.
 * @param maxBytes - The size limit; defaults to {@link MAX_UPLOAD_BYTES}.
 * @returns The reason it was rejected, or `null` when it is acceptable.
 */
export function validateUploadFile(file: File, maxBytes: number = MAX_UPLOAD_BYTES): string | null {
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > maxBytes) return `${file.name} is larger than ${Math.round(maxBytes / (1024 * 1024))} MB.`;
  return null;
}

/**
 * Reads the message out of a Cloudinary error body.
 *
 * @param responseText - The raw response body.
 * @returns Cloudinary's message, or a generic one.
 */
function cloudinaryMessage(responseText: string): string {
  try {
    const body = JSON.parse(responseText) as { error?: { message?: string } };
    if (body.error?.message) return body.error.message;
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return "The file could not be uploaded. Please try again.";
}

/**
 * Uploads a file to Cloudinary.
 *
 * The returned promise always settles: on success it resolves with the hosted
 * URL; on a network error, a timeout, a rejected file or an abort it rejects
 * with an {@link UploadError}. Callers clear their progress state in `finally`,
 * so nothing is left spinning.
 *
 * @param file - The file to upload.
 * @param options - Progress callback and abort signal.
 * @returns The file's `secure_url`.
 * @throws UploadError when the upload fails or is cancelled.
 */
export function uploadToCloudinary(file: File, options: UploadOptions = {}): Promise<string> {
  const { onProgress, signal } = options;

  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadError("Upload cancelled.", true));
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const request = new XMLHttpRequest();
    request.open("POST", cloudinaryUploadUrl("auto"), true);
    request.timeout = UPLOAD_TIMEOUT_MS;

    const onAbort = () => request.abort();
    signal?.addEventListener("abort", onAbort);
    const settle = () => signal?.removeEventListener("abort", onAbort);

    if (onProgress) {
      request.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total) onProgress(Math.min(0.99, event.loaded / event.total));
      };
    }

    request.onload = () => {
      settle();
      if (request.status >= 200 && request.status < 300) {
        try {
          const body = JSON.parse(request.responseText) as { secure_url?: string };
          if (body.secure_url) {
            onProgress?.(1);
            resolve(body.secure_url);
            return;
          }
        } catch {
          // Fall through to the failure below.
        }
        reject(new UploadError("The upload finished but returned no file address."));
        return;
      }
      reject(new UploadError(cloudinaryMessage(request.responseText)));
    };
    request.onerror = () => {
      settle();
      reject(new UploadError("Network error while uploading. Check your connection and try again."));
    };
    request.ontimeout = () => {
      settle();
      reject(new UploadError("The upload took too long. Try a smaller file or a better connection."));
    };
    request.onabort = () => {
      settle();
      reject(new UploadError("Upload cancelled.", true));
    };

    request.send(form);
  });
}
