"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  ArrowLeft,
  Calculator,
  Award,
  BookOpen,
  TrendingUp,
  Eye,
  Plus,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useAppContext } from "@/app/context/AppContext";
import { useAuth } from "@/app/hooks/useAuth";
import { gradeRecordsApi } from "@/app/services/grade-records.service";
import { getCurrentTerm, getStudentsByClass } from "@/app/services/api.service";

interface Student {
  _id: string;
  name?: string; // Legacy field for backward compatibility
  studentId?: string;
  email?: string;
  userId?: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
  classId?: {
    _id: string;
    name: string;
  };
  gradeLevel?: string;
  parentId?: string;
  isActive?: boolean;
}

interface ClassInfo {
  _id: string;
  name: string;
}

interface Term {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface CourseGradeRecordWithDetails {
  _id: string;
  courseId: string;
  studentId: string;
  termId: string;
  gradeLevel: string;
  cumulativeScore: number;
  maxScore: number;
  percentage: number;
  assessmentGradeRecords: string[];
  course?: {
    title: string;
    courseCode: string;
  };
}

interface StudentCumulativeWithDetails {
  _id: string;
  classId: string;
  studentId: string;
  termId: string;
  totalScore: number;
  percentage: number;
  grade: string;
  position: number;
  remarks?: string;
  courseGradeRecords: CourseGradeRecordWithDetails[];
  student?: {
    name: string;
    studentId: string;
  };
}

const ClassTeacherView: React.FC = () => {
  const { getAccessToken } = useAuth();
  const { user, classes, isLoading: contextLoading } = useAppContext();

  // Core state
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewMode, setViewMode] = useState<
    "class-overview" | "student-details"
  >("class-overview");

  // Data state
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentCourseGrades, setStudentCourseGrades] = useState<
    CourseGradeRecordWithDetails[]
  >([]);
  const [studentCumulative, setStudentCumulative] =
    useState<StudentCumulativeWithDetails | null>(null);
  const [allStudentsCumulative, setAllStudentsCumulative] = useState<
    StudentCumulativeWithDetails[]
  >([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load class data when class/term changes
  useEffect(() => {
    if (selectedClass && selectedTerm) {
      loadClassData();
    }
  }, [selectedClass, selectedTerm]);

  const loadInitialData = async () => {
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No auth token");

      const currentTerm = await getCurrentTerm(token);

      if (currentTerm) {
        const termsData = Array.isArray(currentTerm)
          ? currentTerm
          : [currentTerm];
        setTerms(termsData);
        setSelectedTerm(
          currentTerm._id ||
            (Array.isArray(currentTerm) ? currentTerm[0]._id : "")
        );
      }

      // Auto-select first class if available
      if (classes && classes.length > 0) {
        setSelectedClass(classes[0]._id);
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError("Failed to load initial data.");
    }
  };

  const loadClassData = async () => {
    if (!selectedClass || !selectedTerm) return;

    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) throw new Error("No auth token");

      console.log(
        "Loading class data for:",
        selectedClass,
        "and term:",
        selectedTerm
      );
      // Load students for the class
      const studentsData = await getStudentsByClass(selectedClass, token);

      // Validate and filter students data
      const validStudents = Array.isArray(studentsData)
        ? studentsData.filter((student) => {
            if (!student || !student._id) return false;

            // Check if student has either legacy name or userId with firstName/lastName
            const hasValidName =
              (student.name &&
                typeof student.name === "string" &&
                student.name.trim().length > 0) ||
              (student.userId &&
                (student.userId.firstName || student.userId.lastName));

            return hasValidName;
          })
        : [];

      console.log("Valid students loaded:", validStudents.length);
      setStudents(validStudents);

      // Load all students' cumulative records
      await loadAllStudentsCumulative(validStudents);
    } catch (error) {
      console.error("Error loading class data:", error);
      setError("Failed to load class data.");
      setStudents([]);
      setAllStudentsCumulative([]);
    } finally {
      setLoading(false);
    }
  };

  //   const loadAllStudentsCumulative = async (studentsData: Student[]) => {
  //     try {
  //       const token = getAccessToken();
  //       if (!token || !selectedTerm) return;

  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  const loadAllStudentsCumulative = async (studentsData: Student[]) => {
    try {
      const token = getAccessToken();
      if (!token || !selectedTerm) return;

      const cumulativePromises = studentsData.map(async (student) => {
        try {
          const result = await gradeRecordsApi.getStudentCumulative(
            student._id,
            selectedTerm,
            token
          );
          // Validate the result has required properties
          if (
            result &&
            typeof result.percentage === "number" &&
            typeof result.position === "number"
          ) {
            return result;
          }
          return null;
        } catch (error) {
          console.log(
            `No cumulative record for student ${getStudentName(student)}`
          );
          return null;
        }
      });

      const cumulativeRecords = await Promise.all(cumulativePromises);
      const validRecords = cumulativeRecords.filter(
        (record) => record !== null && record !== undefined
      );

      // Sort by position, with fallback for undefined positions
      validRecords.sort((a: any, b: any) => {
        const posA = a?.position || 999;
        const posB = b?.position || 999;
        return posA - posB;
      });

      console.log("Loaded cumulative records:", validRecords);
      setAllStudentsCumulative(validRecords as any);
    } catch (error) {
      console.error("Error loading students cumulative records:", error);
      setAllStudentsCumulative([]);
    }
  };

  const handleStudentSelect = async (student: Student) => {
    setSelectedStudent(student);
    setViewMode("student-details");

    try {
      const token = getAccessToken();
      if (!token || !selectedTerm) return;

      setLoading(true);

      // Load student's course grades and cumulative record
      const [courseGrades, cumulativeRecord] = await Promise.all([
        gradeRecordsApi.getStudentTermGrades(student._id, selectedTerm, token),
        gradeRecordsApi
          .getStudentCumulative(student._id, selectedTerm, token)
          .catch(() => null),
      ]);

      setStudentCourseGrades(Array.isArray(courseGrades) ? courseGrades : []);
      setStudentCumulative(cumulativeRecord as any);
    } catch (error) {
      console.error("Error loading student details:", error);
      setError("Failed to load student details.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCumulative = async () => {
    if (!selectedStudent || !selectedTerm) return;

    setIsGenerating(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No auth token");

      // Auto-calculate student cumulative
      const cumulativeRecord =
        await gradeRecordsApi.autoCalculateStudentCumulative(
          selectedStudent._id,
          selectedTerm,
          token
        );

      setStudentCumulative(cumulativeRecord as any);

      // Refresh all students cumulative to update positions
      await loadAllStudentsCumulative(students);
    } catch (error) {
      console.error("Error generating cumulative record:", error);
      setError("Failed to generate cumulative record.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackToOverview = () => {
    setViewMode("class-overview");
    setSelectedStudent(null);
    setStudentCourseGrades([]);
    setStudentCumulative(null);
  };

  const getStudentName = (student: Student): string => {
    // Try legacy name field first
    if (
      student.name &&
      typeof student.name === "string" &&
      student.name.trim().length > 0
    ) {
      return student.name;
    }

    // Try userId with firstName and lastName
    if (student.userId?.firstName || student.userId?.lastName) {
      const firstName = student.userId.firstName || "";
      const lastName = student.userId.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName.length > 0) {
        return fullName;
      }
    }

    return "Unknown Student";
  };

  const getStudentId = (student: Student): string => {
    // Try direct studentId field first
    if (student.studentId && typeof student.studentId === "string") {
      return student.studentId;
    }

    // Try userId email as fallback
    if (student.userId?.email) {
      return student.userId.email;
    }

    return "N/A";
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 bg-green-100";
    if (percentage >= 80) return "text-blue-600 bg-blue-100";
    if (percentage >= 70) return "text-yellow-600 bg-yellow-100";
    if (percentage >= 60) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const getPositionSuffix = (position: number) => {
    const lastDigit = position % 10;
    const lastTwoDigits = position % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return "th";
    switch (lastDigit) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  if (contextLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-[#6F6F6F]">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-white shadow-none border-[#F0F0F0]">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>{error}</p>
              <Button
                onClick={loadInitialData}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white shadow-none"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-[#030E18]">
            Class Teacher Dashboard
          </h2>
          <p className="text-sm text-[#6F6F6F] mt-1">
            Manage student cumulative grades and class performance
          </p>
        </div>

        {viewMode === "student-details" && (
          <Button
            variant="outline"
            onClick={handleBackToOverview}
            className="flex items-center gap-2 shadow-none border-[#F0F0F0] text-[#6F6F6F] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Class
          </Button>
        )}
      </div>

      {/* Class Selection */}
      <Card className="bg-white shadow-none border-[#F0F0F0] mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2F2F2F] mb-2">
                Select Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-[#F0F0F0] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a class</option>
                {classes?.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2F2F2F] mb-2">
                Academic Term
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-3 py-2 border border-[#F0F0F0] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a term</option>
                {terms.map((term) => (
                  <option key={term._id} value={term._id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Overview */}
      {viewMode === "class-overview" && selectedClass && selectedTerm && (
        <div className="space-y-6">
          {/* Class Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white shadow-none border-[#F0F0F0]">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-medium text-[#030E18]">
                      {students.length}
                    </p>
                    <p className="text-sm text-[#878787]">Total Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-none border-[#F0F0F0]">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-medium text-[#030E18]">
                      {allStudentsCumulative.length}
                    </p>
                    <p className="text-sm text-[#878787]">Graded Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-none border-[#F0F0F0]">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-medium text-[#030E18]">
                      {allStudentsCumulative.length > 0
                        ? Math.round(
                            allStudentsCumulative
                              .filter(
                                (record) =>
                                  record &&
                                  typeof record.percentage === "number"
                              )
                              .reduce(
                                (sum, record) => sum + record.percentage,
                                0
                              ) /
                              allStudentsCumulative.filter(
                                (record) =>
                                  record &&
                                  typeof record.percentage === "number"
                              ).length
                          ) || 0
                        : 0}
                      %
                    </p>
                    <p className="text-sm text-[#878787]">Class Average</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-none border-[#F0F0F0]">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Award className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-medium text-[#030E18]">
                      {
                        allStudentsCumulative.filter(
                          (record) =>
                            record &&
                            typeof record.percentage === "number" &&
                            record.percentage >= 80
                        ).length
                      }
                    </p>
                    <p className="text-sm text-[#878787]">High Performers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Students List */}
          <Card className="bg-white shadow-none border-[#F0F0F0]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#030E18]">
                <Users className="w-5 h-5" />
                Class Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Clock className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-[#6F6F6F]">Loading students...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {students.map((student) => {
                    const cumulativeRecord = allStudentsCumulative.find(
                      (record) => record && record.studentId === student._id
                    );

                    return (
                      <div
                        key={student._id}
                        className="flex items-center justify-between p-4 border border-[#F0F0F0] rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                        onClick={() => handleStudentSelect(student)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                            <span className="font-medium text-blue-600">
                              {getStudentName(student).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-[#030E18]">
                              {getStudentName(student)}
                            </h3>
                            <p className="text-sm text-[#6F6F6F]">
                              ID: {getStudentId(student)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {cumulativeRecord &&
                          typeof cumulativeRecord.percentage === "number" ? (
                            <>
                              <div className="text-right">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(
                                    cumulativeRecord.percentage
                                  )}`}
                                >
                                  {cumulativeRecord.grade || "N/A"}
                                </span>
                                <p className="text-sm text-[#6F6F6F] mt-1">
                                  {cumulativeRecord.position || "N/A"}
                                  {cumulativeRecord.position
                                    ? getPositionSuffix(
                                        cumulativeRecord.position
                                      )
                                    : ""}{" "}
                                  position
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-[#030E18]">
                                  {cumulativeRecord.percentage.toFixed(1)}%
                                </p>
                                <p className="text-sm text-[#6F6F6F]">
                                  {cumulativeRecord.courseGradeRecords
                                    ?.length || 0}{" "}
                                  courses
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="text-right">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-[#878787]">
                                Not Graded
                              </span>
                              <p className="text-sm text-[#6F6F6F] mt-1">
                                Click to grade
                              </p>
                            </div>
                          )}

                          <Eye className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}

                  {students.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-[#6F6F6F]">
                        No students found in this class
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student Details View */}
      {viewMode === "student-details" && selectedStudent && (
        <div className="space-y-6">
          {/* Student Info */}
          <Card className="bg-white shadow-none border-[#F0F0F0]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#030E18]">
                <Users className="w-5 h-5 text-blue-600" />
                {getStudentName(selectedStudent)}
              </CardTitle>
              <p className="text-[#6F6F6F]">
                Student ID: {getStudentId(selectedStudent)}
              </p>
            </CardHeader>
          </Card>

          {/* Course Grades */}
          <Card className="bg-white shadow-none border-[#F0F0F0]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#030E18]">
                <BookOpen className="w-5 h-5 text-green-600" />
                Course Grades
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Clock className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-[#6F6F6F]">Loading course grades...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentCourseGrades.map((courseGrade) => (
                    <div
                      key={courseGrade._id}
                      className="border border-[#F0F0F0] rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-[#030E18]">
                            {courseGrade.course?.title || "Unknown Course"}
                          </h3>
                          <p className="text-sm text-[#6F6F6F]">
                            {courseGrade.course?.courseCode}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(
                              courseGrade.percentage
                            )}`}
                          >
                            {courseGrade.gradeLevel}
                          </span>
                          <p className="text-sm text-[#6F6F6F] mt-1">
                            {courseGrade.cumulativeScore}/{courseGrade.maxScore}{" "}
                            ({courseGrade.percentage}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {studentCourseGrades.length === 0 && (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-[#6F6F6F]">No course grades found</p>
                      <p className="text-sm text-[#878787]">
                        Course teachers need to grade assessments first
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cumulative Grade */}
          <Card className="bg-white shadow-none border-[#F0F0F0]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#030E18]">
                <Award className="w-5 h-5 text-yellow-600" />
                Cumulative Grade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentCumulative ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-medium text-blue-600">
                        {studentCumulative.grade}
                      </p>
                      <p className="text-sm text-[#6F6F6F]">Overall Grade</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-medium text-green-600">
                        {studentCumulative.percentage}%
                      </p>
                      <p className="text-sm text-[#6F6F6F]">Percentage</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-medium text-purple-600">
                        {studentCumulative.position}
                        {getPositionSuffix(studentCumulative.position)}
                      </p>
                      <p className="text-sm text-[#6F6F6F]">Class Position</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-medium text-orange-600">
                        {studentCumulative.totalScore}
                      </p>
                      <p className="text-sm text-[#6F6F6F]">Total Score</p>
                    </div>
                  </div>

                  {studentCumulative.remarks && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-2 text-[#030E18]">
                        Remarks
                      </h4>
                      <p className="text-[#6F6F6F]">
                        {studentCumulative.remarks}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-[#6F6F6F] mb-4">
                    No cumulative grade record found
                  </p>
                  <Button
                    onClick={handleGenerateCumulative}
                    disabled={isGenerating || studentCourseGrades.length === 0}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-none"
                  >
                    {isGenerating ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Calculator className="w-4 h-4" />
                    )}
                    Generate Cumulative Grade
                  </Button>
                  {studentCourseGrades.length === 0 && (
                    <p className="text-sm text-[#878787] mt-2">
                      Student needs course grades before generating cumulative
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClassTeacherView;
