"use client";
import React, { useEffect, useState } from "react";
import StudentCard from "./StudentCard";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../../app/hooks/useAuth";
import {
  getAssignedClasses,
  getStudentsByClass,
} from "../../app/services/api.service";
import { Button } from "../ui/button";

const StudentGrid: React.FC = () => {
  const { getUser, getToken } = useAuth(); // Get logged-in teacher's info
  const [classes, setClasses] = useState<any[]>([]); // Store classes here
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null); // Store user information locally
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchClasses = async () => {
      setLoading(true);
      const token = getToken();
      if (!token) return;
      const classDetails = await getAssignedClasses(user.userId, token);
      setClasses(classDetails);
      setLoading(false);
      // console.log(classes);
    };

    fetchClasses();
  }, [user]);

  const handleClassSelect = async (classItem: any) => {
    setSelectedClass(classItem.name);
    setLoadingStudents(true);

    const token = getToken();
    if (!token) return;

    const students = await getStudentsByClass(classItem._id, token);
    setStudents(students);
    setLoadingStudents(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-[95%]">
      <div className="flex flex-col sm:flex-row items-start justify-between items-center gap-2">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <h1 className="text-xl font-medium text-[#2F2F2F]">Students</h1>
          <p className="text-[#AAAAAA]">View all the students in your class</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex h-10 sm:h-12 border border-[#F0F0F0] bg-white items-center p-2 rounded-lg text-[#898989]">
            <Search strokeWidth="1.5" />
            <Input
              type="search"
              placeholder="Search for students"
              className="flex-1 border-none shadow-none focus:outline-none focus-visible:ring-0"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex text-[#898989] bg-[#FFFFFF] rounded-lg shadow-none border-[#F0F0F0] items-center gap-1 h-10 sm:h-12"
              >
                {loading
                  ? "Loading classes..."
                  : selectedClass
                  ? selectedClass
                  : "Select a class"}{" "}
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="font-manrope" align="end">
              {loading ? (
                <DropdownMenuItem>Loading...</DropdownMenuItem>
              ) : classes.length === 0 ? (
                <DropdownMenuItem>No classes available</DropdownMenuItem>
              ) : (
                classes.map((classItem) => (
                  <DropdownMenuItem
                    key={classItem._id}
                    onClick={() => handleClassSelect(classItem)} // Assuming class has a 'name' property
                  >
                    {classItem.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conditionally render message or student grid */}
      {selectedClass === null ? (
        <div className="text-center text-gray-600">Please select a class</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {students.map((student) => (
            <StudentCard key={student._id} student={student} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentGrid;
