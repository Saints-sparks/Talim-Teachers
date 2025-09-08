"use client";
import Layout from "@/components/Layout";
import { MetricCard } from "@/components/metric-card";
import Timetable from "@/components/Timetable";
import { useTeacherKPIs } from "../hooks/useTeacherKPIs";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

import React from "react";

const DashboardPage: React.FC = () => {
  const { kpis, loading, error, refreshKPIs } = useTeacherKPIs();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#003366]" />
            <p className="text-[#6F6F6F]">Loading dashboard metrics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-[#030E18] mb-2">
              Failed to Load Dashboard
            </h3>
            <p className="text-[#6F6F6F] mb-4 max-w-md mx-auto">{error}</p>
            <Button
              onClick={refreshKPIs}
              className="bg-[#003366] hover:bg-[#002244] text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="p-6 space-y-6">
          {/* Teacher Profile Header */}
          {/* {kpis && (
            <div className="bg-white rounded-xl p-6 border border-[#F1F1F1]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#003366] rounded-full flex items-center justify-center">
                  {kpis.userAvatar ? (
                    <img
                      src={kpis.userAvatar}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-white">
                      {kpis.firstName.charAt(0)}
                      {kpis.lastName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-semibold text-[#030E18] font-manrope">
                    Welcome back, {kpis.firstName} {kpis.lastName}
                  </h1>
                  <p className="text-[#6F6F6F]">{kpis.email}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm bg-[#003366] text-white px-3 py-1 rounded-full">
                      {kpis.specialization}
                    </span>
                    <span className="text-sm text-[#6F6F6F]">
                      {kpis.yearsOfExperience} years experience
                    </span>
                  </div>
                </div>
                <Button
                  onClick={refreshKPIs}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-[#F1F1F1] text-[#6F6F6F] hover:bg-[#003366] hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>
          )} */}

          <div className="flex-grow ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-[#2F2F2F]">Overview</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                icon={
                  <img
                    src="/icons/dashboard/subject.svg"
                    width={52}
                    height={52}
                    alt="Subjects Icon"
                    className="h-[52px] w-[52px]"
                  />
                }
                value={kpis?.assignedSubjects || 0}
                label="Assigned Subjects"
                link="/subjects"
              />
              <MetricCard
                icon={
                  <img
                    src="/icons/dashboard/calendar.svg"
                    alt="Attendance Icon"
                    className="h-[52px] w-[52px]"
                  />
                }
                value={kpis?.assignedClasses || 0}
                label="Assigned Classes"
                link="/classes"
              />
              <MetricCard
                icon={
                  <img
                    src="/icons/dashboard/award.svg"
                    alt="Award Icon"
                    className="h-[52px] w-[52px]"
                  />
                }
                value={kpis?.addedResources || 0}
                label="Added Resources"
                link="/resources"
              />
            </div>

            {/* Additional KPI Metrics */}
            {/* {kpis && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-[#2F2F2F] mb-4">
                  Teaching Statistics
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <img
                          src="/icons/student.svg"
                          alt="Classes Icon"
                          className="w-6 h-6 filter brightness-0 invert"
                        />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-800">
                          {kpis.assignedClasses}
                        </p>
                        <p className="text-sm font-medium text-blue-600">
                          Classes
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                        <img
                          src="/icons/student.svg"
                          alt="Students Icon"
                          className="w-6 h-6 filter brightness-0 invert"
                        />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-800">
                          {kpis.totalStudents}
                        </p>
                        <p className="text-sm font-medium text-green-600">
                          Students
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-lg">📚</span>
                        </div>
                        <div className="text-sm font-medium text-purple-600">
                          Specialization
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-purple-800 truncate">
                        {kpis.specialization}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg">⭐</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-800">
                          {kpis.yearsOfExperience}
                        </p>
                        <p className="text-sm font-medium text-orange-600">
                          Years Exp.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )} */}
          </div>

          {/* Quick Summary */}
          {/* {kpis && (
            <div className="bg-gradient-to-r from-[#003366] to-[#004080] rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Quick Summary</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">
                    {(
                      (kpis.addedResources /
                        Math.max(kpis.assignedSubjects, 1)) *
                      100
                    ).toFixed(0)}
                    %
                  </p>
                  <p className="text-sm text-blue-100">Resource Coverage</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">
                    {Math.round(
                      kpis.totalStudents / Math.max(kpis.assignedClasses, 1)
                    )}
                  </p>
                  <p className="text-sm text-blue-100">Avg Students/Class</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">
                    {(
                      (kpis.recordedAttendance /
                        Math.max(kpis.totalStudents, 1)) *
                      100
                    ).toFixed(0)}
                    %
                  </p>
                  <p className="text-sm text-blue-100">Attendance Rate</p>
                </div>
              </div>
            </div>
          )} */}

          {/* Schedule */}
          <div>
            <Timetable />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
