/**
 * Small pure helpers and record shapes shared by the messages components.
 *
 * The teacher roster (`useAppContext().classes` / `.courses`) is still loosely
 * typed upstream, so the shapes the chat screens actually read are declared
 * here once and the raw records are narrowed at the call site.
 */

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
