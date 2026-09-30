import React from "react";

/**
 * Grey blocks in the shape of the curriculum page (heading, the card) while
 * a course's curriculum loads, so the page does not jump when it arrives.
 *
 * @returns The skeleton element.
 */
const CurriculumSkeleton = () => (
  <div role="status" aria-label="Loading curriculum" className="flex flex-col gap-[18px]">
    <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-tl-line/70" />
    <div className="h-5 w-[28rem] max-w-full animate-pulse rounded bg-tl-line/70" />
    <div className="h-[260px] animate-pulse rounded-[22px] bg-tl-line/70" />
  </div>
);

export default CurriculumSkeleton;
