"use client";
import React, { useState } from "react";
import { useAppContext, type TeacherClass } from "@/app/context/AppContext";
import { useClassStudents } from "@/hooks/students/useClassStudents";
import ClassList from "./ClassList";
import ClassStudents from "./ClassStudents";

/**
 * The students screen: pick one of the teacher's classes, then see its whole
 * roster. Classes come from the teacher record loaded at sign-in; each roster
 * is one cached query per class, so going back and re-opening a class is instant.
 *
 * @returns The screen.
 */
const StudentGrid: React.FC = () => {
  const { classes, refreshClasses, isLoading: contextLoading } = useAppContext();
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const roster = useClassStudents(selectedClass?._id ?? null);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-[95%]">
      {!selectedClass ? (
        <ClassList
          classes={classes}
          contextLoading={contextLoading}
          refreshClasses={() => void refreshClasses()}
          onSelect={setSelectedClass}
        />
      ) : (
        <ClassStudents
          selectedClass={selectedClass}
          students={roster.data}
          loading={roster.isPending}
          refreshing={roster.isFetching}
          error={roster.error}
          onRetry={() => void roster.refetch()}
          onBack={() => setSelectedClass(null)}
        />
      )}
    </div>
  );
};

export default StudentGrid;
