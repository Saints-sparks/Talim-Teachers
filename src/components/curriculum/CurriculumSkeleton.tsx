import React from "react";

/**
 * A grid of placeholder cards shown while a course's curriculum loads, so the
 * page does not jump when the card arrives.
 *
 * @returns The skeleton element.
 */
const CurriculumSkeleton = () => (
  <div role="status" aria-label="Loading curriculum" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="mt-4 flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    ))}
  </div>
);

export default CurriculumSkeleton;
