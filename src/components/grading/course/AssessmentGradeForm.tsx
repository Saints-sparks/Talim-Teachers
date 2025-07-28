'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  RefreshCw, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Edit3,
  Calculator,
  BookOpen,
  Plus,
  List,
  TrendingUp
} from 'lucide-react';
import { 
  AssessmentGradeRecord, 
  CreateAssessmentGradeRecordDto,
  AssessmentGradeRecordWithDetails 
} from '@/types/grade-records';
import { Student } from '@/types/grading';
import GradeInput from '@/components/grading/shared/GradeInput';
import GradeDisplay from '@/components/grading/shared/GradeDisplay';
import { gradeRecordsApi } from '@/app/services/grade-records.service';

interface AssessmentGradeFormProps {
  students: Student[];
  assessmentId: string;
  courseId: string;
  classId: string;
  schoolId: string;
  termId?: string;
  token: string;
  onSave?: (grades: AssessmentGradeRecord[]) => void;
  onCancel?: () => void;
}

interface StudentCourseGradeData {
  studentId: string;
  assessmentGrades: AssessmentGradeRecord[];
  courseGradeRecord?: any;
  cumulativeScore: number;
  maxPossibleScore: number;
  percentage: number;
  isSelected: boolean;
  currentAssessmentGrade?: AssessmentGradeRecord;
  isEditingCurrentAssessment: boolean;
  newGradeData?: {
    actualScore: number;
    maxScore: number;
  };
}

const AssessmentGradeForm: React.FC<AssessmentGradeFormProps> = ({
  students,
  assessmentId,
  courseId,
  classId,
  schoolId,
  termId,
  token,
  onSave,
  onCancel
}) => {
  const [studentGradeData, setStudentGradeData] = useState<StudentCourseGradeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [defaultMaxScore, setDefaultMaxScore] = useState<number>(100);
  const [errors, setErrors] = useState<{ [studentId: string]: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  // Helper functions to handle new student data structure
  const getStudentName = (student: any): string => {
    if (student.name && typeof student.name === 'string' && student.name.trim().length > 0) {
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

  const getStudentId = (student: any): string => {
    if (student.studentId && typeof student.studentId === 'string') {
      return student.studentId;
    }
    
    if (student.userId?.email) {
      return student.userId.email;
    }
    
    return 'N/A';
  };

  // Load course assessment data for all students
  useEffect(() => {
    loadCourseAssessmentData();
  }, [courseId, termId, students]);

  const loadCourseAssessmentData = async () => {
    setLoading(true);
    setSaveError(null); // Clear any previous errors
    try {
      if (!termId) {
        throw new Error("Term ID is required to load course assessment data.");
      }

      console.log('Loading course assessment data...', { assessmentId, courseId, termId });

      // Fetch assessment grades for this specific assessment and course
      console.log('Fetching assessment grades...');
      const assessmentGrades = await gradeRecordsApi.getAssessmentGrades(assessmentId, token, courseId);
      console.log('Assessment grades received:', assessmentGrades);
      
      // Fetch all assessment grades for this course to show complete history
      console.log('Fetching all course assessments...');
      const allCourseAssessments = await gradeRecordsApi.getAssessmentGradesByCourse(courseId, token);
      console.log('All course assessments received:', allCourseAssessments);
      
      // Fetch course grade records for this course and term
      console.log('Fetching course grades...');
      const courseGrades = await gradeRecordsApi.getCourseGrades(courseId, termId, token);
      console.log('Course grades received:', courseGrades);
      
      const studentData: StudentCourseGradeData[] = students.map(student => {
        // Get all assessment grades for this student in this course
        const studentAssessmentGrades = allCourseAssessments.filter((grade: any) => {
          // Handle both populated and non-populated studentId
          const gradeStudentId = typeof grade.studentId === 'object' 
            ? grade.studentId._id 
            : grade.studentId;
          return gradeStudentId === student._id;
        });
        
        // Get current assessment grade if exists
        const currentAssessmentGrade = assessmentGrades.find((grade: any) => {
          const gradeStudentId = typeof grade.studentId === 'object' 
            ? grade.studentId._id 
            : grade.studentId;
          const gradeAssessmentId = typeof grade.assessmentId === 'object'
            ? grade.assessmentId._id
            : grade.assessmentId;
          return gradeStudentId === student._id && gradeAssessmentId === assessmentId;
        });
        
        // Get course grade record for this student
        const courseGradeRecord = courseGrades.find((cg: any) => cg.studentId === student._id);
        
        // Calculate cumulative scores from all assessments
        const cumulativeScore = studentAssessmentGrades.reduce((sum: number, grade: any) => 
          sum + grade.actualScore, 0
        );
        const maxPossibleScore = studentAssessmentGrades.reduce((sum: number, grade: any) => 
          sum + grade.maxScore, 0
        );
        const percentage = maxPossibleScore > 0 ? (cumulativeScore / maxPossibleScore) * 100 : 0;
        
        return {
          studentId: student._id,
          assessmentGrades: studentAssessmentGrades,
          courseGradeRecord,
          cumulativeScore,
          maxPossibleScore,
          percentage,
          isSelected: false,
          currentAssessmentGrade,
          isEditingCurrentAssessment: !currentAssessmentGrade,
          newGradeData: currentAssessmentGrade ? {
            actualScore: currentAssessmentGrade.actualScore,
            maxScore: currentAssessmentGrade.maxScore
          } : {
            actualScore: 0,
            maxScore: defaultMaxScore
          }
        };
      });
      
      console.log('Processing student data...', { studentCount: students.length });
      setStudentGradeData(studentData);
      console.log('Student data processed successfully:', studentData);
      
    } catch (error) {
      console.error('Error loading course assessment data:', error);
      
      // More detailed error message
      let errorMessage = 'Failed to load course assessment data. ';
      if (error instanceof Error) {
        errorMessage += `Error: ${error.message}`;
      } else {
        errorMessage += 'Please try again.';
      }
      
      setSaveError(errorMessage);
      
      // Initialize with empty data if loading fails
      const emptyData: StudentCourseGradeData[] = students.map(student => ({
        studentId: student._id,
        assessmentGrades: [],
        cumulativeScore: 0,
        maxPossibleScore: 0,
        percentage: 0,
        isSelected: false,
        isEditingCurrentAssessment: true,
        newGradeData: {
          actualScore: 0,
          maxScore: defaultMaxScore
        }
      }));
      setStudentGradeData(emptyData);
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = (studentId: string) => {
    setSelectedStudentId(selectedStudentId === studentId ? null : studentId);
    setStudentGradeData(prev => prev.map(data => ({
      ...data,
      isSelected: data.studentId === studentId ? !data.isSelected : false
    })));
  };

  const updateCurrentAssessmentGrade = (studentId: string, field: 'actualScore' | 'maxScore', value: number) => {
    setStudentGradeData(prev => prev.map(data => 
      data.studentId === studentId 
        ? { 
            ...data, 
            newGradeData: {
              ...data.newGradeData!,
              [field]: value
            }
          }
        : data
    ));
    
    // Clear any existing error for this student
    if (errors[studentId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[studentId];
        return newErrors;
      });
    }
  };

  const toggleEditMode = (studentId: string) => {
    setStudentGradeData(prev => prev.map(data => 
      data.studentId === studentId 
        ? { ...data, isEditingCurrentAssessment: !data.isEditingCurrentAssessment }
        : data
    ));
  };

  const validateGrades = (): boolean => {
    const newErrors: { [studentId: string]: string } = {};
    let isValid = true;

    studentGradeData.forEach(data => {
      if (data.isEditingCurrentAssessment && data.newGradeData) {
        if (data.newGradeData.maxScore <= 0) {
          newErrors[data.studentId] = 'Max score must be greater than 0';
          isValid = false;
        } else if (data.newGradeData.actualScore > data.newGradeData.maxScore) {
          newErrors[data.studentId] = 'Actual score cannot exceed max score';
          isValid = false;
        } else if (data.newGradeData.actualScore < 0) {
          newErrors[data.studentId] = 'Actual score cannot be negative';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSaveAssessmentGrade = async (studentId: string) => {
    if (!validateGrades()) {
      return;
    }

    setSaving(true);
    try {
      const studentData = studentGradeData.find(data => data.studentId === studentId);
      if (!studentData || !studentData.newGradeData) {
        throw new Error('Student data not found');
      }
      
      const gradeData: CreateAssessmentGradeRecordDto = {
        courseId,
        studentId,
        assessmentId,
        actualScore: studentData.newGradeData.actualScore,
        maxScore: studentData.newGradeData.maxScore,
        schoolId,
        classId
      };

      if (studentData.currentAssessmentGrade) {
        // Update existing grade
        await gradeRecordsApi.updateAssessmentGrade(studentData.currentAssessmentGrade._id, {
          actualScore: studentData.newGradeData.actualScore,
          maxScore: studentData.newGradeData.maxScore
        }, token);
      } else {
        // Create new grade
        await gradeRecordsApi.bulkCreateAssessmentGrades([gradeData], token);
      }
      
      // Reload data to get fresh state
      await loadCourseAssessmentData();
      
    } catch (error) {
      console.error('Error saving assessment grade:', error);
      setSaveError('Failed to save assessment grade. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const createOrUpdateCourseGrade = async (studentId: string) => {
    if (!termId) return;
    
    setSaving(true);
    try {
      const studentData = studentGradeData.find(data => data.studentId === studentId);
      if (!studentData) {
        throw new Error('Student data not found');
      }
      
      await gradeRecordsApi.autoCalculateCourseGrade(studentId, courseId, termId, token);
      
      // Reload data to refresh course grade status
      await loadCourseAssessmentData();
      
    } catch (error) {
      console.error('Error updating course grade record:', error);
      setSaveError('Failed to update course grade record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const bulkCreateCourseGrades = async () => {
    if (!termId) return;
    
    setSaving(true);
    try {
      // Get students who have assessment grades but no course grades
      const studentsToProcess = studentGradeData.filter(data => 
        data.assessmentGrades.length > 0 && !data.courseGradeRecord
      );
      
      if (studentsToProcess.length === 0) {
        setSaveError('No students eligible for course grade creation.');
        return;
      }
      
      // Process each student
      const promises = studentsToProcess.map(async (studentData) => {
        try {
          await gradeRecordsApi.autoCalculateCourseGrade(
            studentData.studentId,
            courseId,
            termId,
            token
          );
          return { success: true, studentId: studentData.studentId };
        } catch (error) {
          console.error(`Failed to create course grade for student ${studentData.studentId}:`, error);
          return { success: false, studentId: studentData.studentId, error };
        }
      });
      
      const results = await Promise.all(promises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (successful > 0) {
        await loadCourseAssessmentData();
        
        if (failed === 0) {
          setSaveError(null);
        } else {
          setSaveError(`Created ${successful} course grades successfully. ${failed} failed.`);
        }
      } else if (failed > 0) {
        setSaveError(`Failed to create course grades for ${failed} students.`);
      }
      
    } catch (error) {
      console.error('Error in bulk course grade creation:', error);
      setSaveError('Failed to create course grades. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const setAllMaxScores = (maxScore: number) => {
    setDefaultMaxScore(maxScore);
    setStudentGradeData(prev => prev.map(data => 
      data.isEditingCurrentAssessment ? { 
        ...data, 
        newGradeData: {
          ...data.newGradeData!,
          maxScore
        }
      } : data
    ));
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading course assessment data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedStudent = selectedStudentId 
    ? studentGradeData.find(data => data.studentId === selectedStudentId)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Assessment Grading
            <span className="text-sm font-normal text-gray-500">
              ({students.length} students)
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Max Score:</span>
              <input
                type="number"
                value={defaultMaxScore}
                onChange={(e) => setAllMaxScores(Number(e.target.value))}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                min="1"
              />
            </div>
            
            {/* Bulk Create Course Grades Button */}
            {studentGradeData.filter(data => data.assessmentGrades.length > 0 && !data.courseGradeRecord).length > 0 && (
              <Button
                size="sm"
                onClick={bulkCreateCourseGrades}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Calculator className="h-4 w-4 mr-1" />
                Create Course Grades ({studentGradeData.filter(data => data.assessmentGrades.length > 0 && !data.courseGradeRecord).length})
              </Button>
            )}
          </div>
        </CardTitle>
        
        {/* Error Display */}
        {saveError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{saveError}</span>
              <button
                onClick={() => setSaveError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        {/* Summary Stats */}
        <div className="flex items-center gap-6 text-sm text-gray-600 mt-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>
              {studentGradeData.filter(data => data.currentAssessmentGrade).length} assessed for this assignment
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span>
              {studentGradeData.filter(data => !data.currentAssessmentGrade).length} pending
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span>
              {studentGradeData.filter(data => data.courseGradeRecord).length} have course grades
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6">
          {/* Students List */}
          <div className="xl:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Students</h3>
              <span className="text-sm text-gray-500">
                {studentGradeData.filter(data => data.currentAssessmentGrade).length}/{studentGradeData.length} graded
              </span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {studentGradeData.map((data) => {
                const student = students.find(s => s._id === data.studentId);
                if (!student) return null;
                
                return (
                  <div
                    key={data.studentId}
                    className={`
                      p-3 border rounded-lg cursor-pointer transition-all
                      ${data.isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                    onClick={() => selectStudent(data.studentId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          data.currentAssessmentGrade 
                            ? 'bg-gradient-to-r from-green-400 to-green-500' 
                            : 'bg-gradient-to-r from-gray-400 to-gray-500'
                        }`}>
                          {getStudentName(student).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 truncate">{getStudentName(student)}</h4>
                          <p className="text-xs text-gray-600 truncate">{getStudentId(student)}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        {/* Assessment Status */}
                        {data.currentAssessmentGrade ? (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                            ✓ {data.currentAssessmentGrade.actualScore}/{data.currentAssessmentGrade.maxScore}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                            Not Graded
                          </span>
                        )}
                        
                        {/* Course Grade Status */}
                        {data.courseGradeRecord && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                            Course ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Student Detail */}
          <div className="xl:col-span-2">
            {selectedStudent ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {getStudentName(students.find(s => s._id === selectedStudent.studentId)!)}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedStudentId(null)}
                  >
                    Close
                  </Button>
                </div>

                {/* Assessment History for this Course */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">Assessment History</h4>
                  {selectedStudent.assessmentGrades.length > 0 ? (
                    <div className="grid gap-3">
                      {selectedStudent.assessmentGrades.map((grade: any) => (
                        <div 
                          key={grade._id} 
                          className={`p-3 border rounded-lg ${
                            (typeof grade.assessmentId === 'object' ? grade.assessmentId._id : grade.assessmentId) === assessmentId
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {(typeof grade.assessmentId === 'object' ? grade.assessmentId._id : grade.assessmentId) === assessmentId 
                                  ? 'Current Assessment' 
                                  : 'Previous Assessment'
                                }
                              </p>
                              <p className="text-xs text-gray-600">
                                {typeof grade.assessmentId === 'object' && grade.assessmentId.name 
                                  ? grade.assessmentId.name 
                                  : 'Assessment'
                                }
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{grade.actualScore}/{grade.maxScore}</div>
                              <div className="text-xs text-gray-600">
                                {((grade.actualScore / grade.maxScore) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No assessment grades recorded yet</p>
                  )}
                </div>

                {/* Current Assessment Grade Entry */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-gray-800">Current Assessment Grade</h4>
                  
                  {selectedStudent.isEditingCurrentAssessment ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Actual Score</label>
                          <GradeInput
                            value={selectedStudent.newGradeData?.actualScore || 0}
                            maxScore={selectedStudent.newGradeData?.maxScore || defaultMaxScore}
                            onChange={(score) => updateCurrentAssessmentGrade(selectedStudent.studentId, 'actualScore', score)}
                            error={errors[selectedStudent.studentId]}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
                          <input
                            type="number"
                            value={selectedStudent.newGradeData?.maxScore || defaultMaxScore}
                            onChange={(e) => updateCurrentAssessmentGrade(selectedStudent.studentId, 'maxScore', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            min="1"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => handleSaveAssessmentGrade(selectedStudent.studentId)}
                          disabled={saving}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {saving ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Grade
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => toggleEditMode(selectedStudent.studentId)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : selectedStudent.currentAssessmentGrade ? (
                    <div className="space-y-4">
                      <GradeDisplay
                        score={selectedStudent.currentAssessmentGrade.actualScore}
                        maxScore={selectedStudent.currentAssessmentGrade.maxScore}
                        percentage={((selectedStudent.currentAssessmentGrade.actualScore / selectedStudent.currentAssessmentGrade.maxScore) * 100)}
                        gradeLevel={getGradeLevel(((selectedStudent.currentAssessmentGrade.actualScore / selectedStudent.currentAssessmentGrade.maxScore) * 100)) as any}
                        size="lg"
                      />
                      <Button
                        variant="outline"
                        onClick={() => toggleEditMode(selectedStudent.studentId)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Grade
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                      <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No grade recorded</p>
                      <Button
                        className="mt-3"
                        onClick={() => toggleEditMode(selectedStudent.studentId)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Grade
                      </Button>
                    </div>
                  )}
                </div>

                {/* Course Grade Management */}
                {selectedStudent.currentAssessmentGrade && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium text-gray-800">Course Grade Record</h4>
                    
                    {selectedStudent.courseGradeRecord ? (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-purple-800">Course Grade Calculated</p>
                            <p className="text-sm text-purple-600">
                              Based on {selectedStudent.assessmentGrades.length} assessments
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => createOrUpdateCourseGrade(selectedStudent.studentId)}
                            disabled={saving}
                            className="text-purple-600 border-purple-300 hover:bg-purple-50"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Update
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-blue-800">Ready for Course Grade</p>
                            <p className="text-sm text-blue-600">
                              Create course grade from {selectedStudent.assessmentGrades.length} assessments
                            </p>
                          </div>
                          <Button
                            onClick={() => createOrUpdateCourseGrade(selectedStudent.studentId)}
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Calculator className="h-4 w-4 mr-2" />
                            Calculate
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <List className="h-16 w-16 mx-auto mb-6 opacity-50" />
                <p className="text-lg font-medium">Select a student</p>
                <p className="text-sm">View and manage their assessment grades and course record</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {onCancel && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Manage individual student assessment grades and course records
              </div>
              
              <Button variant="outline" onClick={onCancel}>
                Close
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssessmentGradeForm;
