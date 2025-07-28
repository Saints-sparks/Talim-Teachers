'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  User, 
  BookOpen, 
  TrendingUp, 
  Award,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Student } from '@/types/grading';
import { 
  CourseGradeRecordWithDetails,
  StudentCumulativeWithDetails
} from '@/types/grade-records';
import { gradeRecordsApi } from '@/app/services/grade-records.service';
import GradeDisplay from '@/components/grading/shared/GradeDisplay';

interface StudentGradeSummaryProps {
  student: Student;
  termId: string;
  token: string;
  onBack: () => void;
  onGenerateCumulative?: () => void;
}

const StudentGradeSummary: React.FC<StudentGradeSummaryProps> = ({
  student,
  termId,
  token,
  onBack,
  onGenerateCumulative
}) => {
  const [courseGrades, setCourseGrades] = useState<CourseGradeRecordWithDetails[]>([]);
  const [studentCumulative, setStudentCumulative] = useState<StudentCumulativeWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudentGrades();
  }, [student._id, termId]);

  const loadStudentGrades = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load student's course grades and cumulative record
      const [courseGradesData, cumulativeData] = await Promise.allSettled([
        gradeRecordsApi.getStudentTermGrades(student._id, termId, token),
        gradeRecordsApi.getStudentCumulative(student._id, termId, token)
      ]);

      if (courseGradesData.status === 'fulfilled') {
        setCourseGrades(courseGradesData.value);
      } else {
        console.error('Error loading course grades:', courseGradesData.reason);
      }

      if (cumulativeData.status === 'fulfilled') {
        setStudentCumulative(cumulativeData.value);
      } else {
        console.error('Error loading cumulative data:', cumulativeData.reason);
        setStudentCumulative(null);
      }

    } catch (error) {
      console.error('Error loading student grades:', error);
      setError('Failed to load student grades');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCumulative = async () => {
    setLoading(true);
    try {
      await gradeRecordsApi.autoCalculateStudentCumulative(student._id, termId, token);
      await loadStudentGrades(); // Reload data
      if (onGenerateCumulative) {
        onGenerateCumulative();
      }
    } catch (error) {
      console.error('Error generating cumulative record:', error);
      setError('Failed to generate cumulative record');
    } finally {
      setLoading(false);
    }
  };

  const getOverallStats = () => {
    if (courseGrades.length === 0) {
      return {
        totalCourses: 0,
        averagePercentage: 0,
        totalAssessments: 0,
        highestGrade: null,
        lowestGrade: null
      };
    }

    const validGrades = courseGrades.filter(g => g.percentage > 0);
    const totalPercentage = validGrades.reduce((sum, grade) => sum + grade.percentage, 0);
    const averagePercentage = validGrades.length > 0 ? totalPercentage / validGrades.length : 0;

    return {
      totalCourses: courseGrades.length,
      averagePercentage,
      totalAssessments: courseGrades.reduce((sum, grade) => sum + (grade.assessmentGrades?.length || 0), 0),
      highestGrade: Math.max(...validGrades.map(g => g.percentage)),
      lowestGrade: Math.min(...validGrades.map(g => g.percentage))
    };
  };

  const stats = getOverallStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
                  <p className="text-gray-600">{student.studentId} • {student.email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={loadStudentGrades}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button
                onClick={handleGenerateCumulative}
                disabled={loading || courseGrades.length === 0}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                Generate Cumulative Report
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="text-center">
              <BookOpen className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-600">Courses</p>
              <p className="text-xl font-bold text-blue-700">{stats.totalCourses}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-600">Average</p>
              <p className="text-xl font-bold text-green-700">{stats.averagePercentage.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="text-center">
              <Award className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-purple-600">Assessments</p>
              <p className="text-xl font-bold text-purple-700">{stats.totalAssessments}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-orange-600">Highest</p>
              <p className="text-xl font-bold text-orange-700">
                {stats.highestGrade ? `${stats.highestGrade.toFixed(1)}%` : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-red-500 mx-auto mb-2 transform rotate-180" />
              <p className="text-sm font-medium text-red-600">Lowest</p>
              <p className="text-xl font-bold text-red-700">
                {stats.lowestGrade ? `${stats.lowestGrade.toFixed(1)}%` : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Record */}
      {studentCumulative && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Award className="h-5 w-5" />
              Cumulative Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">Overall Score</p>
                <p className="text-3xl font-bold text-green-600">{studentCumulative.totalScore}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">Percentage</p>
                <p className="text-3xl font-bold text-blue-600">{studentCumulative.percentage.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">Class Position</p>
                <p className="text-3xl font-bold text-purple-600">#{studentCumulative.position}</p>
              </div>
            </div>
            
            {studentCumulative.remarks && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800">Remarks:</p>
                <p className="text-blue-700">{studentCumulative.remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Course Grades */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Grades
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Loading course grades...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <Button onClick={loadStudentGrades} className="mt-2">
                Try Again
              </Button>
            </div>
          ) : courseGrades.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No course grades found</p>
              <p className="text-sm text-gray-500 mt-1">Grades will appear here once assessments are completed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courseGrades.map(courseGrade => (
                <div
                  key={courseGrade._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {courseGrade.course?.title || 'Unknown Course'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {courseGrade.course?.courseCode} • {courseGrade.assessmentGrades?.length || 0} assessments
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <GradeDisplay
                      score={courseGrade.cumulativeScore}
                      maxScore={courseGrade.maxScore}
                      percentage={courseGrade.percentage}
                      gradeLevel={courseGrade.gradeLevel}
                      showDetails={false}
                      size="sm"
                    />
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{courseGrade.percentage.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">{courseGrade.cumulativeScore}/{courseGrade.maxScore}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentGradeSummary;
