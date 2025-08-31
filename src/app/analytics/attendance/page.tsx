"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingCard from "@/components/LoadingCard";
import { useAuth } from "../../hooks/useAuth";
import { getStudentAttendanceKPIs } from "../../services/api.service";

const AttendanceAnalyticsPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const studentId = searchParams.get("studentId");
  const classId = searchParams.get("classId");

  useEffect(() => {
    const loadData = async () => {
      if (!studentId) {
        setError("Student ID is required");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = getAccessToken();
        if (!token) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        // Fetch student attendance KPIs
        const kpiData = await getStudentAttendanceKPIs(studentId, token);

        if (!kpiData) {
          setError("Failed to load attendance data");
          setLoading(false);
          return;
        }

        setStudentData(kpiData);
        console.log("Student attendance KPIs loaded:", kpiData);
      } catch (error) {
        console.error("Error loading student attendance data:", error);
        setError("Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId, classId]); // Removed getAccessToken from dependency array

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-1 bg-[#F8F8F8] text-black min-h-screen">
          <div className="h-full flex-1 flex-col space-y-8 p-4 sm:p-8 flex">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <LoadingCard key={i} height="h-32" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-1 bg-[#F8F8F8] text-black min-h-screen">
          <div className="h-full flex-1 flex-col space-y-8 p-4 sm:p-8 flex">
            <div className="flex items-center space-x-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft size={16} />
              </Button>
            </div>
            <Card className="p-8 text-center border-[#F0F0F0]">
              <CardContent>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-[#030E18] mb-2">
                  Error Loading Data
                </h3>
                <p className="text-[#878787] mb-4">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-[#003366] text-white"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (!studentData) {
    return (
      <Layout>
        <div className="space-y-1 bg-[#F8F8F8] text-black min-h-screen">
          <div className="h-full flex-1 flex-col space-y-8 p-4 sm:p-8 flex">
            <div className="flex items-center space-x-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft size={16} />
               
              </Button>
            </div>
            <Card className="p-8 text-center border-[#F0F0F0]">
              <CardContent>
                <div className="w-16 h-16 bg-[#F8F8F8] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-[#878787]" />
                </div>
                <h3 className="text-xl font-semibold text-[#030E18] mb-2">
                  No Data Available
                </h3>
                <p className="text-[#878787]">
                  No attendance data found for this student
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-1 bg-[#F8F8F8] text-black min-h-screen">
        <div className="h-full flex-1 flex-col space-y-8 p-4 sm:p-8 flex">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={16} />
             
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Attendance Analytics
              </h1>
              <p className="text-gray-600">
                Detailed attendance insights for {studentData?.firstName}{" "}
                {studentData?.lastName}
              </p>
            </div>
          </div>

          {/* Student Info Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-[#003366] to-[#004080] text-white">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold">
                    {studentData?.firstName?.[0]}
                    {studentData?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-white">
                    {studentData?.firstName} {studentData?.lastName}
                  </CardTitle>
                  <p className="text-blue-100">
                    {studentData?.email} | Class: {studentData?.classInfo?.name}
                  </p>
                  {studentData?.termInfo && (
                    <p className="text-blue-100 text-sm">
                      Term: {studentData.termInfo.name}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Attendance Rate
                  </CardTitle>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {studentData?.attendanceRate?.toFixed(1)}%
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        studentData?.attendanceRate || 0,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Days
                  </CardTitle>
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {studentData?.totalDays || 0}
                </div>
                <p className="text-sm text-gray-500 mt-1">School days</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Present Days
                  </CardTitle>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {studentData?.presentDays || 0}
                </div>
                <p className="text-sm text-gray-500 mt-1">Days attended</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Absent Days
                  </CardTitle>
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {studentData?.absentDays || 0}
                </div>
                <p className="text-sm text-gray-500 mt-1">Days missed</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats and Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Range Information */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <span>Analysis Period</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Date Range
                    </h4>
                    <p className="text-sm text-blue-700">
                      <strong>From:</strong>{" "}
                      {studentData?.dateRange?.startDate
                        ? new Date(
                            studentData.dateRange.startDate
                          ).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "N/A"}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>To:</strong>{" "}
                      {studentData?.dateRange?.endDate
                        ? new Date(
                            studentData.dateRange.endDate
                          ).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "N/A"}
                    </p>
                  </div>

                  {studentData?.lateDays !== undefined && (
                    <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                      <h4 className="font-semibold text-yellow-900 mb-2">
                        Additional Metrics
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-yellow-700">
                            <strong>Late Days:</strong> {studentData.lateDays}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-yellow-700">
                            <strong>Excused Days:</strong>{" "}
                            {studentData.excusedDays}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span>Performance Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-lg border-2 ${
                      (studentData?.attendanceRate || 0) >= 90
                        ? "bg-green-50 border-green-200"
                        : (studentData?.attendanceRate || 0) >= 75
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <h4
                      className={`font-semibold mb-2 ${
                        (studentData?.attendanceRate || 0) >= 90
                          ? "text-green-900"
                          : (studentData?.attendanceRate || 0) >= 75
                          ? "text-yellow-900"
                          : "text-red-900"
                      }`}
                    >
                      Attendance Status
                    </h4>
                    <p
                      className={`text-sm ${
                        (studentData?.attendanceRate || 0) >= 90
                          ? "text-green-700"
                          : (studentData?.attendanceRate || 0) >= 75
                          ? "text-yellow-700"
                          : "text-red-700"
                      }`}
                    >
                      {(studentData?.attendanceRate || 0) >= 90
                        ? "✅ Excellent attendance! Keep up the great work."
                        : (studentData?.attendanceRate || 0) >= 75
                        ? "⚠️ Good attendance, but room for improvement."
                        : "❌ Poor attendance. Needs immediate attention."}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Quick Stats
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      <p className="text-sm text-gray-700">
                        <strong>Days Present:</strong>{" "}
                        {studentData?.presentDays || 0} out of{" "}
                        {studentData?.totalDays || 0}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Class:</strong>{" "}
                        {studentData?.classInfo?.name || "N/A"}
                      </p>
                      {studentData?.termInfo && (
                        <p className="text-sm text-gray-700">
                          <strong>Term:</strong> {studentData.termInfo.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AttendanceAnalyticsPage;
