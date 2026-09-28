import React from "react";
import { avatarTone, initialsOf } from "@/hooks/attendance/register.logic";

/**
 * A round avatar: the photo when there is one, else the initials on a
 * stable tone (the design's `avStyle`). Decorative; the name is always shown
 * beside it.
 *
 * @param props - The person and the size.
 * @param props.id - Stable id, for the tone.
 * @param props.name - Full name, for the initials.
 * @param props.src - Photo URL, if any.
 * @param props.size - Diameter in px (40 on registers, 38 on the roster, 70 on the record).
 * @returns The avatar.
 */
export function Avatar({ id, name, src, size = 40 }: { id: string; name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size / 3.1) };
  if (src) {
    return <img src={src} alt="" aria-hidden style={style} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span aria-hidden style={style} className={`${avatarTone(id)} flex shrink-0 items-center justify-center rounded-full bg-tone-bg font-extrabold text-tone-fg`}>
      {initialsOf(name)}
    </span>
  );
}
