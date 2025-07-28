'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen,
  Users,
  GraduationCap,
  ArrowRight,
  Settings,
  Clock
} from 'lucide-react';
import { useAppContext } from '@/app/context/AppContext';
import CourseTeacherView from './CourseTeacherView-lean';
import ClassTeacherView from './ClassTeacherView-lean';

type TeacherRole = 'course-teacher' | 'class-teacher' | 'both';
type ViewMode = 'role-selection' | 'course-grading' | 'class-management';

const GradingDashboard: React.FC = () => {
  const { user, classes, isLoading } = useAppContext();
  
  const [teacherRole, setTeacherRole] = useState<TeacherRole | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('role-selection');

  // Determine teacher role based on context
  useEffect(() => {
    if (user && classes) {
      // If user has classes assigned, they can be a class teacher
      const canBeClassTeacher = classes.length > 0;
      
      // For now, assume all teachers can be course teachers
      // In a real implementation, you'd check assignedCourses
      const canBeCourseTeacher = true;
      
      if (canBeClassTeacher && canBeCourseTeacher) {
        setTeacherRole('both');
      } else if (canBeClassTeacher) {
        setTeacherRole('class-teacher');
        setViewMode('class-management');
      } else if (canBeCourseTeacher) {
        setTeacherRole('course-teacher');
        setViewMode('course-grading');
      }
    }
  }, [user, classes]);

  const handleRoleSelect = (role: 'course-grading' | 'class-management') => {
    setViewMode(role);
  };

  const handleBackToSelection = () => {
    setViewMode('role-selection');
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Role Selection View (only shown if teacher has both roles)
  if (viewMode === 'role-selection' && teacherRole === 'both') {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Grading Dashboard</h1>
          <p className="text-gray-600 text-lg">Choose your grading responsibility</p>
        </div>

        {/* Role Cards */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Course Teacher Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => handleRoleSelect('course-grading')}
          >
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Course Teacher</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Grade individual assessments and manage course-specific grades for your assigned subjects.
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  Create assessment grade records
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  Auto-calculate course grades
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  Student-by-student grading workflow
                </div>
              </div>
              
              <Button className="w-full flex items-center justify-center gap-2">
                Start Course Grading
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Class Teacher Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => handleRoleSelect('class-management')}
          >
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Class Teacher</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                View student cumulative grades, manage class performance, and generate term reports.
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  View student course grades
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  Generate cumulative grades
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  Class performance analytics
                </div>
              </div>
              
              <Button className="w-full flex items-center justify-center gap-2">
                Manage Class Grades
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Your Teaching Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{classes?.length || 0}</p>
                  <p className="text-sm text-gray-600">Classes Assigned</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">-</p>
                  <p className="text-sm text-gray-600">Courses Teaching</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">-</p>
                  <p className="text-sm text-gray-600">Students Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Course Grading View
  if (viewMode === 'course-grading') {
    return (
      <div>
        {teacherRole === 'both' && (
          <div className="p-6 pb-0">
            <Button 
              variant="outline" 
              onClick={handleBackToSelection}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Switch Role
            </Button>
          </div>
        )}
        <CourseTeacherView />
      </div>
    );
  }

  // Class Management View
  if (viewMode === 'class-management') {
    return (
      <div>
        {teacherRole === 'both' && (
          <div className="p-6 pb-0">
            <Button 
              variant="outline" 
              onClick={handleBackToSelection}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Switch Role
            </Button>
          </div>
        )}
        <ClassTeacherView />
      </div>
    );
  }

  // Fallback for no role
  return (
    <div className="p-6">
      <Card>
        <CardContent className="pt-6 text-center">
          <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">No Teaching Assignments</h2>
          <p className="text-gray-600">
            You don't have any classes or courses assigned yet. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradingDashboard;
