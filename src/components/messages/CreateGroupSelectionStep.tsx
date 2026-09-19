"use client";

import { GraduationCap, BookOpen, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CurrentTerm } from "@/app/services/api.service";

interface CreateGroupSelectionStepProps {
  currentTerm: CurrentTerm | null;
  isLoadingTerm: boolean;
  /** True while the teacher's classes and courses are loading. */
  isLoading: boolean;
  classCount: number;
  courseCount: number;
  onPickClass: () => void;
  onPickCourse: () => void;
}

/** The academic year's name when the term carries it populated. */
const academicYearName = (term: CurrentTerm): string | undefined => {
  const year = term.academicYear;
  if (typeof year === "object" && year !== null && "name" in year) {
    const name = (year as { name?: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
};

/** First step of the create-group modal: choose to group by class or by course. */
export default function CreateGroupSelectionStep({
  currentTerm,
  isLoadingTerm,
  isLoading,
  classCount,
  courseCount,
  onPickClass,
  onPickCourse,
}: CreateGroupSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#003366]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-[#003366]" />
        </div>
        <h3 className="text-lg font-semibold text-[#030E18] mb-2">
          Create New Group
        </h3>
        <p className="text-[#7B7B7B] text-sm">
          Choose how you want to create your group
        </p>
        {isLoadingTerm ? (
          <div className="flex items-center justify-center gap-2 mt-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs text-[#7B7B7B]">Loading term info...</span>
          </div>
        ) : (
          currentTerm && (
            <div className="mt-2 text-xs text-[#003366] bg-[#003366]/5 px-3 py-1 rounded-full inline-block">
              {currentTerm.name} - {academicYearName(currentTerm)}
            </div>
          )
        )}
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-16 border-[#F0F0F0] hover:bg-[#003366]/5 hover:border-[#003366] transition-colors"
          onClick={onPickClass}
          disabled={isLoading}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#003366]/10 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[#003366]" />
            </div>
            <div className="text-left">
              <p className="font-medium text-[#030E18]">Create by Class</p>
              <p className="text-sm text-[#7B7B7B]">
                Group all students in a class ({classCount} available)
              </p>
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full h-16 border-[#F0F0F0] hover:bg-[#003366]/5 hover:border-[#003366] transition-colors"
          onClick={onPickCourse}
          disabled={isLoading}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#003366]/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#003366]" />
            </div>
            <div className="text-left">
              <p className="font-medium text-[#030E18]">Create by Course</p>
              <p className="text-sm text-[#7B7B7B]">
                Group students taking a course ({courseCount}{" "}
                available)
              </p>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
}
