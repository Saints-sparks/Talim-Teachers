"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  User2,
  Users,
  UsersRound,
  GraduationCap,
  ChevronRight,
} from "lucide-react";

export interface ClassCardProps {
  classItem: {
    _id: string;
    name: string;
    classCapacity: string;
    classDescription?: string;
  };
  onView: (classItem: { _id: string; name: string }) => void;
  disabled?: boolean;
}

const getClassGradient = (className: string) => {
  // Return consistent brand color instead of multiple gradients
  return "bg-[#003366]";
};

const ClassCard: React.FC<ClassCardProps> = ({
  classItem,
  onView,
  disabled,
}) => {
  return (
    <div
      className="group bg-white rounded-xl shadow-none hover:shadow-none transition-all duration-300 cursor-pointer border border-[#F0F0F0] overflow-hidden"
      onClick={() => onView(classItem)}
    >
      {/* Header with gradient background */}
      <div
        className={`relative h-24 ${getClassGradient(
          classItem.name
        )} flex items-center justify-center`}
      >
        <div className="text-white">
          <GraduationCap className="w-8 h-8 mx-auto opacity-90" />
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-[#030E18] leading-tight">
            {classItem.name}
          </h3>
          <ChevronRight className="w-5 h-5 text-[#878787] group-hover:text-[#030E18] transition-colors flex-shrink-0 ml-2" />
        </div>

        {classItem.classDescription && (
          <p className="text-sm text-[#6F6F6F] line-clamp-2 leading-relaxed">
            {classItem.classDescription}
          </p>
        )}

        {/* Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[#6F6F6F]">
              <Users className="w-4 h-4" />
              <span>Capacity</span>
            </div>
            <span className="font-medium text-[#030E18]">
              {classItem.classCapacity} students
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F0F0F0]">
          <div className="flex items-center gap-2 text-sm text-[#878787]">
            <GraduationCap className="w-4 h-4" />
            <span>Class</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="text-[#003366] hover:text-[#002244] hover:bg-[#F0F0F0] transition-colors font-medium h-8 px-3"
            onClick={(e) => {
              e.stopPropagation();
              onView(classItem);
            }}
          >
            View Students
          </Button>
        </div>
      </div>

      {/* Hover effect border */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-[#F0F0F0] transition-colors duration-300 pointer-events-none" />
    </div>
  );
};

export default ClassCard;
