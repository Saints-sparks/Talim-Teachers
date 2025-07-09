"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, TrendingUp, Users, Clock, CheckCircle, XCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingCard from "@/components/LoadingCard";

const AttendanceAnalyticsPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  
  const studentId = searchParams.get('studentId');
  const classId = searchParams.get('classId');

  useEffect(() => {
    // Simulate loading student attendance data
    const loadData = async () => {
      setLoading(true);
      
      // Mock data - in real implementation, fetch from API
      setTimeout(() => {
        setStudentData({
          name: "John Doe",
          studentId: "ST2024001",
          class: "Grade 10A",
          totalDays: 45,
          presentDays: 42,
          absentDays: 3,
          attendanceRate: 93.3,
          recentAttendance: [
            { date: "2025-07-10", status: "present" },
            { date: "2025-07-09", status: "present" },
            { date: "2025-07-08", status: "absent", reason: "Sick" },
            { date: "2025-07-05", status: "present" },
            { date: "2025-07-04", status: "present" },
          ]
        });
        setLoading(false);
      }, 1000);
    };

    loadData();
  }, [studentId, classId]);

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
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance Analytics</h1>
              <p className="text-gray-600">Detailed attendance insights for {studentData?.name}</p>
            </div>
          </div>

          {/* Student Info Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-white">
                    {studentData?.name}
                  </CardTitle>
                  <p className="text-blue-100">
                    Student ID: {studentData?.studentId} | Class: {studentData?.class}
                  </p>
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
                  {studentData?.attendanceRate}%
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                    style={{ width: `${studentData?.attendanceRate}%` }}
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
                  {studentData?.totalDays}
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
                  {studentData?.presentDays}
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
                  {studentData?.absentDays}
                </div>
                <p className="text-sm text-gray-500 mt-1">Days missed</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Attendance */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span>Recent Attendance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {studentData?.recentAttendance.map((record: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        record.status === 'present' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium text-gray-900">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        record.status === 'present'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {record.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                      {record.reason && (
                        <span className="text-sm text-gray-500">
                          ({record.reason})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AttendanceAnalyticsPage;
