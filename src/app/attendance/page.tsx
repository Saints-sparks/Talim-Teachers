"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { DataTable } from "@/components/attendance/data-table";
import { AbsentReasonDialog } from "@/components/attendance/absent-reason-dialog";
import { columns } from "@/components/attendance/columns";
import Layout from "@/components/Layout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../hooks/useAuth";
import {
  getCurrentTerm,
  getStudentsByClass,
  submitAttendance,
} from "../services/api.service";
import { useAppContext } from "../context/AppContext";
import Image from "next/image";

type AttendanceStatus = "present" | "absent";

export interface AttendanceRecord {
  id: string;
  name: string;
  date: string;
  status: AttendanceStatus;
  isAbsent?: boolean;
  reasonForAbsence?: string;
}

const AttendancePage: React.FC = () => {
  const { user, classes, refreshClasses } = useAppContext();
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const { getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      const token = getAccessToken();
      if (!token) return;
      await refreshClasses();
      setLoading(false);
    };

    fetchClasses();
  }, [user]);

  const handleClassSelect = async (classItem: any) => {
    setSelectedClass(classItem.name);
    setLoadingStudents(true);

    const token = getAccessToken();
    if (!token) return;

    const students = await getStudentsByClass(classItem._id, token);

    const formattedData: AttendanceRecord[] = students.map((student: any) => ({
      id: student._id,
      name: `${student.userId.firstName} ${student.userId.lastName}`,
      date: new Date().toLocaleDateString(),
      status: "present", // default status
    }));

    setStudents(students);
    setData(formattedData);
    setLoadingStudents(false);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setData((prev) =>
      prev.map((student) => {
        if (student.id === studentId) {
          return {
            ...student,
            status,
            isAbsent: status === "absent",
          };
        }
        return student;
      })
    );
  };

  // This function will be used when a student’s status is present and the X button is clicked.
  const handleDirectSubmit = async (studentId: string) => {
    if (!selectedClass || !user) return;

    const token = getAccessToken();
    if (!token) return;

    const classId = classes.find((c) => c.name === selectedClass)?._id;
    const date = new Date().toISOString();

    try {
      const term = await getCurrentTerm(token);
      setCurrentTerm(term);

      const student = data.find((student) => student.id === studentId);
      if (!student) {
        alert("Student not found.");
        return;
      }

      const status = student.status === "present" ? "Present" : "Absent";

      // Submit attendance directly for the student whose status is present.
      const response = await submitAttendance(
        {
          studentId: student.id,
          classId,
          recordedBy: user.userId,
          date,
          status,
          termId: term._id,
        },
        token
      );

      if (!response || !response.studentId) {
        console.error(
          `Error submitting attendance for ${student.name}:`,
          response
        );
        alert(`Failed to submit attendance for ${student.name}.`);
        return;
      }

      setData((prev) => prev.filter((stud) => stud.id !== response.studentId));

      alert("Attendance submitted successfully ✅");
    } catch (error) {
      console.error("Error submitting attendance:", error);
      alert("Failed to submit attendance. Please try again.");
    }
  };

  // This function handles the submission when a reason is provided for an absent student.
  // This function handles the submission when a reason is provided for an absent student.
  const handleAbsentSubmit = async (absenceReason: string) => {
    if (!selectedClass || !user || !selectedStudent) return;

    const token = getAccessToken();
    if (!token) return;

    const classId = classes.find((c) => c.name === selectedClass)?._id;
    const date = new Date().toISOString();

    try {
      const term = await getCurrentTerm(token);
      setCurrentTerm(term);

      const student = data.find((student) => student.id === selectedStudent);
      if (!student) {
        alert("Student not found.");
        return;
      }

      // Construct the payload with additional absenceReason field.
      const payload = {
        studentId: student.id,
        classId,
        recordedBy: user.userId,
        date,
        status: "Absent", // Note: Ensure your API expects "Absent" (capitalized)
        termId: term._id,
        absenceReason, // This is the reason supplied from the dialog input
      };

      const response = await submitAttendance(payload, token);

      if (!response || !response.studentId) {
        console.error(
          `Error submitting attendance for ${student.name}:`,
          response
        );
        alert(`Failed to submit attendance for ${student.name}.`);
        return;
      }

      // Remove the student from the UI after successful submission.
      setData((prev) => prev.filter((stud) => stud.id !== response.studentId));

      alert("Attendance submitted successfully ✅");

      alert("Attendance submitted successfully ✅");
    } catch (error) {
      console.error("Error submitting attendance:", error);
      alert("Failed to submit attendance. Please try again.");
    }
  };

  return (
    <Layout>
      <div className="space-y-1 bg-[F8F8F8] text-black">
        <div className="h-full flex-1 flex-col space-y-8 p-4 sm:p-8 flex">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2">
            <div>
              <div className="flex">
                <h2 className="font-medium text-[#2F2F2F]">Attendance</h2>
                <span className="text-[#828282]">(daily)</span>
              </div>
              <p className="text-[#AAAAAA]">
                Record student attendance seamlessly.
              </p>
            </div>
            <div className="flex gap-2">
              {selectedClass !== null && (
                <div className="flex items-center border border-[#F0F0F0] rounded-lg px-3 w-full bg-white">
                  <Search className="text-[#898989]" size={18} />
                  <Input
                    className="border-0 focus-visible:ring-0 focus:outline-none flex-1"
                    placeholder="Search"
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex text-[#898989] bg-[#FFFFFF] rounded-lg border-[#F0F0F0] items-center gap-1 h-10 sm:h-12"
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
                        onClick={() => handleClassSelect(classItem)}
                      >
                        {classItem.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-4">
            {selectedClass === null ? (
              <div className="text-center text-gray-600 flex flex-col items-center">
                {" "}
                <Image
                  src="/image/students/noclass.png"
                  alt={""}
                  width={334}
                  height={334}
                />
                Please select a class
              </div>
            ) : students.length === 0 ? (
              <div className="text-center text-gray-600">
                No students found for this class
              </div>
            ) : (
              <DataTable
                columns={columns({
                  onCancel: (studentId) => {
                    // For absent students, open the absent reason dialog.
                    setSelectedStudent(studentId);
                    setOpen(true);
                  },
                  onStatusChange: handleStatusChange,
                  onDirectSubmit: handleDirectSubmit, // For present students, submit directly.
                })}
                data={data.filter((student) =>
                  student.name.toLowerCase().includes(searchQuery.toLowerCase())
                )}
              />
            )}
            <AbsentReasonDialog
              open={open}
              onOpenChange={setOpen}
              studentId={selectedStudent}
              onSubmit={(reason: string) => {
                handleAbsentSubmit(reason);
                setOpen(false);
              }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AttendancePage;
