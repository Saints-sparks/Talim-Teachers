"use client";

import { useEffect, useState } from "react";
import { Search, ArrowLeft, Eye } from "lucide-react";
import { DataTable } from "@/components/attendance/data-table";
import { AbsentReasonDialog } from "@/components/attendance/absent-reason-dialog";
import { AttendanceActionModal } from "@/components/attendance/AttendanceActionModal";
import { columns } from "@/components/attendance/columns";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "../hooks/useAuth";
import {
  getCurrentTerm,
  getStudentsByClass,
  submitAttendance,
} from "../services/api.service";
import { useAppContext } from "../context/AppContext";
import LoadingCard from "@/components/LoadingCard";
import ClassCard from "@/components/ClassCard";
import { useRouter } from "next/navigation";

type AttendanceStatus = "present" | "absent";
type ViewMode =
  | "classes"
  | "action-modal"
  | "mark-attendance"
  | "view-attendance";

export interface AttendanceRecord {
  id: string;
  name: string;
  date: string;
  status: AttendanceStatus;
  isAbsent?: boolean;
  reasonForAbsence?: string;
  isSubmitted?: boolean;
}

const AttendancePage: React.FC = () => {
  const { user, classes, refreshClasses } = useAppContext();
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const { getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("classes");
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [submittedStudents, setSubmittedStudents] = useState<Set<string>>(
    new Set()
  );
  const router = useRouter();

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
    console.log("Class selected:", classItem.name);

    // Reset all states to ensure clean modal flow
    setViewMode("classes");
    setStudents([]);
    setData([]);
    setSubmittedStudents(new Set());
    setLoadingStudents(false);

    // Set the selected class and show modal
    setSelectedClass(classItem);
    setActionModalOpen(true);

    console.log("Modal should be opening now");
  };

  const handleMarkAttendance = async () => {
    console.log("Mark Attendance clicked");
    if (!selectedClass) return;

    setActionModalOpen(false);
    setLoadingStudents(true);
    setViewMode("mark-attendance");

    const token = getAccessToken();
    if (!token) return;

    try {
      const students = await getStudentsByClass(selectedClass._id, token);

      const formattedData: AttendanceRecord[] = students.map(
        (student: any) => ({
          id: student._id,
          name: `${student.userId.firstName} ${student.userId.lastName}`,
          date: new Date().toLocaleDateString(),
          status: "present", // default status
          isSubmitted: false,
        })
      );

      setStudents(students);
      setData(formattedData);
      console.log("Students loaded:", formattedData.length);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleViewAttendance = async () => {
    console.log("View Attendance clicked");
    if (!selectedClass) return;

    setActionModalOpen(false);
    setLoadingStudents(true);
    setViewMode("view-attendance");

    const token = getAccessToken();
    if (!token) return;

    try {
      const students = await getStudentsByClass(selectedClass._id, token);
      setStudents(students);
      console.log("Students loaded for viewing:", students.length);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleBackToClasses = () => {
    setViewMode("classes");
    setSelectedClass(null);
    setStudents([]);
    setData([]);
    setSubmittedStudents(new Set());
    setActionModalOpen(false);
    setLoadingStudents(false);
    setSearchQuery("");
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
    console.log("Submit button clicked for student:", studentId);
    if (!selectedClass || !user) return;

    const token = getAccessToken();
    if (!token) return;

    const classId = selectedClass._id;
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

      // Submit attendance directly for the student
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

      // Mark as submitted instead of removing
      setSubmittedStudents((prev) => new Set([...prev, studentId]));
      setData((prev) =>
        prev.map((stud) =>
          stud.id === studentId ? { ...stud, isSubmitted: true } : stud
        )
      );

      alert(`Attendance submitted successfully for ${student.name} ✅`);
    } catch (error) {
      console.error("Error submitting attendance:", error);
      alert("Failed to submit attendance. Please try again.");
    }
  };

  // This function handles the submission when a reason is provided for an absent student.
  const handleAbsentSubmit = async (absenceReason: string) => {
    if (!selectedClass || !user || !selectedStudent) return;

    const token = getAccessToken();
    if (!token) return;

    const classId = selectedClass._id;
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

      // Mark as submitted and update the data
      setSubmittedStudents((prev) => new Set([...prev, selectedStudent]));
      setData((prev) =>
        prev.map((stud) =>
          stud.id === selectedStudent
            ? { ...stud, isSubmitted: true, reasonForAbsence: absenceReason }
            : stud
        )
      );

      alert(`Attendance submitted successfully for ${student.name} ✅`);
    } catch (error) {
      console.error("Error submitting attendance:", error);
      alert("Failed to submit attendance. Please try again.");
    }
  };

  const handleViewAnalytics = (studentId: string) => {
    // Navigate to attendance analytics page for this student
    router.push(
      `/analytics/attendance?studentId=${studentId}&classId=${selectedClass._id}`
    );
  };

  const filteredStudents = students.filter((student) =>
    `${student.userId.firstName} ${student.userId.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const filteredData = data.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-1 bg-[#F8F8F8] text-black min-h-screen">
        <div className="h-full flex-1 flex-col space-y-8 p-4 sm:p-8 flex">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              {viewMode !== "classes" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToClasses}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Classes</span>
                </Button>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-medium text-[#2F2F2F] text-xl sm:text-2xl">
                    {viewMode === "classes"
                      ? "Attendance"
                      : selectedClass?.name || "Attendance"}
                  </h2>
                  <span className="text-[#828282] text-sm">(daily)</span>
                </div>
                <p className="text-[#AAAAAA] text-sm">
                  {viewMode === "classes"
                    ? "Record student attendance seamlessly."
                    : viewMode === "mark-attendance"
                    ? "Mark attendance for today"
                    : "View student attendance records"}
                </p>
              </div>
            </div>

            {/* Search Bar - Only show when viewing students */}
            {(viewMode === "mark-attendance" ||
              viewMode === "view-attendance") && (
              <div className="flex items-center border border-[#F0F0F0] rounded-lg px-3 w-full sm:w-96 bg-white">
                <Search className="text-[#898989]" size={18} />
                <Input
                  className="border-0 focus-visible:ring-0 focus:outline-none flex-1"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Debug Info - Remove in production */}
            {process.env.NODE_ENV === "development" && (
              <div className="p-2 bg-yellow-100 rounded text-xs">
                Debug: viewMode={viewMode}, actionModalOpen={actionModalOpen},
                selectedClass={selectedClass?.name}
              </div>
            )}

            {viewMode === "classes" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <LoadingCard key={i} height="h-48" />
                    ))
                  : classes.map((c) => (
                      <ClassCard
                        key={c._id}
                        classItem={c}
                        onView={handleClassSelect}
                      />
                    ))}
              </div>
            )}

            {viewMode === "mark-attendance" && (
              <div className="space-y-4">
                {loadingStudents ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <LoadingCard key={i} height="h-32" />
                    ))}
                  </div>
                ) : data.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CardContent>
                      <p className="text-gray-600">
                        No students found for this class
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="bg-white rounded-lg border border-[#F0F0F0] overflow-hidden">
                    <DataTable
                      columns={columns({
                        onCancel: (studentId) => {
                          // For absent students, open the absent reason dialog.
                          setSelectedStudent(studentId);
                          setOpen(true);
                        },
                        onStatusChange: handleStatusChange,
                        onDirectSubmit: handleDirectSubmit, // For submitting attendance
                        submittedStudents, // Pass the set of submitted students
                      })}
                      data={filteredData}
                    />
                  </div>
                )}
              </div>
            )}

            {viewMode === "view-attendance" && (
              <div className="space-y-4">
                {loadingStudents ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <LoadingCard key={i} height="h-48" />
                    ))}
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CardContent>
                      <p className="text-gray-600">
                        No students found for this class
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredStudents.map((student) => (
                      <Card
                        key={student._id}
                        className="hover:shadow-lg transition-shadow duration-200 border-[#F0F0F0]"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {student.userId.firstName[0]}
                              {student.userId.lastName[0]}
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg font-semibold text-gray-800">
                                {student.userId.firstName}{" "}
                                {student.userId.lastName}
                              </CardTitle>
                              <p className="text-sm text-gray-500">
                                Student ID:{" "}
                                {student.userId.studentId ||
                                  student._id.slice(-6)}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {/* Quick Stats */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                Attendance Rate
                              </span>
                              <span className="font-semibold text-green-600">
                                95%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Total Days</span>
                              <span className="font-semibold text-gray-800">
                                45
                              </span>
                            </div>

                            {/* Call-to-Action Button */}
                            <Button
                              onClick={() => handleViewAnalytics(student._id)}
                              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200"
                              size="sm"
                            >
                              <Eye size={16} className="mr-2" />
                              View Analytics
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Modal */}
            <AttendanceActionModal
              open={actionModalOpen}
              onOpenChange={setActionModalOpen}
              onMarkAttendance={handleMarkAttendance}
              onViewAttendance={handleViewAttendance}
              className={selectedClass?.name}
            />

            {/* Absent Reason Dialog */}
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
