"use client";
import React, { useEffect, useState } from "react";
import StudentCard from "./StudentCard";
import { ChevronDown, Search, ArrowLeft, Users, GraduationCap } from "lucide-react";
import { Input } from "../ui/input";
import { useAuth } from "../../app/hooks/useAuth";
import { getStudentsByClass } from "../../app/services/api.service";
import { Button } from "../ui/button";
import { useAppContext } from "@/app/context/AppContext";
import ClassCard from "@/components/ClassCard";
import LoadingCard from "../LoadingCard";

const StudentGrid: React.FC = () => {
  const { user, classes, refreshClasses, isLoading: contextLoading } = useAppContext();
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

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.userId?.firstName ?? ""} ${
      student.userId?.lastName ?? ""
    }`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  if (error && !selectedClass) {
    return (
      <div className="flex flex-col items-center justify-center h-60 space-y-4 text-center text-red-600">
        <p>{error}</p>
        <Button variant="outline" onClick={() => refreshClasses()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-[95%]">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {selectedClass && (
            <Button
              variant="ghost"
              onClick={handleBackToClasses}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 p-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Classes
            </Button>
          )}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {selectedClass ? (
                <>
                  <Users className="w-5 h-5 text-blue-600" />
                  <h1 className="text-xl font-medium text-[#2F2F2F]">
                    {selectedClass.name} Students
                  </h1>
                </>
              ) : (
                <>
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  <h1 className="text-xl font-medium text-[#2F2F2F]">My Classes</h1>
                </>
              )}
            </div>
            <p className="text-[#AAAAAA]">
              {selectedClass 
                ? `View all students in ${selectedClass.name}` 
                : "View all the classes you teach"
              }
            </p>
          </div>
        </div>
        
        {/* Search Bar - Only show when viewing students */}
        {selectedClass && (
          <div className="flex h-10 sm:h-12 border border-[#F0F0F0] bg-white items-center p-2 rounded-lg text-[#898989] w-full sm:w-auto sm:min-w-[300px]">
            <Search strokeWidth="1.5" className="w-4 h-4" />
            <Input
              type="search"
              placeholder="Search for students..."
              className="flex-1 border-none shadow-none focus:outline-none focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Content Section */}
      {!selectedClass ? (
        // Display Classes
        <div className="space-y-4">
          {contextLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <LoadingCard key={i} height="h-48" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
              <p className="text-gray-600 mb-4">You haven't been assigned to any classes yet.</p>
              <Button variant="outline" onClick={() => refreshClasses()}>
                Refresh Classes
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {classes.map((classItem) => (
                <ClassCard
                  key={classItem._id}
                  classItem={classItem}
                  onView={handleClassSelect}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Display Students
        <div className="space-y-4">
          {/* Class Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedClass.name}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedClass.classDescription || "Class Description"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Capacity</p>
                <p className="font-semibold text-gray-900">{selectedClass.classCapacity} students</p>
              </div>
            </div>
          </div>

          {/* Students Grid */}
          {loadingStudents ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <LoadingCard key={i} height="h-48" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">
                <Users className="w-16 h-16 mx-auto mb-2 opacity-50" />
                <p className="text-lg font-medium">Failed to Load Students</p>
                <p className="text-sm">{error}</p>
              </div>
              <Button variant="outline" onClick={() => handleClassSelect(selectedClass)}>
                Try Again
              </Button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? "No Students Found" : "No Students in Class"}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? `No students match "${searchQuery}"` 
                  : `${selectedClass.name} doesn't have any students yet.`
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredStudents.map((student) => (
                <StudentCard key={student._id} student={student} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentGrid;
