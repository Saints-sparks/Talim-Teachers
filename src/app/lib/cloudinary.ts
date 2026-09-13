// Cloudinary unsigned-upload configuration, read from the environment so the
// cloud name and preset are never committed. Next.js inlines NEXT_PUBLIC_* at
// build time, so a missing value fails the build here.
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

if (!cloudName || !uploadPreset) {
  throw new Error(
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET must be set. See .env.example."
  );
}

export const CLOUDINARY_CLOUD_NAME: string = cloudName;
export const CLOUDINARY_UPLOAD_PRESET: string = uploadPreset;

/** Upload endpoint for a resource type (`image`, `video`, `raw`, or `auto`). */
export const cloudinaryUploadUrl = (resourceType: "image" | "video" | "raw" | "auto" = "auto") =>
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType === "auto" ? "" : `${resourceType}/`}upload`;
