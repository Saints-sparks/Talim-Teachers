'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  BarChart3,
  PenTool,
  Trophy
} from 'lucide-react';
import CourseTeacherView from '@/components/grading/CourseTeacherView-new';
import ClassTeacherView from '@/components/grading/ClassTeacherView-lean';

type TeacherRole = 'course' | 'class';

const GradingPage: React.FC = () => {
  const [activeRole, setActiveRole] = useState<TeacherRole>('course');

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              Grading System
            </h1>
            <p className="text-gray-600 mt-1">Manage assessments and track student performance</p>
          </div>
          
          {/* Role Selector */}
          <div className="flex items-center gap-2">
            <Button
              variant={activeRole === 'course' ? 'default' : 'outline'}
              onClick={() => setActiveRole('course')}
              className={`flex items-center gap-2 ${
                activeRole === 'course' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' 
                  : 'border-blue-200 text-blue-600 hover:bg-blue-50'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Course Teacher
            </Button>
            <Button
              variant={activeRole === 'class' ? 'default' : 'outline'}
              onClick={() => setActiveRole('class')}
              className={`flex items-center gap-2 ${
                activeRole === 'class' 
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' 
                  : 'border-purple-200 text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Users className="h-4 w-4" />
              Class Teacher
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border">
          {activeRole === 'course' ? (
            <CourseTeacherView />
          ) : (
            <ClassTeacherView />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default GradingPage;
