'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import SectionHeader from "@/components/ui/section-header";
import { Course } from '@/types/types';
import { Student } from '@/types/grade-records';
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
import { Tooltip } from '@/components/ui/Tooltip';

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
  const [showCoursePicker, setShowCoursePicker] = useState(true);
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courseGrades, setCourseGrades] = useState<CourseGradeRecordWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'assessments' | 'assessment-entry' | 'course-grades'>('assessments');
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
      const [teacherData, currentTerm, allTerms] = (await Promise.all([
        fetchTeacherDetails(user.userId, token),
        getCurrentTerm(token),
        gradeRecordsApi.getTerms(token),
      ])) as [any, any, any[]];

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

      // Set terms (handle wrapped response shapes)
      const termsData = Array.isArray(allTerms) ? allTerms : [];
      setTerms(termsData);
      
      // Set current term as default
      if (currentTerm?._id) {
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
        gradeRecordsApi.getStudentsForCourse(selectedCourse.classId || selectedCourse._id, token),
        gradeRecordsApi.getCourseGrades(selectedCourse._id, selectedTerm, token)
      ]);

      // Ensure all data is arrays to prevent undefined/null errors
      setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setCourseGrades(Array.isArray(courseGradesData) ? courseGradesData : []);
      
    
      
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

  const handleTermChange = (termId: string) => {
    setSelectedTerm(termId);
    setViewMode('assessments');
  };

  const handleViewCourseGrades = () => {
    setViewMode('course-grades');
  };

  const handleBackToOverview = () => {
    setViewMode('assessments');
    setSelectedAssessment(null);
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setShowCoursePicker(false);
  };

  const filteredCourses = useMemo(() => {
    const q = courseSearch.toLowerCase().trim();
    if (!q) return teacherCourses;
    return teacherCourses.filter((course) => {
      const title = course.title?.toLowerCase() || "";
      const code = course.courseCode?.toLowerCase() || "";
      const className = course.className?.toLowerCase() || "";
      return title.includes(q) || code.includes(q) || className.includes(q);
    });
  }, [teacherCourses, courseSearch]);

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
    <div className="p-5 sm:p-6 space-y-6" data-guide="course-grading-shell">
      <SectionHeader
        title="Course Grading"
        subtitle="Pick a course, then manage assessments and grades"
        icon={<BookOpen className="h-6 w-6 text-[#003366]" />}
        actions={
          viewMode === 'assessment-entry' ? (
            <Button
              variant="outline"
              onClick={handleBackToOverview}
              className="flex items-center gap-2 shadow-none border-[#F0F0F0] text-[#6F6F6F] hover:bg-[#F8FAFF]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : null
        }
      />
      {/* Course Selection */}
      <Card className="bg-white shadow-none border-[#E6EDF5] rounded-2xl" data-guide="course-grading-course-selector">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#030E18]">
                <GraduationCap className="h-5 w-5 text-[#003366]" />
                Select Course
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teacherCourses.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No courses assigned</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center bg-white border border-[#F0F0F0] rounded-xl px-3 py-2 w-full sm:w-[320px]">
                      <Search className="text-[#878787] mr-2" size={18} />
                      <input
                        className="border-0 focus:outline-none flex-1 placeholder:text-[#878787] text-sm bg-transparent"
                        placeholder="Search courses..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                      />
                    </div>
                    {selectedCourse && (
                      <Button
                        variant="outline"
                        className="border-[#F0F0F0] text-[#6F6F6F] hover:bg-[#F8FAFF]"
                        onClick={() => setShowCoursePicker((prev) => !prev)}
                      >
                        {showCoursePicker ? "Hide list" : "Change course"}
                      </Button>
                    )}
                  </div>

                  {selectedCourse && !showCoursePicker ? (
                    <div className="rounded-xl border border-[#E6EDF5] bg-[#F8FBFF] p-4 flex items-start gap-3">
                      <div className="p-2 bg-[#EAF2FB] rounded-lg">
                        <BookOpen className="h-5 w-5 text-[#003366]" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[#030E18]">
                          {selectedCourse.title}
                        </div>
                        <div className="text-sm text-[#6F6F6F]">
                          {selectedCourse.courseCode} • {selectedCourse.className}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-[360px] overflow-auto rounded-xl border border-[#F0F0F0]">
                      {filteredCourses.map((course) => (
                        <button
                          key={course._id}
                          onClick={() => handleCourseSelect(course)}
                          className={`w-full text-left px-4 py-3 border-b border-[#F0F0F0] hover:bg-[#F8FAFF] transition ${
                            selectedCourse?._id === course._id
                              ? "bg-[#EAF2FB]"
                              : "bg-white"
                          }`}
                        >
                          <div className="font-medium text-[#030E18]">
                            {course.title}
                          </div>
                          <div className="text-xs text-[#6F6F6F]">
                            {course.courseCode} • {course.className}
                          </div>
                        </button>
                      ))}
                      {filteredCourses.length === 0 && (
                        <div className="p-4 text-sm text-[#6F6F6F]">
                          No matching courses.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {selectedCourse && (
            <>
              {/* Term Selection */}
              <div data-guide="course-grading-term-selector">
                <TermSelector
                  terms={terms}
                  selectedTerm={selectedTerm}
                  onTermChange={handleTermChange}
                  loading={loading}
                />
              </div>

              {selectedTerm && (
                <>
                  <div className="flex items-center gap-2 bg-white border border-[#F0F0F0] rounded-xl p-1 w-fit" data-guide="course-grading-tabs">
                    <Button
                      variant="ghost"
                      onClick={() => setViewMode("assessments")}
                      className={`text-sm shadow-none ${
                        viewMode === "assessments"
                          ? "bg-[#003366] text-white hover:bg-[#002244]"
                          : "text-[#6F6F6F] hover:bg-[#F8FAFF]"
                      }`}
                    >
                      Assessments
                    </Button>
                    <Tooltip content="Review generated cumulative course grades for this term." side="bottom">
                      <Button
                        variant="ghost"
                        onClick={() => setViewMode("course-grades")}
                        className={`text-sm shadow-none ${
                          viewMode === "course-grades"
                            ? "bg-[#003366] text-white hover:bg-[#002244]"
                            : "text-[#6F6F6F] hover:bg-[#F8FAFF]"
                        }`}
                      >
                        Course Grades
                      </Button>
                    </Tooltip>
                  </div>

                  {viewMode === "assessments" && (
                    <>
                  {/* Quick Actions */}
                  <div className="grid md:grid-cols-2 gap-4" data-guide="course-grading-overview">
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
                  <Card data-guide="course-grading-assessment-list">
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
                                <Tooltip content="Open this assessment to enter student scores." side="left">
                                  <Button
                                    size="sm"
                                    onClick={() => handleAssessmentSelect(assessment)}
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                                  >
                                    <Edit3 className="h-4 w-4 mr-1" />
                                    Enter Grades
                                  </Button>
                                </Tooltip>
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
      {viewMode === 'assessment-entry' && selectedAssessment && selectedCourse && selectedTerm && (
        <div className="space-y-6">
          <Card data-guide="assessment-entry-shell">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-guide="assessment-grading-header">
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
            termId={selectedTerm}
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
      {viewMode === 'course-grades' && selectedCourse && selectedTerm && (
        <div className="space-y-6">
          <Card data-guide="course-grades-overview">
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
              ) : courseGrades.length > 0 && courseGrades.every(g => !g.studentId) ? (
                <div className="space-y-3">
                  {courseGrades.map((grade) => (
                    <div
                      key={grade._id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Unknown student
                        </p>
                        <p className="text-xs text-gray-500">
                          Recorded {new Date(grade.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          {grade.percentage}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {grade.gradeLevel}
                        </p>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-[#6F6F6F]">
                    These records are missing student IDs from the API response.
                  </p>
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
                            {(student.name || 'S').charAt(0)}
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
                                onClick={async () => {
                                  try {
                                    await gradeRecordsApi.autoCalculateCourseGrade(
                                      student._id,
                                      selectedCourse._id,
                                      selectedTerm,
                                      getAccessToken() || '',
                                      selectedCourse.classId
                                    );
                                    await loadTermData();
                                  } catch (err) {
                                    console.error('Failed to calculate course grade:', err);
                                  }
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
