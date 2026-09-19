"use client";

import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { courseName, filterCourses, getCourseIcon, type CourseRecord } from "./helpers";

interface CreateGroupCourseListProps {
  courses: CourseRecord[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isLoading: boolean;
  isCreating: boolean;
  onBack: () => void;
  onSelect: (course: CourseRecord) => void;
}

/** Second step (by course): a searchable list of the teacher's courses. */
export default function CreateGroupCourseList({
  courses,
  searchTerm,
  onSearchChange,
  isLoading,
  isCreating,
  onBack,
  onSelect,
}: CreateGroupCourseListProps) {
  const filteredCourses = filterCourses(courses, searchTerm);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="text-lg font-semibold text-[#030E18]">
            Select Course
          </h3>
          <p className="text-sm text-[#7B7B7B]">
            Choose a course to create group
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#898989] w-4 h-4" />
        <Input
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 border-[#F0F0F0] focus:border-[#003366]"
        />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#003366]" />
            <span className="ml-2 text-[#7B7B7B]">Loading courses...</span>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#7B7B7B]">
              {searchTerm
                ? "No courses found matching your search"
                : "No courses available"}
            </p>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <Button
              key={course.id || course._id}
              variant="outline"
              className="w-full h-14 justify-start border-[#F0F0F0] hover:bg-[#003366]/5 hover:border-[#003366]"
              onClick={() => onSelect(course)}
              disabled={isCreating}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 bg-[#003366]/10 rounded-lg flex items-center justify-center text-sm">
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#003366]" />
                  ) : (
                    getCourseIcon(courseName(course))
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-[#030E18]">
                    {courseName(course)}
                  </p>
                  <p className="text-sm text-[#7B7B7B]">
                    {course.courseCode && (
                      <span className="font-mono">{course.courseCode}</span>
                    )}
                    {course.description && (
                      <span className="ml-1">• {course.description}</span>
                    )}
                  </p>
                </div>
                {isCreating && (
                  <div className="text-xs text-[#003366]">Creating...</div>
                )}
              </div>
            </Button>
          ))
        )}
      </div>
    </div>
  );
}
