/** Who sees group controls. The server has the final say; a 403 shows its message. */

const MANAGER_ROLES = new Set(["teacher", "school_admin", "school_sub_admin", "admin"]);
const LEAVABLE_TYPES = new Set(["custom_group", "parent_group"]);

export function canManageGroup(
  room: { type?: string; createdBy?: string } | null | undefined,
  me: { id: string | null; role?: string | null },
): boolean {
  if (!room || !room.type || room.type === "one_to_one") return false;
  if (me.role && MANAGER_ROLES.has(me.role)) return true;
  return Boolean(me.id && room.createdBy && room.createdBy === me.id);
}

/** Class, course and admin–parent groups follow enrolment, so nobody leaves them. */
export function canLeaveGroup(room: { type?: string } | null | undefined): boolean {
  return Boolean(room?.type && LEAVABLE_TYPES.has(room.type));
}

export const GROUP_NAME_MAX = 80;
export const GROUP_DESCRIPTION_MAX = 500;

export const roleLabel = (role?: string) =>
  role
    ? role
        .split("_")
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ")
    : "Member";
