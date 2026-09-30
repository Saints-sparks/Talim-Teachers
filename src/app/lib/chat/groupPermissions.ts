/**
 * Who sees group controls. The server has the final say; a 403 shows its
 * message and the control stays as it was.
 */
import type { RoomAdmin } from "@/types/inboxSettings";

/** The room fields the permission checks read. */
export interface GroupPermissionRoom {
  type?: string;
  createdBy?: string;
  /** The group's admins (Round 4 addendum); missing on an older server. */
  admins?: RoomAdmin[];
}

const LEAVABLE_TYPES = new Set(["custom_group", "parent_group"]);
/** Rooms that are not groups a member can run: a private chat, and the school-run office inbox (§28). */
const UNMANAGED_TYPES = new Set(["one_to_one", "office"]);

/**
 * Whether a room is a group with a name and description of its own (not a
 * one-to-one chat or the office inbox, which show no description editor).
 *
 * @param room - The room.
 * @returns True for class, course and other groups.
 */
export function hasGroupDetails(room: { type?: string } | null | undefined): boolean {
  return Boolean(room?.type && !UNMANAGED_TYPES.has(room.type));
}

/**
 * Whether I am one of the group's admins: listed in the room view's
 * `admins`, or, on a server that doesn't send `admins` yet, the group's
 * creator. Never in a one-to-one chat or the office inbox.
 *
 * @param room - The room.
 * @param me - The signed-in user (`role` is accepted for older call sites and ignored).
 * @param me.id - Their user id.
 * @param me.role - Unused; the admins list decides.
 * @returns True for a group admin.
 */
export function isGroupAdmin(room: GroupPermissionRoom | null | undefined, me: { id: string | null; role?: string | null }): boolean {
  if (!room || !hasGroupDetails(room) || !me.id) return false;
  if (Array.isArray(room.admins)) return room.admins.some((admin) => admin.id === me.id);
  return Boolean(room.createdBy && room.createdBy === me.id);
}

/**
 * Who may rename the group, change its description and picture, and add or
 * remove members: the group admins, and nobody else.
 *
 * @param room - The room.
 * @param me - The signed-in user.
 * @param me.id - Their user id.
 * @param me.role - Unused; the admins list decides.
 * @returns True when the controls are shown.
 */
export function canManageGroup(room: GroupPermissionRoom | null | undefined, me: { id: string | null; role?: string | null }): boolean {
  return isGroupAdmin(room, me);
}

/**
 * Class, course and admin–parent groups follow enrolment, so nobody leaves them.
 *
 * @param room - The room.
 * @returns True for groups a member may leave.
 */
export function canLeaveGroup(room: { type?: string } | null | undefined): boolean {
  return Boolean(room?.type && LEAVABLE_TYPES.has(room.type));
}

/** Longest group name the server accepts. */
export const GROUP_NAME_MAX = 80;
/** Longest group description (the inline editor shows a counter). */
export const GROUP_DESCRIPTION_MAX = 500;

/**
 * A role for display: "school_admin" → "School Admin".
 *
 * @param role - The stored role.
 * @returns The label; "Member" when unknown.
 */
export const roleLabel = (role?: string) =>
  role
    ? role
        .split("_")
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ")
    : "Member";
