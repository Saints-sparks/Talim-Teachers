/**
 * Profile-photo upload shared by the profile and onboarding pages: the image
 * goes to Cloudinary (a third-party origin, so a plain `fetch` with no
 * credentials), then the resulting URL is saved on the teacher's profile
 * through our API client.
 *
 * The two pages each hand-built this, including an `Authorization` header from
 * a token read once, so an expired token failed the save instead of refreshing.
 */
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { CLOUDINARY_UPLOAD_PRESET, cloudinaryUploadUrl } from "./cloudinary";

/** The part of Cloudinary's upload response this reads. */
interface CloudinaryUploadResponse {
  secure_url?: string;
  error?: { message?: string };
}

/**
 * Uploads a photo and makes it the signed-in teacher's avatar.
 *
 * @param file - The image the teacher chose.
 * @returns The hosted image URL that is now saved on the profile.
 * @throws `ApiError` when the network is unreachable or our API refuses the
 *   save; a plain `Error` (with Cloudinary's message) when Cloudinary rejects
 *   the image.
 */
export async function uploadProfileAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  let uploaded: CloudinaryUploadResponse;
  try {
    const response = await fetch(cloudinaryUploadUrl("image"), { method: "POST", body: formData });
    uploaded = (await response.json()) as CloudinaryUploadResponse;
  } catch {
    throw ApiError.unreachable();
  }
  if (!uploaded.secure_url) {
    throw new Error(uploaded.error?.message ?? "The image could not be uploaded. Try a smaller image.");
  }

  await api.put("/auth/profile/avatar", { avatarUrl: uploaded.secure_url });
  return uploaded.secure_url;
}
