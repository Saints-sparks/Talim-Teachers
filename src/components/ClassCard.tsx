"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { User2, Users, UsersRound, GraduationCap, ChevronRight } from "lucide-react";

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
  const gradients = [
    "from-blue-400 via-blue-500 to-blue-600",
    "from-green-400 via-green-500 to-green-600", 
    "from-purple-400 via-purple-500 to-purple-600",
    "from-pink-400 via-pink-500 to-pink-600",
    "from-orange-400 via-orange-500 to-orange-600",
    "from-teal-400 via-teal-500 to-teal-600",
    "from-indigo-400 via-indigo-500 to-indigo-600",
    "from-red-400 via-red-500 to-red-600"
  ];
  
  const index = className.charCodeAt(0) % gradients.length;
  return gradients[index];
};

const ClassCard: React.FC<ClassCardProps> = ({
  classItem,
  onView,
  disabled,
}) => {
  return (
    <div className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden" onClick={() => onView(classItem)}>
      {/* Header with gradient background */}
      <div className={`relative h-24 bg-gradient-to-br ${getClassGradient(classItem.name)} flex items-center justify-center`}>
        <div className="text-white">
          <GraduationCap className="w-8 h-8 mx-auto opacity-90" />
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 leading-tight">
            {classItem.name}
          </h3>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 ml-2" />
        </div>
        
        {classItem.classDescription && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {classItem.classDescription}
          </p>
        )}

        {/* Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span>Capacity</span>
            </div>
            <span className="font-medium text-gray-900">{classItem.classCapacity} students</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <GraduationCap className="w-4 h-4" />
            <span>Class</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors font-medium h-8 px-3"
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
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-200 transition-colors duration-300 pointer-events-none" />
    </div>
  );
};

export default ClassCard;
