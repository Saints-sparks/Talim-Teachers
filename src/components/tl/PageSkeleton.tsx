import React from "react";
import { pagePad } from "./styles";

/** Props for {@link PageSkeleton}. */
export interface PageSkeletonProps {
  /** What is loading, for screen readers ("Loading attendance"). */
  label: string;
  /** Chips or tabs under the heading (Grading's subjects, Students' classes). */
  chips?: number;
  /** Stat tiles in a row (Attendance, Students). */
  tiles?: number;
  /** Heights in px of the cards below, in order. */
  blocks?: readonly number[];
}

const BLOCK = "animate-pulse bg-tl-line/70";

/**
 * Grey blocks in the shape of a redesigned page (heading, line, optional
 * chips and tiles, then cards) while its route loads. Used by the route-level
 * `loading.tsx` files inside the shell, so the sidebar and top bar stay put.
 *
 * @param props - See {@link PageSkeletonProps}.
 * @param props.label - What is loading.
 * @param props.chips - How many chips.
 * @param props.tiles - How many tiles.
 * @param props.blocks - Card heights.
 * @returns The skeleton.
 */
export function PageSkeleton({ label, chips = 0, tiles = 0, blocks = [420] }: PageSkeletonProps) {
  return (
    <div className={`${pagePad} flex flex-col gap-[18px]`} role="status" aria-label={label} aria-busy="true">
      <span className="sr-only">{label}…</span>
      <div aria-hidden className="flex flex-col gap-2.5">
        <div className={`${BLOCK} h-9 w-64 max-w-full rounded-lg`} />
        <div className={`${BLOCK} h-5 w-[26rem] max-w-full rounded`} />
      </div>
      {chips > 0 ? (
        <div aria-hidden className="flex flex-wrap gap-2">
          {Array.from({ length: chips }).map((_, i) => (
            <div key={i} className={`${BLOCK} h-11 w-32 rounded-xl`} />
          ))}
        </div>
      ) : null}
      {tiles > 0 ? (
        <div aria-hidden className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
          {Array.from({ length: tiles }).map((_, i) => (
            <div key={i} className={`${BLOCK} h-[84px] rounded-[18px]`} />
          ))}
        </div>
      ) : null}
      {blocks.map((height, i) => (
        <div key={i} aria-hidden className={`${BLOCK} rounded-[22px]`} style={{ height }} />
      ))}
    </div>
  );
}
