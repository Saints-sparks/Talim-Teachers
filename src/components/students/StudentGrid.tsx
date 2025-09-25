"use client";
import React, { useEffect, useState } from "react";
import ClassList from "./ClassList";
import ClassStudents from "./ClassStudents";
import { useAuth } from "../../app/hooks/useAuth";
import { getStudentsByClass } from "../../app/services/api.service";
import { Button } from "../ui/button";
import { useAppContext } from "@/app/context/AppContext";
import ClassCard from "@/components/ClassCard";
import LoadingCard from "../LoadingCard";

const StudentGrid: React.FC = () => {
  const {
    user,
    classes,
    refreshClasses,
    isLoading: contextLoading,
  } = useAppContext();
  const { getAccessToken } = useAuth();
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Refresh classes when component mounts or user changes
    if (user && !contextLoading) {
      refreshClasses();
    }
  }, [user]);

  const handleClassSelect = async (classItem: any) => {
    setSelectedClass(classItem);
    setLoadingStudents(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      const students = await getStudentsByClass(classItem._id, token);
      setStudents(students);
    } catch (err: any) {
      console.error("Error fetching students:", err);
      setError("Failed to load students. Please try again.");
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setStudents([]);
    setSearchQuery("");
    setError(null);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-[95%]">
      {!selectedClass ? (
        <ClassList
          classes={classes}
          contextLoading={contextLoading}
          refreshClasses={refreshClasses}
          onSelect={handleClassSelect}
        />
      ) : (
        <ClassStudents
          selectedClass={selectedClass}
          students={students}
          loadingStudents={loadingStudents}
          error={error}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRetry={() => handleClassSelect(selectedClass)}
        />
      )}
    </div>
  );
};

export default StudentGrid;
