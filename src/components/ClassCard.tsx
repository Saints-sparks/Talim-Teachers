"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { User2, Users, UsersRound } from "lucide-react";

export interface ClassCardProps {
  classItem: {
    _id: string;
    name: string;
    classCapacity: string;
    // add any other fields you need, e.g. description, studentCount, etc.
  };
  onView: (classItem: { _id: string; name: string }) => void;
  disabled?: boolean;
}

const ClassCard: React.FC<ClassCardProps> = ({
  classItem,
  onView,
  disabled,
}) => {
  return (
    <div className="bg-white border-2 border-[#EEEEEE] rounded-2xl p-4 w-full sm:max-w-xs flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <User2 size={18} className="text-[#001466]" />
            <span>Class Name</span>
          </div>
          <span className="border border-[#ECECEC] rounded-xl px-3 py-1 text-sm">
            {classItem.name}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <UsersRound size={18} className="text-[#001466]" />
            <span>Number of Students</span>
          </div>
          <span className="border border-[#ECECEC] rounded-xl px-3 py-1 text-sm">
            {classItem.classCapacity}
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => onView(classItem)}
        className="mt-4 shadow-none border-[#ECECEC]"
      >
        View Class
      </Button>
    </div>
  );
};

export default ClassCard;
