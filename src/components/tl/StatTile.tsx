import React, { type ReactNode } from "react";

/**
 * A white stat tile: small uppercase label over a large value (the design's
 * `stats` tiles on Attendance and Students).
 *
 * @param props - Label, value and optional tone and tip.
 * @param props.label - The uppercase label.
 * @param props.value - The number or text.
 * @param props.valueClass - Colour and size classes for the value.
 * @param props.tip - Shown on hover.
 * @param props.subtle - The tinted variant used inside cards on the student record.
 * @returns The tile.
 */
export function StatTile({ label, value, valueClass = "text-2xl text-tl-ink", tip, subtle = false }: { label: string; value: ReactNode; valueClass?: string; tip?: string; subtle?: boolean }) {
  return (
    <div title={tip} className={`${subtle ? "rounded-2xl border border-tl-line-soft bg-tl-subtle" : "rounded-[18px] border border-tl-line bg-tl-surface"} px-4 py-3.5`}>
      <div className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">{label}</div>
      <div className={`mt-1.5 font-extrabold tracking-[-0.3px] ${valueClass}`}>{value}</div>
    </div>
  );
}
