/**
 * Small pure helpers and record shapes shared by the messages components.
 *
 * The teacher roster (`useAppContext().classes` / `.courses`) is still loosely
 * typed upstream, so the shapes the chat screens actually read are declared
 * here once and the raw records are narrowed at the call site.
 */

/** What the reply bar shows: who wrote the message and what it said. */
export interface ReplyTarget {
  sender: string;
  text: string;
}

/** A class from the teacher roster, as far as the chat screens read it. */
export interface ClassRecord {
  _id?: string;
  id?: string;
  name?: string;
  students?: unknown[];
  studentCount?: number;
}

/** A course from the teacher roster, as far as the chat screens read it. */
export interface CourseRecord {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  courseCode?: string;
  description?: string;
  classId?: unknown;
}

/** The room a group-create request resolved to. */
export interface CreatedGroup {
  roomId: string;
  /** Set only when the server said whether it reused an existing group. */
  reused?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Reads the id out of a value that is either an id string or a populated
 * record carrying `_id` / `id`.
 *
 * @param value - A string id, a populated record, or anything else.
 * @returns The id, or "" when there is none.
 */
export const idOf = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";
  return idOf(value._id ?? value.id);
};

/**
 * Pulls a user-facing message out of a thrown value.
 *
 * @param error - Whatever was thrown.
 * @returns The `message` when there is a non-empty string one, otherwise undefined.
 */
export const errorMessage = (error: unknown): string | undefined => {
  if (isRecord(error) && typeof error.message === "string" && error.message) return error.message;
  return undefined;
};

/**
 * The display name of a course: its title, falling back to its name.
 *
 * @param course - The course record.
 * @returns The title or name, or undefined when it has neither.
 */
export const courseName = (course: CourseRecord): string | undefined => course.title || course.name;

/**
 * Filters classes by a case-insensitive name search.
 *
 * @param classes - The teacher's classes (may be missing while loading).
 * @param term - The search text, used as typed.
 * @returns The matching classes; every class for an empty term.
 */
export const filterClasses = (classes: ClassRecord[] | null | undefined, term: string): ClassRecord[] =>
  classes?.filter((cls) => cls.name?.toLowerCase().includes(term.toLowerCase())) || [];

/**
 * Filters courses by a case-insensitive title/name search.
 *
 * @param courses - The teacher's courses (may be missing while loading).
 * @param term - The search text, used as typed.
 * @returns The matching courses; every course for an empty term.
 */
export const filterCourses = (courses: CourseRecord[] | null | undefined, term: string): CourseRecord[] =>
  courses?.filter((course) => courseName(course)?.toLowerCase().includes(term.toLowerCase())) || [];

/**
 * Picks an emoji for a course from keywords in its name.
 *
 * @param name - The course name.
 * @returns An emoji; a book when nothing matches.
 */
export const getCourseIcon = (name: string | undefined): string => {
  const lower = name?.toLowerCase() || "";
  if (lower.includes("math")) return "📊";
  if (lower.includes("english") || lower.includes("eng")) return "📚";
  if (lower.includes("physics")) return "⚛️";
  if (lower.includes("chemistry")) return "🧪";
  if (lower.includes("biology")) return "🧬";
  if (lower.includes("history")) return "📜";
  if (lower.includes("geography")) return "🌍";
  if (lower.includes("civic")) return "🏛️";
  if (lower.includes("computer")) return "💻";
  if (lower.includes("science")) return "🔬";
  if (lower.includes("art")) return "🎨";
  if (lower.includes("music")) return "🎵";
  if (lower.includes("physical")) return "⚽";
  if (lower.includes("lang")) return "🗣️";
  return "📖"; // default book icon
};

/**
 * Reads the room out of a create-group response. Servers answer either with the
 * room itself or wrapped as `{ data: room }`, so both are accepted.
 *
 * @param body - The response body.
 * @returns The room id ("" when the body carries none) and, when present, the server's `reused` flag.
 */
export const parseCreatedGroup = (body: unknown): CreatedGroup => {
  const inner = isRecord(body) && isRecord(body.data) ? body.data : body;
  if (!isRecord(inner)) return { roomId: "" };
  const roomId = String(inner._id || inner.roomId || inner.id || "");
  return typeof inner.reused === "boolean" ? { roomId, reused: inner.reused } : { roomId };
};
