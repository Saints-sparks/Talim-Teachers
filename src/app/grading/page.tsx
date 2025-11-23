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
} from "lucide-react";
import CourseTeacherView from "@/components/grading/CourseTeacherView-new";
import ClassTeacherView from "@/components/grading/ClassTeacherView-lean";
import { gradeRecordsApi } from "@/app/services/grade-records.service";
import { useAuth } from "@/app/hooks/useAuth";

type TeacherRole = "course" | "class";

interface KpiData {
  totalAssessments: number;
  studentsGraded: number;
  averageScore: number;
  pendingReviews: number;
}

const GradingPage: React.FC = () => {
  const [activeRole, setActiveRole] = useState<TeacherRole>("course");
  const [kpiData, setKpiData] = useState<KpiData>({
    totalAssessments: 0,
    studentsGraded: 0,
    averageScore: 0,
    pendingReviews: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { getAccessToken } = useAuth();

  const fetchKpis = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      // For now, fetch school-wide KPIs
      const data = await gradeRecordsApi.getSchoolKpis(token);

      // Validate/shape the returned data before setting state
      setKpiData({
        totalAssessments: data?.totalAssessments ?? 0,
        studentsGraded: data?.studentsGraded ?? 0,
        averageScore: data?.averageScore ?? 0,
        pendingReviews: data?.pendingReviews ?? 0,
      });
    } catch (err: any) {
      console.error("Error fetching KPIs:", err);
      setError(err?.message ?? "Failed to fetch KPI data");

      // Provide reasonable fallback KPIs so UI still renders
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

  useEffect(() => {
    fetchKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Top row: title + actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Grading</h1>

            {/* Optional role selector (kept minimal here) */}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={fetchKpis}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-[#F0F0F0] text-[#6F6F6F] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh KPIs
            </Button>

            <Button
              variant="default"
              size="sm"
              className="bg-blue-900 text-white px-3 py-2"
            >
              Batch Upload (Excel) <span className="ml-2">📄</span>
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Error loading KPIs:</strong> {error}
            </p>
          </div>
        )}

        {/* Stats Cards Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="overflow-hidden bg-white shadow-none border-[#F0F0F0]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-medium text-gray-900">
                    {loading ? "..." : kpiData.totalAssessments}
                  </div>
                  <p className="text-sm text-[#878787]">Total Assessments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-white shadow-none border-[#F0F0F0]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-medium text-gray-900">
                    {loading ? "..." : kpiData.studentsGraded}
                  </div>
                  <p className="text-sm text-[#878787]">Students Graded</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-white shadow-none border-[#F0F0F0]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-medium text-gray-900">
                    {loading ? "..." : `${kpiData.averageScore}%`}
                  </div>
                  <p className="text-sm text-[#878787]">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-white shadow-none border-[#F0F0F0]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-medium text-gray-900">
                    {loading ? "..." : kpiData.pendingReviews}
                  </div>
                  <p className="text-sm text-[#878787]">Pending Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role Selector */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium text-[#2F2F2F]">View as:</span>
          <div className="flex items-center gap-2">
            <Button
              variant={activeRole === "course" ? "default" : "outline"}
              onClick={() => setActiveRole("course")}
              className={`flex items-center gap-2 text-sm shadow-none ${
                activeRole === "course"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-[#F0F0F0] text-[#6F6F6F] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Course Teacher
            </Button>
            <Button
              variant={activeRole === "class" ? "default" : "outline"}
              onClick={() => setActiveRole("class")}
              className={`flex items-center gap-2 text-sm shadow-none ${
                activeRole === "class"
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "border-[#F0F0F0] text-[#6F6F6F] hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
              }`}
            >
              <Users className="h-4 w-4" />
              Class Teacher
            </Button>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="bg-white shadow-none border-[#F0F0F0] h-fit">
          <CardContent className="p-0">
            {activeRole === "course" ? <CourseTeacherView /> : <ClassTeacherView />}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default GradingPage;
