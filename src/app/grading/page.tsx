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
import SectionHeader from "@/components/ui/section-header";
import CourseTeacherView from "@/components/grading/CourseTeacherView";
import ClassTeacherView from "@/components/grading/ClassTeacherView";
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
      <div className="min-h-screen bg-[#F8F8F8] p-3 sm:p-6">
        <SectionHeader
          title="Grading"
          subtitle="Manage assessments and class performance with clarity"
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
                variant="default"
                size="sm"
                className="bg-[#003366] text-white hover:bg-[#002244]"
              >
                Batch Upload
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

        <div className="rounded-2xl border border-[#E6EDF5] bg-gradient-to-br from-[#F6F9FC] via-white to-[#F8FBFF] p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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

        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium text-[#2F2F2F]">View as:</span>
          <div className="flex items-center gap-2 bg-white border border-[#F0F0F0] rounded-xl p-1">
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
