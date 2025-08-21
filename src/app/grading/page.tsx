"use client";

import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  GraduationCap,
  BarChart3,
  PenTool,
  Trophy,
  TrendingUp,
  FileText,
} from "lucide-react";
import CourseTeacherView from "@/components/grading/CourseTeacherView-new";
import ClassTeacherView from "@/components/grading/ClassTeacherView-lean";

type TeacherRole = "course" | "class";

const GradingPage: React.FC = () => {
  const [activeRole, setActiveRole] = useState<TeacherRole>("course");

  return (
    <Layout>
      <div className="px-6 py-4 h-full">
        {/* Header Section */}
        <div className="mb-6">
          <h2 className="text-xl font-medium text-[#030E18] mb-2">
            Student Grading
          </h2>
          <p className="text-sm text-[#6F6F6F]">
            Manage assessments and track student performance
          </p>
        </div>

        {/* Stats Cards Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="overflow-hidden bg-white shadow-none border-[#F0F0F0]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-medium text-gray-900">8</div>
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
                  <div className="text-2xl font-medium text-gray-900">24</div>
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
                  <div className="text-2xl font-medium text-gray-900">85%</div>
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
                  <div className="text-2xl font-medium text-gray-900">3</div>
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
            {activeRole === "course" ? (
              <CourseTeacherView />
            ) : (
              <ClassTeacherView />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default GradingPage;
