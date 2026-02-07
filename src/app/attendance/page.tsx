"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ArrowLeft,
  Eye,
  CheckCircle,
  Check,
  X,
  Send,
  RefreshCw,
} from "lucide-react";
import { DataTable } from "@/components/attendance/data-table";
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
  getClassAttendanceStatus,
  getStudentAttendanceKPIs,
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
  const [absentReasons, setAbsentReasons] = useState<Record<string, string>>(
    {}
  );
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);
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
      // Fetch both students list and attendance status
      const [students, attendanceStatusData] = await Promise.all([
        getStudentsByClass(selectedClass._id, token),
        getClassAttendanceStatus(selectedClass._id, token),
      ]);

      setAttendanceStatus(attendanceStatusData);

      // Create a map of students who already have attendance marked
      const markedStudentsMap = new Map();
      if (attendanceStatusData?.students) {
        attendanceStatusData.students.forEach((student: any) => {
          if (student.attendanceMarked) {
            markedStudentsMap.set(student.studentId, {
              status:
                student.attendanceStatus?.toLowerCase() === "present"
                  ? "present"
                  : "absent",
              isSubmitted: true,
              reasonForAbsence: student.absenceReason,
              recordedBy: student.recordedBy,
              recordedAt: student.recordedAt,
            });
          }
        });
      }

      const formattedData: AttendanceRecord[] = students.map((student: any) => {
        const markedData = markedStudentsMap.get(student._id);
        return {
          id: student._id,
          name: `${student.userId.firstName} ${student.userId.lastName}`,
          date: new Date().toLocaleDateString(),
          status: markedData?.status || undefined,
          isSubmitted: markedData?.isSubmitted || false,
          reasonForAbsence: markedData?.reasonForAbsence,
        };
      });

      // Update submitted students set
      const alreadySubmitted = new Set(
        formattedData
          .filter((student) => student.isSubmitted)
          .map((student) => student.id)
      );

      setStudents(students);
      setData(formattedData);
      setSubmittedStudents(alreadySubmitted);
      console.log("Students loaded:", formattedData.length);
      console.log("Already submitted:", alreadySubmitted.size);
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
      // Use the class attendance status endpoint instead of just getting students
      const attendanceData = await getClassAttendanceStatus(
        selectedClass._id,
        token
      );
      setAttendanceStatus(attendanceData);

      // The students data is now included in the attendance status response
      if (attendanceData?.students) {
        setStudents(attendanceData.students);
      }

      console.log("Attendance data loaded for viewing:", attendanceData);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleRefreshAttendance = async () => {
    if (!selectedClass || viewMode !== "mark-attendance") return;

    setLoadingStudents(true);
    const token = getAccessToken();
    if (!token) return;

    try {
      // Re-fetch attendance status
      const attendanceStatusData = await getClassAttendanceStatus(
        selectedClass._id,
        token
      );
      setAttendanceStatus(attendanceStatusData);

      // Update the data with latest attendance status
      const markedStudentsMap = new Map();
      if (attendanceStatusData?.students) {
        attendanceStatusData.students.forEach((student: any) => {
          if (student.attendanceMarked) {
            markedStudentsMap.set(student.studentId, {
              status:
                student.attendanceStatus?.toLowerCase() === "present"
                  ? "present"
                  : "absent",
              isSubmitted: true,
              reasonForAbsence: student.absenceReason,
              recordedBy: student.recordedBy,
              recordedAt: student.recordedAt,
            });
          }
        });
      }

      // Update existing data with new status
      setData((prevData) =>
        prevData.map((student) => {
          const markedData = markedStudentsMap.get(student.id);
          return markedData
            ? {
                ...student,
                status: markedData.status,
                isSubmitted: markedData.isSubmitted,
                reasonForAbsence: markedData.reasonForAbsence,
              }
            : student;
        })
      );

      // Update submitted students set
      const alreadySubmitted = new Set(Array.from(markedStudentsMap.keys()));
      setSubmittedStudents(alreadySubmitted);

      console.log("Attendance status refreshed");
    } catch (error) {
      console.error("Error refreshing attendance:", error);
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
  const handleAbsentSubmit = async (
    studentId: string,
    absenceReason: string
  ) => {
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

      // Construct the payload with additional absenceReason field.
      const payload = {
        studentId: student.id,
        classId,
        date,
        status: "Absent", // Note: Ensure your API expects "Absent" (capitalized)
        termId: term._id,
        absenceReason, // This is the reason supplied from the input
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
      setSubmittedStudents((prev) => new Set([...prev, studentId]));
      setData((prev) =>
        prev.map((stud) =>
          stud.id === studentId
            ? { ...stud, isSubmitted: true, reasonForAbsence: absenceReason }
            : stud
        )
      );

      // Clear the reason from state after successful submission
      setAbsentReasons((prev) => {
        const updated = { ...prev };
        delete updated[studentId];
        return updated;
      });

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

  const filteredStudents =
    viewMode === "view-attendance" && attendanceStatus?.students
      ? attendanceStatus.students.filter((student: any) =>
          `${student.firstName} ${student.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        )
      : students.filter((student) =>
          `${student.userId.firstName} ${student.userId.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        );

  const filteredData = data
    .filter((student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort submitted students to the end
      const aSubmitted = a.isSubmitted || submittedStudents.has(a.id);
      const bSubmitted = b.isSubmitted || submittedStudents.has(b.id);

      if (aSubmitted && !bSubmitted) return 1;
      if (!aSubmitted && bSubmitted) return -1;
      return 0; // Keep original order for same status
    });

  return (
    <Layout>
      <div className="min-h-screen bg-[#F8F8F8]">
        <div className="p-3 sm:p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-start gap-3 sm:gap-4">
              {viewMode !== "classes" && (
                <button
                  onClick={handleBackToClasses}
                  className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-full text-[#6F6F6F] hover:bg-[#F0F0F0] hover:text-[#030E18] transition-all duration-200"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-[#030E18] truncate">
                  {viewMode === "classes"
                    ? "Attendance"
                    : selectedClass?.name || "Attendance"}
                </h1>
                <p className="text-sm text-[#6F6F6F] leading-tight mt-1">
                  {viewMode === "classes"
                    ? "Select a class to manage attendance"
                    : viewMode === "mark-attendance"
                    ? "Mark attendance for today"
                    : "View attendance analytics"}
                </p>
              </div>
            </div>

            {/* Search Bar and Refresh - Only show when viewing students */}
            {(viewMode === "mark-attendance" ||
              viewMode === "view-attendance") && (
              <div className="flex w-full md:w-auto">
                <div className="flex items-center bg-white border border-[#F0F0F0] rounded-xl px-3 py-2 w-full md:w-[320px]">
                  <Search
                    className="text-[#878787] mr-2 sm:mr-3 flex-shrink-0"
                    size={18}
                  />
                  <Input
                    className="border-0 focus-visible:ring-0 focus:outline-none flex-1 placeholder:text-[#878787] shadow-none text-sm sm:text-base"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-4 sm:space-y-6">
         

            {viewMode === "classes" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <LoadingCard key={i} height="h-40 sm:h-48" />
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
              <div className="space-y-4 sm:space-y-6">
                {loadingStudents ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <LoadingCard key={i} height="h-32 sm:h-36" />
                    ))}
                  </div>
                ) : data.length === 0 ? (
                  <Card className="p-6 sm:p-8 text-center border-[#F0F0F0]">
                    <CardContent>
                      <p className="text-[#878787] text-sm sm:text-base">
                        No students found for this class
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Header with Stats */}
                    <div className="rounded-2xl border border-[#E6EDF5] bg-gradient-to-br from-[#F6F9FC] via-white to-[#F8FBFF] p-4 sm:p-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                        <div className="rounded-xl border border-[#E6EDF5] bg-white/80 p-3 text-left">
                          <div className="text-[11px] uppercase tracking-wide text-[#6F6F6F]">
                            Total
                          </div>
                          <div className="mt-1 text-lg sm:text-xl font-semibold text-[#030E18]">
                            {attendanceStatus?.totalStudents || data.length}
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-[#EEF3F9]">
                            <div className="h-1.5 w-full rounded-full bg-[#003366]" />
                          </div>
                        </div>

                        <div className="rounded-xl border border-green-200 bg-green-50/60 p-3 text-left">
                          <div className="text-[11px] uppercase tracking-wide text-green-700">
                            Present
                          </div>
                          <div className="mt-1 text-lg sm:text-xl font-semibold text-green-700">
                            {attendanceStatus?.presentCount ||
                              data.filter((s) => s.status === "present").length}
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-green-100">
                            <div className="h-1.5 w-3/4 rounded-full bg-green-600" />
                          </div>
                        </div>

                        <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 text-left">
                          <div className="text-[11px] uppercase tracking-wide text-red-700">
                            Absent
                          </div>
                          <div className="mt-1 text-lg sm:text-xl font-semibold text-red-700">
                            {attendanceStatus?.absentCount ||
                              data.filter((s) => s.status === "absent").length}
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-red-100">
                            <div className="h-1.5 w-1/3 rounded-full bg-red-600" />
                          </div>
                        </div>

                        <div className="rounded-xl border border-[#D7E6F6] bg-[#EAF2FB]/60 p-3 text-left">
                          <div className="text-[11px] uppercase tracking-wide text-[#003366]">
                            Marked
                          </div>
                          <div className="mt-1 text-lg sm:text-xl font-semibold text-[#003366]">
                            {attendanceStatus?.attendanceMarked ||
                              submittedStudents.size}
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-[#DDEAF7]">
                            <div className="h-1.5 w-2/3 rounded-full bg-[#003366]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Students Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                      {filteredData.map((student) => {
                        const isSubmitted =
                          student.isSubmitted ||
                          submittedStudents.has(student.id);
                        return (
                          <Card
                            key={student.id}
                            className="overflow-hidden border transition-all duration-200 border-[#F0F0F0] bg-white hover:border-[#003366]/20"
                          >
                            <CardContent className="p-3 sm:p-4">
                              {/* Student Info */}
                              <div className="mb-3 text-center">
                                <div className="mx-auto mb-2 w-10 h-10 bg-gradient-to-r from-[#003366] to-[#004080] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {student.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                                <h3 className="font-semibold text-[#030E18] text-sm sm:text-base truncate">
                                  {student.name}
                                </h3>
                                {/* Show attendance details when marked, otherwise show student info */}
                                {(isSubmitted &&
                                  attendanceStatus?.students &&
                                  (() => {
                                    const studentAttendance =
                                      attendanceStatus.students.find(
                                        (s: any) =>
                                          s.studentId === student.id &&
                                          s.attendanceMarked
                                      );
                                    if (studentAttendance) {
                                      return (
                                        <p className="mt-1 text-xs text-[#878787]">
                                          Marked at{" "}
                                          {new Date(
                                            studentAttendance.recordedAt
                                          ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                      );
                                    } else if (isSubmitted) {
                                      // Fallback to current time if marked but no data from API yet
                                      return (
                                        <p className="mt-1 text-xs text-[#878787]">
                                          Marked at{" "}
                                          {new Date().toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                      );
                                    } else {
                                      return null;
                                    }
                                  })()) || null}
                              </div>

                                {/* Status Button - Only show when attendance is marked */}
                                {isSubmitted && (
                                  <div className="flex justify-center">
                                    {attendanceStatus?.students &&
                                      (() => {
                                        const studentAttendance =
                                          attendanceStatus.students.find(
                                            (s: any) =>
                                              s.studentId === student.id &&
                                              s.attendanceMarked
                                          );
                                        return studentAttendance ? (
                                          <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">
                                            {studentAttendance.attendanceStatus}
                                          </button>
                                        ) : (
                                          <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">
                                            {student.status === "present"
                                              ? "Present"
                                              : "Absent"}
                                          </button>
                                        );
                                      })()}
                                  </div>
                                )}
                              

                              {!isSubmitted && (
                                <div className="space-y-3">
                                  {/* Attendance Buttons */}
                                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                    <button
                                      onClick={() =>
                                        handleStatusChange(
                                          student.id,
                                          "present"
                                        )
                                      }
                                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-medium transition-all duration-200 text-sm ${
                                        student.status === "present"
                                          ? "bg-green-600 text-white"
                                          : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                                      }`}
                                    >
                                      <Check className="w-4 h-4" />
                                      Present
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleStatusChange(student.id, "absent")
                                      }
                                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-medium transition-all duration-200 text-sm ${
                                        student.status === "absent"
                                          ? "bg-red-600 text-white"
                                          : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                                      }`}
                                    >
                                      <X className="w-4 h-4" />
                                      Absent
                                    </button>
                                  </div>

                                  {/* Absence Reason Input - Shows when student is marked absent */}
                                  {student.status === "absent" && (
                                    <div className="space-y-2">
                                      <label className="text-xs font-medium text-red-700 block">
                                        Reason for Absence *
                                      </label>
                                      <textarea
                                        value={absentReasons[student.id] || ""}
                                        onChange={(e) =>
                                          setAbsentReasons((prev) => ({
                                            ...prev,
                                            [student.id]: e.target.value,
                                          }))
                                        }
                                        placeholder="Enter reason for absence..."
                                        className="w-full p-2.5 border border-red-200 rounded-md bg-red-50 text-red-900 placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                                        rows={2}
                                      />
                                    </div>
                                  )}

                                  {/* Submit Button */}
                                  <button
                                    onClick={() => {
                                      if (student.status === "absent") {
                                        const reason =
                                          absentReasons[student.id];
                                        if (!reason || reason.trim() === "") {
                                          alert(
                                            "Please provide a reason for absence before submitting."
                                          );
                                          return;
                                        }
                                        handleAbsentSubmit(student.id, reason);
                                      } else {
                                        handleDirectSubmit(student.id);
                                      }
                                    }}
                                    disabled={
                                      student.status === "absent" &&
                                      (!absentReasons[student.id] ||
                                        absentReasons[student.id].trim() === "")
                                    }
                                    className={`w-full px-3 py-2.5 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm ${
                                      student.status === "absent" &&
                                      (!absentReasons[student.id] ||
                                        absentReasons[student.id].trim() === "")
                                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        : "bg-[#003366] text-white hover:bg-[#002244]"
                                    }`}
                                  >
                                    <Send className="w-4 h-4" />
                                    <span className="hidden sm:inline">
                                      {student.status === "absent"
                                        ? "Submit with Reason"
                                        : "Submit Attendance"}
                                    </span>
                                    <span className="sm:hidden">
                                      {student.status === "absent"
                                        ? "Submit"
                                        : "Submit"}
                                    </span>
                                  </button>
                                </div>
                              )}

                              {isSubmitted &&
                                (student.reasonForAbsence ||
                                  (attendanceStatus?.students &&
                                    (() => {
                                      const studentAttendance =
                                        attendanceStatus.students.find(
                                          (s: any) =>
                                            s.studentId === student.id &&
                                            s.attendanceMarked
                                        );
                                      return studentAttendance?.absenceReason;
                                    })())) && (
                                  <div className="mt-3 p-2.5 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <p className="text-xs text-yellow-800">
                                      <strong>Reason for absence:</strong>{" "}
                                      {student.reasonForAbsence ||
                                        (() => {
                                          const studentAttendance =
                                            attendanceStatus?.students?.find(
                                              (s: any) =>
                                                s.studentId === student.id &&
                                                s.attendanceMarked
                                            );
                                          return studentAttendance?.absenceReason;
                                        })()}
                                    </p>
                                  </div>
                                )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {viewMode === "view-attendance" && (
              <div className="space-y-4 sm:space-y-6">
                {loadingStudents ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <LoadingCard key={i} height="h-40 sm:h-48 md:h-52" />
                    ))}
                  </div>
                ) : !attendanceStatus || filteredStudents.length === 0 ? (
                  <Card className="p-8 sm:p-12 text-center border-[#F0F0F0]">
                    <CardContent>
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#F8F8F8] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <Search className="w-6 h-6 sm:w-8 sm:h-8 text-[#878787]" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-[#030E18] mb-2">
                        No Students Found
                      </h3>
                      <p className="text-[#878787] text-sm sm:text-base">
                        {searchQuery
                          ? "No students match your search criteria"
                          : "No students found for this class"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Summary Statistics */}
                    <div className="bg-white rounded-xl border border-[#F0F0F0] p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <h3 className="text-lg font-semibold text-[#030E18]">
                          Today’s Overview
                        </h3>
                        <span className="text-xs text-[#6F6F6F] bg-[#F8F8F8] px-2 py-1 rounded-full w-fit">
                          {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
                        <div className="text-center p-3 bg-[#F8F8F8] rounded-lg border border-[#F0F0F0]">
                          <div className="text-xl font-semibold text-[#030E18] mb-1">
                            {attendanceStatus.totalStudents}
                          </div>
                          <div className="text-xs text-[#6F6F6F] font-medium">
                            Total
                          </div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-xl font-semibold text-green-700 mb-1">
                            {attendanceStatus.presentCount}
                          </div>
                          <div className="text-xs text-green-600 font-medium">
                            Present
                          </div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="text-xl font-semibold text-red-700 mb-1">
                            {attendanceStatus.absentCount}
                          </div>
                          <div className="text-xs text-red-600 font-medium">
                            Absent
                          </div>
                        </div>
                        <div className="text-center p-3 bg-[#003366]/5 rounded-lg border border-[#003366]/20">
                          <div className="text-xl font-semibold text-[#003366] mb-1">
                            {attendanceStatus.attendanceMarked}
                          </div>
                          <div className="text-xs text-[#003366] font-medium">
                            Marked
                          </div>
                        </div>
                       
                      </div>
                    </div>

                    {/* Students Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                      {filteredStudents.map((student: any) => (
                        <Card
                          key={student.studentId}
                          className="group hover:shadow-md transition-all duration-300 border-[#F0F0F0] hover:border-[#003366]/30 overflow-hidden bg-white"
                        >
                          <CardHeader className="pb-3 bg-white border-b border-[#F0F0F0]">
                            <div className="text-center">
                              <div className="relative inline-flex">
                                <div className="w-11 h-11 bg-gradient-to-br from-[#003366] to-[#004080] rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                                  {student.firstName[0]}
                                  {student.lastName[0]}
                                </div>
                                {/* Status indicator dot */}
                                {student.attendanceMarked && (
                                  <div
                                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                      student.attendanceStatus === "Present"
                                        ? "bg-green-500"
                                        : student.attendanceStatus === "Absent"
                                        ? "bg-red-500"
                                        : "bg-yellow-500"
                                    }`}
                                  ></div>
                                )}
                              </div>
                              <CardTitle className="mt-2 text-sm font-semibold text-[#030E18] truncate">
                                {student.firstName} {student.lastName}
                              </CardTitle>
                              <p className="text-xs text-[#6F6F6F] truncate">
                                {student.email}
                              </p>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Attendance Status */}
                              {student.attendanceMarked ? (
                                <div
                                  className={`p-3 rounded-lg border transition-all duration-300 ${
                                    student.attendanceStatus === "Present"
                                      ? "bg-green-50 border-green-200"
                                      : student.attendanceStatus === "Absent"
                                      ? "bg-red-50 border-red-200"
                                      : "bg-yellow-50 border-yellow-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-2 h-2 rounded-full ${
                                          student.attendanceStatus === "Present"
                                            ? "bg-green-500"
                                            : student.attendanceStatus ===
                                              "Absent"
                                            ? "bg-red-500"
                                            : "bg-yellow-500"
                                        }`}
                                      ></div>
                                      <span className="font-semibold text-xs text-[#030E18]">
                                        Attendance Status
                                      </span>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        student.attendanceStatus === "Present"
                                          ? "bg-green-100 text-green-800 border border-green-200"
                                          : student.attendanceStatus ===
                                            "Absent"
                                          ? "bg-red-100 text-red-800 border border-red-200"
                                          : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                      }`}
                                    >
                                      {student.attendanceStatus}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-[#6F6F6F] flex items-center gap-2">
                                      <span className="font-medium">Time:</span>
                                      {new Date(
                                        student.recordedAt
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                  <div className="text-center">
                                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    </div>
                                    <span className="text-orange-700 font-semibold text-xs block mb-1">
                                      Attendance Pending
                                    </span>
                                    <p className="text-xs text-orange-600">
                                      No attendance recorded for today
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* View Analytics Button */}
                              <Button
                                onClick={() =>
                                  handleViewAnalytics(student.studentId)
                                }
                                className="w-full bg-[#003366] hover:bg-[#002244] text-white transition-all duration-200 font-medium py-2.5 text-sm shadow-none"
                                size="sm"
                              >
                                <Eye size={16} className="mr-2" />
                                <span className="hidden sm:inline">
                                  View Analytics
                                </span>
                                <span className="sm:hidden">Analytics</span>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AttendancePage;
