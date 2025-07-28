'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  Trophy, 
  Target,
  Calendar,
  BarChart3,
  User
} from 'lucide-react';
import { Student, GradeAnalytics, GradeLevel } from '@/types/grading';

interface StudentAnalyticsCardProps {
  student: Student;
  analytics: GradeAnalytics;
  onBack: () => void;
}

const StudentAnalyticsCard: React.FC<StudentAnalyticsCardProps> = ({
  student,
  analytics,
  onBack
}) => {
  const getGradeColor = (grade: GradeLevel | string) => {
    if (['A+', 'A'].includes(grade)) return 'text-green-600 bg-green-100 border-green-200';
    if (['B+', 'B'].includes(grade)) return 'text-blue-600 bg-blue-100 border-blue-200';
    if (['C+', 'C'].includes(grade)) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    if (['D+', 'D'].includes(grade)) return 'text-orange-600 bg-orange-100 border-orange-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getPerformanceTrend = (course: any) => {
    if (course.grades.length < 2) return null;
    
    const recent = course.grades[0].percentage;
    const previous = course.grades[1].percentage;
    const diff = recent - previous;
    
    if (diff > 5) return { icon: TrendingUp, color: 'text-green-500', text: `+${diff.toFixed(1)}%` };
    if (diff < -5) return { icon: TrendingDown, color: 'text-red-500', text: `${diff.toFixed(1)}%` };
    return { icon: TrendingUp, color: 'text-gray-500', text: 'Stable' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Class
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
            {student.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
            <p className="text-gray-600">{student.studentId} • Detailed Performance Analytics</p>
          </div>
        </div>
      </div>

      {/* Overall Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-600">Overall Average</p>
            <p className="text-2xl font-bold text-blue-700">{analytics.overallAverage}%</p>
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getGradeColor(analytics.overallGrade)}`}>
              Grade {analytics.overallGrade}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-600">Total Courses</p>
            <p className="text-2xl font-bold text-green-700">{analytics.totalCourses}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-600">Assessments</p>
            <p className="text-2xl font-bold text-purple-700">{analytics.totalAssessments}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-orange-600">Generated</p>
            <p className="text-sm font-bold text-orange-700">{formatDate(analytics.generatedAt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Course Performance Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.courseAnalytics.map((course) => {
              const trend = getPerformanceTrend(course);
              return (
                <div key={course._id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{course.courseName}</h3>
                      <p className="text-sm text-gray-600">{course.courseCode}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">{course.averagePercentage}%</span>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(course.averageGrade)}`}>
                          {course.averageGrade}
                        </div>
                      </div>
                      {trend && (
                        <div className={`flex items-center gap-1 text-xs ${trend.color} mt-1`}>
                          <trend.icon className="h-3 w-3" />
                          <span>{trend.text}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Course Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-gray-600">Highest</p>
                      <p className="font-bold text-green-600">{course.highestScore}%</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-gray-600">Lowest</p>
                      <p className="font-bold text-red-600">{course.lowestScore}%</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-gray-600">Tests</p>
                      <p className="font-bold text-blue-600">{course.totalAssessments}</p>
                    </div>
                  </div>

                  {/* Recent Grades */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Assessments:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {course.grades.slice(0, 3).map((grade, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 truncate">{grade.assessmentName}</span>
                            <div className={`px-1 py-0.5 rounded text-xs font-medium ${getGradeColor(grade.grade)}`}>
                              {grade.grade}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-medium">{grade.percentage}%</span>
                            <span className="text-xs text-gray-500">{formatDate(grade.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Strengths
              </h4>
              <ul className="space-y-1 text-sm text-green-700">
                {analytics.courseAnalytics
                  .filter(course => course.averagePercentage >= 80)
                  .slice(0, 3)
                  .map(course => (
                    <li key={course._id}>• Excellent performance in {course.courseName} ({course.averagePercentage}%)</li>
                  ))}
                {analytics.overallAverage >= 85 && (
                  <li>• Consistently high academic performance across all subjects</li>
                )}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Areas for Improvement
              </h4>
              <ul className="space-y-1 text-sm text-orange-700">
                {analytics.courseAnalytics
                  .filter(course => course.averagePercentage < 70)
                  .slice(0, 3)
                  .map(course => (
                    <li key={course._id}>• Focus needed in {course.courseName} ({course.averagePercentage}%)</li>
                  ))}
                {analytics.courseAnalytics.every(course => course.averagePercentage >= 70) && (
                  <li>• Maintain current performance levels across all subjects</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAnalyticsCard;
