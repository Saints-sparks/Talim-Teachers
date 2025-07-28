'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search,
  Filter,
  Edit3,
  Eye,
  Users,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Download,
  TrendingUp,
  GraduationCap,
  Target,
  ArrowLeft,
  BarChart3
} from 'lucide-react';
import { Course } from '@/types/types';
import { Student } from '@/types/grading';
import { 
  AssessmentGradeRecordWithDetails,
  CourseGradeRecordWithDetails
} from '@/types/grade-records';
import { useAppContext } from '@/app/context/AppContext';
import { useAuth } from '@/app/hooks/useAuth';
import { fetchTeacherDetails, getCurrentTerm } from '@/app/services/api.service';
import { gradeRecordsApi } from '@/app/services/grade-records.service';
import TermSelector from '@/components/grading/shared/TermSelector';
import AssessmentGradeForm from '@/components/grading/course/AssessmentGradeForm';

interface Assessment {
  _id: string;
  name: string;
  description?: string;
  termId: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

interface Term {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

const CourseTeacherView: React.FC = () => {
  const { user } = useAppContext();
  const { getAccessToken } = useAuth();
  
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courseGrades, setCourseGrades] = useState<CourseGradeRecordWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'overview' | 'assessment-entry' | 'course-grades'>('overview');
  const [error, setError] = useState<string | null>(null);

  // Load teacher's assigned courses on component mount
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Load term-specific data when term changes
  useEffect(() => {
    if (selectedTerm && selectedCourse) {
      loadTermData();
    }
  }, [selectedTerm, selectedCourse]);

  const loadInitialData = async () => {
    setInitialLoading(true);
    setError(null);
    
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No auth token");

      // Load teacher courses and terms in parallel
      const [teacherData, currentTerm, allTerms] = await Promise.all([
        fetchTeacherDetails(user.userId, token),
        getCurrentTerm(token),
        gradeRecordsApi.getTerms(token)
      ]);

      // Set courses
      if (teacherData.assignedCourses && Array.isArray(teacherData.assignedCourses)) {
        const courses = teacherData.assignedCourses.map((course: any) => ({
          _id: course._id,
          title: course.title,
          courseCode: course.courseCode,
          description: course.description,
          classId: course.classId,
          teacherId: course.teacherId,
          teacherRole: course.teacherRole || 'Academic',
          schoolId: course.schoolId,
          subjectId: course.subjectId,
          className: course.class?.name || course.className
        }));
        setTeacherCourses(courses);
      }

      // Set terms
      setTerms(allTerms);
      
      // Set current term as default
      if (currentTerm) {
        setSelectedTerm(currentTerm._id);
      }
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadTermData = async () => {
    if (!selectedTerm || !selectedCourse) return;
    
    setLoading(true);
    setError(null); // Clear previous errors
    
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No auth token");

      // Load assessments and students for the selected course and term
      const [assessmentsData, studentsData, courseGradesData] = await Promise.all([
        gradeRecordsApi.getAssessmentsForTerm(selectedTerm, token),
        gradeRecordsApi.getStudentsForCourse(selectedCourse._id, token),
        gradeRecordsApi.getCourseGrades(selectedCourse._id, selectedTerm, token)
      ]);

      // Ensure all data is arrays to prevent undefined/null errors
      setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setCourseGrades(Array.isArray(courseGradesData) ? courseGradesData : []);
      
      console.log('Loaded term data:', {
        assessments: assessmentsData?.length || 0,
        students: studentsData?.length || 0,
        courseGrades: courseGradesData?.length || 0
      });
      
    } catch (error) {
      console.error('Error loading term data:', error);
      setError('Failed to load term data. Please try again.');
      
      // Set empty arrays on error to prevent crashes
      setAssessments([]);
      setStudents([]);
      setCourseGrades([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentSelect = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setViewMode('assessment-entry');
  };

  const handleViewCourseGrades = () => {
    setViewMode('course-grades');
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedAssessment(null);
  };

  const getAssessmentStatusBadge = (status: Assessment['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>;
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Active</span>;
      case 'PENDING':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Cancelled</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  const filteredStudents = students.filter(student => {
    const studentName = student.name || '';
    const studentId = student.studentId || '';
    
    return studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           studentId.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (initialLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadInitialData}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Course Teacher Dashboard
          </h2>
          <p className="text-gray-600 mt-1">Manage assessments and course grades</p>
        </div>
        
        {viewMode !== 'overview' && (
          <Button
            variant="outline"
            onClick={handleBackToOverview}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Button>
        )}
      </div>

      {viewMode === 'overview' && (
        <>
          {/* Course Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Select Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {teacherCourses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No courses assigned</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teacherCourses.map(course => (
                      <Card
                        key={course._id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedCourse?._id === course._id 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:border-blue-300'
                        }`}
                        onClick={() => setSelectedCourse(course)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <BookOpen className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{course.title}</h3>
                              <p className="text-sm text-gray-600">{course.courseCode}</p>
                              <p className="text-xs text-gray-500 mt-1">{course.className}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedCourse && (
            <>
              {/* Term Selection */}
              <TermSelector
                terms={terms}
                selectedTerm={selectedTerm}
                onTermChange={setSelectedTerm}
                loading={loading}
              />

              {selectedTerm && (
                <>
                  {/* Quick Actions */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewCourseGrades}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-green-100 rounded-lg">
                            <BarChart3 className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">Course Grades Overview</h3>
                            <p className="text-sm text-gray-600">View and manage course grades</p>
                            <p className="text-xs text-green-600 mt-1">{courseGrades?.length || 0} students graded</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <Target className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">Active Assessments</h3>
                            <p className="text-sm text-gray-600">Ready for grade entry</p>
                            <p className="text-xs text-blue-600 mt-1">
                              {assessments?.filter(a => a.status === 'ACTIVE').length || 0} active
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Assessments List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Assessments for {selectedCourse.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          <p className="text-gray-600">Loading assessments...</p>
                        </div>
                      ) : (assessments?.length || 0) === 0 ? (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">No assessments found for this term</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(assessments || []).map(assessment => (
                            <div
                              key={assessment._id}
                              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Calendar className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">{assessment.name}</h3>
                                  <p className="text-sm text-gray-600">{assessment.description}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(assessment.startDate).toLocaleDateString()} - {new Date(assessment.endDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {getAssessmentStatusBadge(assessment.status)}
                                <Button
                                  size="sm"
                                  onClick={() => handleAssessmentSelect(assessment)}
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                                >
                                  <Edit3 className="h-4 w-4 mr-1" />
                                  Enter Grades
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Assessment Grade Entry */}
      {viewMode === 'assessment-entry' && selectedAssessment && selectedCourse && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Enter Grades: {selectedAssessment.name}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Course: {selectedCourse.title} ({selectedCourse.courseCode})
              </p>
            </CardHeader>
          </Card>

          <AssessmentGradeForm
            students={students}
            assessmentId={selectedAssessment._id}
            courseId={selectedCourse._id}
            classId={selectedCourse.classId}
            schoolId={selectedCourse.schoolId}
            token={getAccessToken() || ''}
            onSave={() => {
              // Reload course grades after saving
              loadTermData();
              handleBackToOverview();
            }}
            onCancel={handleBackToOverview}
          />
        </div>
      )}

      {/* Course Grades Overview */}
      {viewMode === 'course-grades' && selectedCourse && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Course Grades: {selectedCourse.title}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading course grades...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No students found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStudents.map(student => {
                    const studentGrade = courseGrades.find(g => g.studentId === student._id);
                    
                    return (
                      <div
                        key={student._id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{student.name}</h3>
                            <p className="text-sm text-gray-600">{student.studentId}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {studentGrade ? (
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {studentGrade.percentage.toFixed(1)}%
                              </p>
                              <p className="text-xs text-gray-600">
                                Grade: {studentGrade.gradeLevel}
                              </p>
                            </div>
                          ) : (
                            <div className="text-right">
                              <p className="text-sm text-gray-500">No grade</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Auto-calculate course grade
                                  gradeRecordsApi.autoCalculateCourseGrade(
                                    student._id,
                                    selectedCourse._id,
                                    selectedTerm,
                                    getAccessToken() || ''
                                  ).then(() => {
                                    loadTermData();
                                  });
                                }}
                              >
                                Calculate
                              </Button>
                            </div>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CourseTeacherView;
