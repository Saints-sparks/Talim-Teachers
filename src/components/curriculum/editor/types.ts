/** A course the teacher can file a curriculum under, as the teacher record lists it. */
export interface CourseOption {
  _id: string;
  title?: string;
  name?: string;
  courseCode?: string;
  code?: string;
  description?: string;
}

/** The term a new curriculum is filed under. */
export interface TermOption {
  _id: string;
  name?: string;
}

/** Sizing of a config card: `sm` on phones and tablets, `md` in the desktop sidebar. */
export type CardSize = "sm" | "md";

/**
 * The name a course is listed under.
 *
 * @param course - A course option.
 * @returns Its title or name, then its code in the form the selects use.
 */
export function courseLabel(course: CourseOption): string {
  const name = course.title || course.name || "Untitled course";
  const code = course.courseCode || course.code;
  return code ? `${name} (${code})` : name;
}

/**
 * The file name at the end of an attachment URL.
 *
 * @param url - A hosted file URL.
 * @param fallback - Used when the URL has no file name.
 * @returns The decoded file name, or the fallback.
 */
export function fileNameOf(url: string, fallback = "Attachment"): string {
  const last = url.split("?")[0].split("/").pop() ?? "";
  if (!last) return fallback;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}
