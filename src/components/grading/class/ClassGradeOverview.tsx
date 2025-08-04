'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Calculator, 
  RefreshCw,
  Download,
  Filter,
  Search,
  CheckCircle,
  AlertCircle,
  Award,
  BarChart3,
  PieChart,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { gradeRecordsApi } from '@/app/services/grade-records.service';

interface Student {
  _id: string;
  name: string;
  studentId: string;
  email: string;
  userId?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Course {
  _id: string;
  title: string;
  courseCode: string;
  description?: string;
}

interface CourseGradeRecord {
  _id: string;
  courseId: string;
  studentId: string;
  termId: string;
  cumulativeScore: number;
  maxScore: number;
  percentage: number;
  gradeLevel: string;
  assessmentGradeRecords: string[];
  course?: Course;
}

interface StudentGradeOverview {
  student: Student;
  courseGrades: CourseGradeRecord[];
  totalCourses: number;
  completedCourses: number;
  averagePercentage: number;
  overallGradeLevel: string;
}

interface ClassGradeOverviewProps {
  classId: string;
  termId: string;
  token: string;
}

const ClassGradeOverview: React.FC<ClassGradeOverviewProps> = ({
  classId,
  termId,
  token
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentGradeOverviews, setStudentGradeOverviews] = useState<StudentGradeOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClassGradeData();
  }, [classId, termId]);

  const loadClassGradeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load students, courses, and course grade records
      const [studentsData, coursesData] = await Promise.all([
        // Assuming these API methods exist
        gradeRecordsApi.getStudentsByClass(classId, token),
        gradeRecordsApi.getCoursesByClass(classId, token)
      ]);

      setStudents(studentsData || []);
      setCourses(coursesData || []);

      // Load course grade records for all students and courses
      const gradeOverviews: StudentGradeOverview[] = await Promise.all(
        (studentsData || []).map(async (student: Student) => {
          try {
            // Get all course grades for this student in this term
            const courseGrades = await gradeRecordsApi.getStudentTermGrades(
              student._id,
              termId,
              token
            );

            // Filter for courses in this class
            const classGrades = courseGrades.filter((grade: any) => 
              (coursesData || []).some((course: Course) => course._id === grade.courseId)
            );

            // Calculate overview statistics
            const completedCourses = classGrades.length;
            const totalCourses = coursesData?.length || 0;
            const averagePercentage = completedCourses > 0 
              ? classGrades.reduce((sum: number, grade: any) => sum + grade.percentage, 0) / completedCourses
              : 0;
            const overallGradeLevel = getGradeLevel(averagePercentage);

            return {
              student,
              courseGrades: classGrades,
              totalCourses,
              completedCourses,
              averagePercentage,
              overallGradeLevel
            };
          } catch (error) {
            console.error(`Error loading grades for student ${student._id}:`, error);
            return {
              student,
              courseGrades: [],
              totalCourses: coursesData?.length || 0,
              completedCourses: 0,
              averagePercentage: 0,
              overallGradeLevel: 'N/A'
            };
          }
        })
      );

      setStudentGradeOverviews(gradeOverviews);

    } catch (error) {
      console.error('Error loading class grade data:', error);
      setError('Failed to load class grade data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getGradeLevel = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'B+';
    if (percentage >= 75) return 'B';
    if (percentage >= 70) return 'C+';
    if (percentage >= 65) return 'C';
    if (percentage >= 60) return 'D+';
    if (percentage >= 55) return 'D';
    if (percentage >= 50) return 'E';
    return 'F';
  };

  const getGradeColor = (gradeLevel: string): string => {
    switch (gradeLevel) {
      case 'A+':
      case 'A':
        return 'text-green-600 bg-green-100';
      case 'B+':
      case 'B':
        return 'text-blue-600 bg-blue-100';
      case 'C+':
      case 'C':
        return 'text-yellow-600 bg-yellow-100';
      case 'D+':
      case 'D':
        return 'text-orange-600 bg-orange-100';
      case 'E':
      case 'F':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStudentName = (student: Student): string => {
    if (student.name && student.name.trim().length > 0) {
      return student.name;
    }
    
    if (student.userId?.firstName || student.userId?.lastName) {
      const firstName = student.userId.firstName || '';
      const lastName = student.userId.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName.length > 0) {
        return fullName;
      }
    }
    
    return 'Unknown Student';
  };

  const filteredStudents = studentGradeOverviews.filter(overview => {
    const matchesSearch = getStudentName(overview.student)
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      overview.student.studentId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = selectedFilter === 'all' ||
      (selectedFilter === 'completed' && overview.completedCourses === overview.totalCourses) ||
      (selectedFilter === 'pending' && overview.completedCourses < overview.totalCourses);

    return matchesSearch && matchesFilter;
  });

  const classStats = {
    totalStudents: studentGradeOverviews.length,
    fullyCompleted: studentGradeOverviews.filter(s => s.completedCourses === s.totalCourses).length,
    partiallyCompleted: studentGradeOverviews.filter(s => s.completedCourses > 0 && s.completedCourses < s.totalCourses).length,
    notStarted: studentGradeOverviews.filter(s => s.completedCourses === 0).length,
    classAverage: studentGradeOverviews.length > 0 
      ? studentGradeOverviews.reduce((sum, s) => sum + s.averagePercentage, 0) / studentGradeOverviews.length
      : 0
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading class grade overview...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-4" />
            <p>{error}</p>
            <Button onClick={loadClassGradeData} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Class Grade Overview</h2>
          <p className="text-gray-600">Complete view of all student course grades</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button variant="outline" onClick={loadClassGradeData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Class Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{classStats.totalStudents}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{classStats.fullyCompleted}</div>
                <div className="text-sm text-gray-600">Fully Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{classStats.partiallyCompleted}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{classStats.classAverage.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Class Average</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Students</option>
            <option value="completed">Fully Completed</option>
            <option value="pending">Pending Grades</option>
          </select>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredStudents.map((overview) => (
          <Card key={overview.student._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    overview.completedCourses === overview.totalCourses
                      ? 'bg-gradient-to-br from-green-400 to-green-600'
                      : overview.completedCourses > 0
                        ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                        : 'bg-gradient-to-br from-gray-400 to-gray-600'
                  }`}>
                    {getStudentName(overview.student).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{getStudentName(overview.student)}</h3>
                    <p className="text-sm text-gray-600">{overview.student.studentId}</p>
                  </div>
                </div>
                
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(overview.overallGradeLevel)}`}>
                  {overview.overallGradeLevel}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Progress Summary */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Course Progress</span>
                  <span className="font-medium">
                    {overview.completedCourses}/{overview.totalCourses} courses
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      overview.completedCourses === overview.totalCourses
                        ? 'bg-gradient-to-r from-green-400 to-green-500'
                        : 'bg-gradient-to-r from-orange-400 to-orange-500'
                    }`}
                    style={{ 
                      width: `${overview.totalCourses > 0 ? (overview.completedCourses / overview.totalCourses) * 100 : 0}%` 
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Average Score</span>
                  <span className="font-medium">{overview.averagePercentage.toFixed(1)}%</span>
                </div>
              </div>

              {/* Course Grades */}
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Course Grades</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {courses.map((course) => {
                    const courseGrade = overview.courseGrades.find(grade => grade.courseId === course._id);
                    return (
                      <div key={course._id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate flex-1 mr-2">{course.courseCode}</span>
                        {courseGrade ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{courseGrade.percentage.toFixed(0)}%</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getGradeColor(courseGrade.gradeLevel)}`}>
                              {courseGrade.gradeLevel}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Pending</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t">
                <Button variant="outline" className="w-full text-sm" size="sm">
                  <Eye className="h-3 w-3 mr-2" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No students found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassGradeOverview;
