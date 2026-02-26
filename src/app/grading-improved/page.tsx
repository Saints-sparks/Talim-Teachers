"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  GraduationCap,
  TrendingUp,
  FileText,
  RefreshCw,
  Settings,
  BarChart3,
  Target,
  Workflow,
  Upload,
} from "lucide-react";
import SectionHeader from "@/components/ui/section-header";
import GradingWorkflowSteps from "@/components/grading/GradingWorkflowSteps";
import BulkGradingOperations from "@/components/grading/BulkGradingOperations";
import AnalyticsKPITracker from "@/components/grading/AnalyticsKPITracker";
import CourseTeacherView from "@/components/grading/CourseTeacherView";
import ClassTeacherView from "@/components/grading/ClassTeacherView";
import { gradeRecordsApi } from "@/app/services/grade-records.service";
import { useAuth } from "@/app/hooks/useAuth";
import { useAppContext } from "@/app/context/AppContext";
import { getTeacherCourses, getCurrentTerm } from "@/app/services/api.service";
import { Course } from "@/types/types";
import { Student } from "@/types/grading";
import { BulkGradeResult } from "@/types/grade-records";

interface Term {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

type TeacherRole = "course" | "class";
type ViewMode =
  | "dashboard"
  | "workflow"
  | "bulk-grading"
  | "analytics"
  | "legacy";

interface KpiData {
  totalAssessments: number;
  studentsGraded: number;
  averageScore: number;
  pendingReviews: number;
}

const ImprovedGradingPage: React.FC = () => {
  const [activeRole, setActiveRole] = useState<TeacherRole>("course");
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [availableTerms, setAvailableTerms] = useState<Term[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);
  const [kpiData, setKpiData] = useState<KpiData>({
    totalAssessments: 0,
    studentsGraded: 0,
    averageScore: 0,
    pendingReviews: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Bulk grading state
  const [showBulkGrading, setShowBulkGrading] = useState(false);
  const [bulkGradingData, setBulkGradingData] = useState<{
    assessmentId: string;
    assessmentName: string;
    students: Student[];
  } | null>(null);

  const { getAccessToken } = useAuth();
  const { user } = useAppContext();

  const fetchKpis = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Fetch appropriate KPIs based on role and selected entities
      let data: any;
      if (activeRole === "class" && selectedCourse?.classId) {
        data = await gradeRecordsApi.getClassKpis(
          selectedCourse.classId,
          token,
        );
      } else {
        data = await gradeRecordsApi.getSchoolKpis(token);
      }

      setKpiData({
        totalAssessments: data?.totalAssessments ?? 0,
        studentsGraded: data?.studentsGraded ?? 0,
        averageScore: data?.averageScore ?? 0,
        pendingReviews: data?.pendingReviews ?? 0,
      });
    } catch (err: any) {
      console.error("Error fetching KPIs:", err);
      setError(err?.message ?? "Failed to fetch KPI data");

      // Provide reasonable fallback KPIs
      setKpiData({
        totalAssessments: 3,
        studentsGraded: 120,
        averageScore: 72,
        pendingReviews: 6,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCourses = async () => {
    if (!user?.userId) {
     
      return;
    }

    
    setCoursesLoading(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No authentication token");

    
      const courses = await getTeacherCourses(user.userId, token);
     
      setAvailableCourses(courses);

      // Don't auto-select - let user choose manually
      // if (courses.length > 0 && !selectedCourse) {
      //   setSelectedCourse(courses[0]);
      // }
    } catch (err: any) {
     
      setError(err?.message ?? "Failed to fetch courses");
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchAvailableTerms = async () => {
   
    setTermsLoading(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No authentication token");

     
      const currentTerm = await getCurrentTerm(token);
     
      // For now, we'll use the current term. In a full implementation,
      // you might want to fetch all available terms
      if (currentTerm) {
        setAvailableTerms([currentTerm]);
        if (!selectedTermId) {
          setSelectedTermId(currentTerm._id);
        }
      }
    } catch (err: any) {
      
      setError(err?.message ?? "Failed to fetch terms");
    } finally {
      setTermsLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, [activeRole, selectedCourse]);

  useEffect(() => {
   
    fetchAvailableCourses();
    fetchAvailableTerms();
  }, [user]);

  const handleBulkGradingStart = (
    assessmentId: string,
    assessmentName: string,
    students: Student[],
  ) => {
    setBulkGradingData({
      assessmentId,
      assessmentName,
      students,
    });
    setShowBulkGrading(true);
  };

  const handleBulkGradingComplete = (result: BulkGradeResult) => {
    setShowBulkGrading(false);
    setBulkGradingData(null);
    // Refresh KPIs after bulk operation
    fetchKpis();
    // Show success/error message
   
  };

  const renderViewContent = () => {
    switch (viewMode) {
      case "workflow":
        return selectedCourse && selectedTermId ? (
          <GradingWorkflowSteps
            course={selectedCourse}
            termId={selectedTermId}
            onStepComplete={(step) => {
             
              fetchKpis(); // Refresh KPIs when steps are completed
            }}
          />
        ) : (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Workflow className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start Grading Workflow
              </h3>
              <p className="text-gray-600 mb-6">
                Select a course and term to begin the 4-step grading process
              </p>
            </div>

            {/* Course and Term Selection */}
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Course Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Course
                    </label>
                    {coursesLoading ? (
                      <div className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
                        <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />
                        <span className="text-sm text-gray-500">
                          Loading courses...
                        </span>
                      </div>
                    ) : availableCourses.length > 0 ? (
                      <select
                        value={selectedCourse?._id || ""}
                        onChange={(e) => {
                          const course = availableCourses.find(
                            (c) => c._id === e.target.value,
                          );
                          setSelectedCourse(course || null);
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Choose a course...</option>
                        {availableCourses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.title} ({course.courseCode}) -{" "}
                            {course.className || course.classId}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-500">
                          No courses available
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Term Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Term
                    </label>
                    {termsLoading ? (
                      <div className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
                        <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />
                        <span className="text-sm text-gray-500">
                          Loading terms...
                        </span>
                      </div>
                    ) : availableTerms.length > 0 ? (
                      <select
                        value={selectedTermId}
                        onChange={(e) => setSelectedTermId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Choose a term...</option>
                        {availableTerms.map((term) => (
                          <option key={term._id} value={term._id}>
                            {term.name} (
                            {new Date(term.startDate).toLocaleDateString()} -{" "}
                            {new Date(term.endDate).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-500">
                          No terms available
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Start Workflow Button */}
                  {selectedCourse && selectedTermId && (
                    <div className="pt-4">
                      <Button
                        onClick={() => {
                          // The workflow will now render since we have both selections
                          // This is just a visual confirmation
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        size="lg"
                      >
                        <Workflow className="h-5 w-5 mr-2" />
                        Start Grading Workflow
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "analytics":
        return (
          <AnalyticsKPITracker
            view={activeRole === "class" ? "class" : "school"}
            entityId={
              activeRole === "class" ? selectedCourse?.classId : undefined
            }
            termId={selectedTermId}
            refreshInterval={30}
          />
        );

      case "legacy":
        return activeRole === "course" ? (
          <CourseTeacherView />
        ) : (
          <ClassTeacherView />
        );

      default: // dashboard
        return (
          <div className="space-y-6">
            {/* Quick Start Guide */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Complete Grading System Guide
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-800">
                      4-Step Grading Process:
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                      <li>Record Assessment Scores</li>
                      <li>Generate Course Grades</li>
                      <li>Create Student Term Summaries</li>
                      <li>Generate Class Reports</li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-800">
                      Available Tools:
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Bulk Grade Entry & CSV Upload</li>
                      <li>• Auto-calculation Features</li>
                      <li>• Real-time Analytics & KPIs</li>
                      <li>• Performance Tracking</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => setViewMode("workflow")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Workflow className="h-4 w-4 mr-2" />
                    Start Workflow
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setViewMode("analytics")}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setViewMode("workflow")}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Workflow className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Grading Workflow</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Follow the complete 4-step grading process with guided
                    automation
                  </p>
                  <Button size="sm" className="w-full">
                    Start Workflow
                  </Button>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() =>
                  handleBulkGradingStart("demo", "Bulk Grading", [])
                }
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-lg flex items-center justify-center">
                    <Upload className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Bulk Grading</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Grade multiple students at once with CSV upload support
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Bulk Grade
                  </Button>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setViewMode("analytics")}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Analytics & KPIs</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    View comprehensive grading analytics and performance metrics
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity - placeholder for future implementation */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Recent Grading Activity</h3>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity to display</p>
                  <p className="text-sm">
                    Start grading to see your activity here
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#F8F8F8] p-3 sm:p-6">
        <SectionHeader
          title="Talim Grading System"
          subtitle="Complete grading workflow with assessment scores, course grades, student summaries, and class reports"
          actions={
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchKpis}
                disabled={loading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-[#F0F0F0] text-[#6F6F6F] hover:bg-[#F8FAFF]"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("legacy")}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Legacy View
              </Button>
            </div>
          }
        />

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Error loading KPIs:</strong> {error}
            </p>
          </div>
        )}

        {/* KPI Dashboard */}
        <div className="rounded-2xl border border-[#E6EDF5] bg-gradient-to-br from-[#F6F9FC] via-white to-[#F8FBFF] p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Assessments */}
            <div className="rounded-xl border border-[#E6EDF5] bg-white/80 p-3 text-left">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[#6F6F6F]">
                <GraduationCap className="h-4 w-4 text-[#003366]" />
                Total Assessments
              </div>
              <div className="mt-1 text-lg sm:text-xl font-semibold text-[#030E18]">
                {loading ? "..." : kpiData.totalAssessments}
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[#EEF3F9]">
                <div className="h-1.5 w-full rounded-full bg-[#003366]" />
              </div>
            </div>

            {/* Students Graded */}
            <div className="rounded-xl border border-green-200 bg-green-50/60 p-3 text-left">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-green-700">
                <Users className="h-4 w-4 text-green-700" />
                Students Graded
              </div>
              <div className="mt-1 text-lg sm:text-xl font-semibold text-green-700">
                {loading ? "..." : kpiData.studentsGraded}
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-green-100">
                <div className="h-1.5 w-3/4 rounded-full bg-green-600" />
              </div>
            </div>

            {/* Average Score */}
            <div className="rounded-xl border border-[#D7E6F6] bg-[#EAF2FB]/60 p-3 text-left">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[#003366]">
                <TrendingUp className="h-4 w-4 text-[#003366]" />
                Average Score
              </div>
              <div className="mt-1 text-lg sm:text-xl font-semibold text-[#003366]">
                {loading ? "..." : `${kpiData.averageScore}%`}
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[#DDEAF7]">
                <div className="h-1.5 w-2/3 rounded-full bg-[#003366]" />
              </div>
            </div>

            {/* Pending Reviews */}
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 text-left">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-orange-700">
                <FileText className="h-4 w-4 text-orange-600" />
                Pending Reviews
              </div>
              <div className="mt-1 text-lg sm:text-xl font-semibold text-orange-700">
                {loading ? "..." : kpiData.pendingReviews}
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-orange-100">
                <div className="h-1.5 w-1/3 rounded-full bg-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium text-[#2F2F2F]">View:</span>
          <div className="flex items-center gap-1 bg-white border border-[#F0F0F0] rounded-xl p-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: Target },
              { id: "workflow", label: "Workflow", icon: Workflow },
              { id: "analytics", label: "Analytics", icon: BarChart3 },
              { id: "legacy", label: "Legacy", icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant="ghost"
                onClick={() => setViewMode(id as ViewMode)}
                className={`flex items-center gap-2 text-sm shadow-none px-3 py-2 ${
                  viewMode === id
                    ? "bg-[#003366] text-white hover:bg-[#002244]"
                    : "text-[#6F6F6F] hover:bg-[#F8FAFF]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>

          {/* Role Toggle */}
          <div className="ml-auto">
            <span className="text-sm font-medium text-[#2F2F2F] mr-3">
              Role:
            </span>
            <div className="inline-flex items-center gap-2 bg-white border border-[#F0F0F0] rounded-xl p-1">
              <Button
                variant="ghost"
                onClick={() => setActiveRole("course")}
                className={`flex items-center gap-2 text-sm shadow-none ${
                  activeRole === "course"
                    ? "bg-[#003366] text-white hover:bg-[#002244]"
                    : "text-[#6F6F6F] hover:bg-[#F8FAFF]"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Course Teacher
              </Button>
              <Button
                variant="ghost"
                onClick={() => setActiveRole("class")}
                className={`flex items-center gap-2 text-sm shadow-none ${
                  activeRole === "class"
                    ? "bg-[#003366] text-white hover:bg-[#002244]"
                    : "text-[#6F6F6F] hover:bg-[#F8FAFF]"
                }`}
              >
                <Users className="h-4 w-4" />
                Class Teacher
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-white shadow-none border-[#F0F0F0] min-h-[500px]">
          <CardContent className={viewMode === "legacy" ? "p-0" : "p-6"}>
            {renderViewContent()}
          </CardContent>
        </Card>

        {/* Bulk Grading Modal */}
        {showBulkGrading && bulkGradingData && selectedCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">
                  Bulk Grading Operations
                </h2>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <BulkGradingOperations
                  courseId={selectedCourse._id}
                  classId={selectedCourse.classId || ""}
                  schoolId={selectedCourse.schoolId || ""}
                  termId={selectedTermId}
                  assessmentId={bulkGradingData.assessmentId}
                  assessmentName={bulkGradingData.assessmentName}
                  students={bulkGradingData.students}
                  onComplete={handleBulkGradingComplete}
                  onCancel={() => setShowBulkGrading(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ImprovedGradingPage;
