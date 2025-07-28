'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Award,
  Save,
  Calculator
} from 'lucide-react';
import { useAppContext } from '@/app/context/AppContext';
import { useAuth } from '@/app/hooks/useAuth';
import { fetchTeacherDetails, getCurrentTerm, getStudentsByClass } from '@/app/services/api.service';
import { gradeRecordsApi } from '@/app/services/grade-records.service';

interface Course {
  _id: string;
  title: string;
  courseCode: string;
  description?: string;
  classId: string;
  teacherId: string;
  teacherRole: 'Academic' | 'Subject';
  schoolId: string;
  subjectId: string;
  className?: string;
}

interface Student {
  _id: string;
  name: string;
  studentId: string;
  email: string;
  userId?: {
    name: string;
    email: string;
  };
}

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

interface CourseGradeRecordWithDetails {
  _id: string;
  courseId: string;
  studentId: string;
  termId: string;
  gradeLevel: string;
  cumulativeScore: number;
  maxScore: number;
  percentage: number;
  assessmentGradeRecords: string[];
  student?: {
    name: string;
    studentId: string;
  };
  course?: {
    title: string;
    courseCode: string;
  };
}

interface AssessmentGrade {
  _id?: string;
  assessmentId: string;
  assessmentName: string;
  actualScore: number;
  maxScore: number;
  isNew?: boolean;
}

interface GradingSession {
  student: Student;
  assessmentGrades: AssessmentGrade[];
  courseGrade?: CourseGradeRecordWithDetails;
}

const CourseTeacherView: React.FC = () => {
  const { user } = useAppContext();
  const { getAccessToken } = useAuth();
  
  // Core state
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  
  // Grading session state
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [gradingSession, setGradingSession] = useState<GradingSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // UI state
  const [viewMode, setViewMode] = useState<'course-selection' | 'student-grading'>('course-selection');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Load course data when course/term selected
  useEffect(() => {
    if (selectedCourse && selectedTerm) {
      loadCourseData();
    }
  }, [selectedCourse, selectedTerm]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No auth token");

      // Load teacher courses and current term
      const [teacherData, currentTerm] = await Promise.all([
        fetchTeacherDetails(user.userId, token),
        getCurrentTerm(token)
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
      if (currentTerm) {
        const termsData = Array.isArray(currentTerm) ? currentTerm : [currentTerm];
        setTerms(termsData);
        setSelectedTerm(currentTerm._id || (Array.isArray(currentTerm) ? currentTerm[0]._id : ''));
      }
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseData = async () => {
    if (!selectedCourse || !selectedTerm) return;
    
    setLoading(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No auth token");

      // Load students and assessments in parallel
      const [studentsData, assessmentsData] = await Promise.all([
        getStudentsByClass(selectedCourse.classId, token),
        gradeRecordsApi.getAssessmentsForTerm(selectedTerm, token)
      ]);

      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);
      
      if (studentsData.length > 0) {
        setCurrentStudentIndex(0);
        await loadStudentGradingSession(studentsData[0]);
      }
      
    } catch (error) {
      console.error('Error loading course data:', error);
      setError('Failed to load course data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentGradingSession = async (student: Student) => {
    try {
      const token = getAccessToken();
      if (!token || !selectedCourse || !selectedTerm) return;

      // Load existing assessment grades for this student
      const existingGrades = await gradeRecordsApi.getStudentTermGrades(
        student._id, 
        selectedTerm, 
        token
      );

      // Filter grades for current course
      const courseGrades = existingGrades.filter(grade => grade.courseId === selectedCourse._id);
      const courseGrade = courseGrades[0] || null;

      // Create assessment grades array
      const assessmentGrades: AssessmentGrade[] = assessments.map(assessment => {
        // Look for existing assessment grade records - courseGrade might have populated records
        const existingRecord = courseGrade?.assessmentGradeRecords?.find((recordId: string) => {
          // For now, we'll need to implement a proper lookup
          // This is a simplified approach
          return false; // Will be replaced with proper implementation
        });

        return {
          _id: undefined, // Will be set when record exists
          assessmentId: assessment._id,
          assessmentName: assessment.name,
          actualScore: 0, // Default value
          maxScore: 100, // Default value
          isNew: true
        };
      });

      setGradingSession({
        student,
        assessmentGrades,
        courseGrade
      });

    } catch (error) {
      console.error('Error loading student grading session:', error);
      setError('Failed to load student grades.');
    }
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setViewMode('student-grading');
  };

  const handleAssessmentGradeChange = (assessmentId: string, field: 'actualScore' | 'maxScore', value: number) => {
    if (!gradingSession) return;

    const updatedGrades = gradingSession.assessmentGrades.map(grade => 
      grade.assessmentId === assessmentId 
        ? { ...grade, [field]: value }
        : grade
    );

    setGradingSession({
      ...gradingSession,
      assessmentGrades: updatedGrades
    });
  };

  const handleSaveStudentGrades = async () => {
    if (!gradingSession || !selectedCourse || !selectedTerm) return;

    setIsSubmitting(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No auth token");

      // Create/update assessment grades
      for (const assessmentGrade of gradingSession.assessmentGrades) {
        if (assessmentGrade.actualScore > 0 || assessmentGrade.maxScore !== 100) {
          if (assessmentGrade.isNew) {
            // Create new assessment grade record
            const createData = {
              courseId: selectedCourse._id,
              studentId: gradingSession.student._id,
              assessmentId: assessmentGrade.assessmentId,
              actualScore: assessmentGrade.actualScore,
              maxScore: assessmentGrade.maxScore
            };
            await gradeRecordsApi.createAssessmentGrade(createData as any, token);
          } else if (assessmentGrade._id) {
            await gradeRecordsApi.updateAssessmentGrade(assessmentGrade._id, {
              actualScore: assessmentGrade.actualScore,
              maxScore: assessmentGrade.maxScore
            }, token);
          }
        }
      }

      // Auto-calculate course grade
      await gradeRecordsApi.autoCalculateCourseGrade(
        gradingSession.student._id,
        selectedCourse._id,
        selectedTerm,
        token
      );

      // Move to next student
      handleNextStudent();

    } catch (error) {
      console.error('Error saving student grades:', error);
      setError('Failed to save grades. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStudent = async () => {
    if (currentStudentIndex < students.length - 1) {
      const nextIndex = currentStudentIndex + 1;
      setCurrentStudentIndex(nextIndex);
      await loadStudentGradingSession(students[nextIndex]);
    } else {
      // All students completed
      setViewMode('course-selection');
      setSelectedCourse(null);
      setGradingSession(null);
      setCurrentStudentIndex(0);
    }
  };

  const handlePreviousStudent = async () => {
    if (currentStudentIndex > 0) {
      const prevIndex = currentStudentIndex - 1;
      setCurrentStudentIndex(prevIndex);
      await loadStudentGradingSession(students[prevIndex]);
    }
  };

  const getAssessmentStatusBadge = (status: Assessment['status']) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'COMPLETED':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Completed</span>;
      case 'ACTIVE':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Active</span>;
      case 'PENDING':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Pending</span>;
      case 'CANCELLED':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Cancelled</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>{error}</p>
              <Button onClick={loadInitialData} className="mt-4">
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
          <h1 className="text-2xl font-bold text-gray-900">Course Teacher Grading</h1>
          <p className="text-gray-600">Grade assessments for your assigned courses</p>
        </div>
        {viewMode === 'student-grading' && (
          <Button 
            variant="outline" 
            onClick={() => setViewMode('course-selection')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Button>
        )}
      </div>

      {/* Course Selection View */}
      {viewMode === 'course-selection' && (
        <div className="space-y-6">
          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teacherCourses.map((course) => (
              <Card 
                key={course._id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleCourseSelect(course)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    {course.courseCode}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{course.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Class: {course.className}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {teacherCourses.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No courses assigned</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Student Grading View */}
      {viewMode === 'student-grading' && selectedCourse && gradingSession && (
        <div className="space-y-6">
          {/* Course Info Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedCourse.title}</h2>
                  <p className="text-gray-600">{selectedCourse.courseCode} • {selectedCourse.className}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    Student {currentStudentIndex + 1} of {students.length}
                  </p>
                  <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all" 
                      style={{ width: `${((currentStudentIndex + 1) / students.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Student Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {gradingSession.student.name}
              </CardTitle>
              <p className="text-gray-600">Student ID: {gradingSession.student.studentId}</p>
            </CardHeader>
            <CardContent>
              {/* Assessment Grades */}
              <div className="space-y-4">
                <h3 className="font-semibold">Assessment Grades</h3>
                
                {gradingSession.assessmentGrades.map((assessmentGrade) => {
                  const assessment = assessments.find(a => a._id === assessmentGrade.assessmentId);
                  return (
                    <div key={assessmentGrade.assessmentId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{assessmentGrade.assessmentName}</h4>
                          {assessment && (
                            <div className="flex items-center gap-2 mt-1">
                              {getAssessmentStatusBadge(assessment.status)}
                              <span className="text-sm text-gray-500">
                                {new Date(assessment.endDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Actual Score
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={assessmentGrade.maxScore}
                            value={assessmentGrade.actualScore}
                            onChange={(e) => handleAssessmentGradeChange(
                              assessmentGrade.assessmentId, 
                              'actualScore', 
                              Number(e.target.value)
                            )}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Score
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={assessmentGrade.maxScore}
                            onChange={(e) => handleAssessmentGradeChange(
                              assessmentGrade.assessmentId, 
                              'maxScore', 
                              Number(e.target.value)
                            )}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-2 text-right">
                        <span className="text-sm text-gray-600">
                          Percentage: {assessmentGrade.maxScore > 0 
                            ? Math.round((assessmentGrade.actualScore / assessmentGrade.maxScore) * 100) 
                            : 0}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Course Grade Summary */}
              {gradingSession.courseGrade && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-600" />
                    Current Course Grade
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Grade:</span>
                      <span className="font-medium ml-2">{gradingSession.courseGrade.gradeLevel}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Score:</span>
                      <span className="font-medium ml-2">
                        {gradingSession.courseGrade.cumulativeScore}/{gradingSession.courseGrade.maxScore}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Percentage:</span>
                      <span className="font-medium ml-2">{gradingSession.courseGrade.percentage}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePreviousStudent}
                  disabled={currentStudentIndex === 0}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous Student
                </Button>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveStudentGrades}
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save & 
                      </>
                    )}
                    {currentStudentIndex === students.length - 1 ? 'Finish' : 'Next Student'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CourseTeacherView;
