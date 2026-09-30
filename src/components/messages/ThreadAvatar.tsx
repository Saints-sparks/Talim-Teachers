import React from "react";
import { initialsFor } from "@/hooks/messages/messages.logic";

/** Props for {@link ThreadAvatar}. */
export interface ThreadAvatarProps {
  name: string;
  /** A group conversation: the design's square green avatar. People are round and blue. */
  group?: boolean;
  /** A photo or group picture, when there is one. */
  src?: string | null;
  /** Width and height in px (42 in the list, 40 in the header and the info modal). */
  size?: number;
  /** Shows the green presence dot (people only). */
  online?: boolean;
  /** Shape override for files and links in the info modal. */
  square?: boolean;
}

/**
 * A conversation's avatar (the design's `tAv`): initials on a tint, or the
 * picture. Decorative; the name is always next to it.
 *
 * @param props - See {@link ThreadAvatarProps}.
 * @returns The avatar.
 */
export function ThreadAvatar({ name, group = false, src, size = 42, online = false, square }: ThreadAvatarProps) {
  const radius = (square ?? group) ? "rounded-[13px]" : "rounded-full";
  const tone = group ? "bg-tl-success-bg text-tl-success" : "bg-tl-select text-tl-brand";
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size / 3.3)) };
  return (
    <span aria-hidden className="relative inline-flex shrink-0">
      {src ? (
        <img src={src} alt="" style={style} className={`${radius} object-cover`} />
      ) : (
        <span style={style} className={`${radius} ${tone} flex items-center justify-center font-extrabold`}>
          {initialsFor(name)}
        </span>
      )}
      {online && !group ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-tl-surface bg-tl-success" />
      ) : null}
    </span>
  );
}
