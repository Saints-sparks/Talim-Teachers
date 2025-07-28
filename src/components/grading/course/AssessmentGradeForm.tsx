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
  Edit3
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
  token: string;
  onSave?: (grades: AssessmentGradeRecord[]) => void;
  onCancel?: () => void;
}

interface GradeFormData {
  studentId: string;
  actualScore: number;
  maxScore: number;
  isEditing: boolean;
  error?: string;
  existingGrade?: AssessmentGradeRecordWithDetails;
}

const AssessmentGradeForm: React.FC<AssessmentGradeFormProps> = ({
  students,
  assessmentId,
  courseId,
  classId,
  schoolId,
  token,
  onSave,
  onCancel
}) => {
  const [grades, setGrades] = useState<GradeFormData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultMaxScore, setDefaultMaxScore] = useState<number>(100);
  const [errors, setErrors] = useState<{ [studentId: string]: string }>({});

  // Load existing grades and initialize form
  useEffect(() => {
    loadExistingGrades();
  }, [assessmentId, students]);

  const loadExistingGrades = async () => {
    setLoading(true);
    try {
      const existingGrades = await gradeRecordsApi.getAssessmentGrades(assessmentId, token);
      
      const formData: GradeFormData[] = students.map(student => {
        const existingGrade = existingGrades.find(g => g.studentId === student._id);
        
        return {
          studentId: student._id,
          actualScore: existingGrade?.actualScore || 0,
          maxScore: existingGrade?.maxScore || defaultMaxScore,
          isEditing: !existingGrade, // Edit mode if no existing grade
          existingGrade
        };
      });
      
      setGrades(formData);
    } catch (error) {
      console.error('Error loading existing grades:', error);
      // Initialize with empty grades if loading fails
      const formData: GradeFormData[] = students.map(student => ({
        studentId: student._id,
        actualScore: 0,
        maxScore: defaultMaxScore,
        isEditing: true
      }));
      setGrades(formData);
    } finally {
      setLoading(false);
    }
  };

  const updateGrade = (studentId: string, field: 'actualScore' | 'maxScore', value: number) => {
    setGrades(prev => prev.map(grade => 
      grade.studentId === studentId 
        ? { ...grade, [field]: value, error: undefined }
        : grade
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
    setGrades(prev => prev.map(grade => 
      grade.studentId === studentId 
        ? { ...grade, isEditing: !grade.isEditing }
        : grade
    ));
  };

  const validateGrades = (): boolean => {
    const newErrors: { [studentId: string]: string } = {};
    let isValid = true;

    grades.forEach(grade => {
      if (grade.isEditing) {
        if (grade.maxScore <= 0) {
          newErrors[grade.studentId] = 'Max score must be greater than 0';
          isValid = false;
        } else if (grade.actualScore > grade.maxScore) {
          newErrors[grade.studentId] = 'Actual score cannot exceed max score';
          isValid = false;
        } else if (grade.actualScore < 0) {
          newErrors[grade.studentId] = 'Actual score cannot be negative';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateGrades()) {
      return;
    }

    setSaving(true);
    try {
      const gradesToSave = grades.filter(grade => grade.isEditing);
      const gradeData: CreateAssessmentGradeRecordDto[] = gradesToSave.map(grade => ({
        courseId,
        studentId: grade.studentId,
        assessmentId,
        actualScore: grade.actualScore,
        maxScore: grade.maxScore,
        schoolId,
        classId
      }));

      const result = await gradeRecordsApi.bulkCreateAssessmentGrades(gradeData, token);
      
      if (result.success) {
        // Reload grades to get the updated data
        await loadExistingGrades();
        
        if (onSave) {
          onSave([]);
        }
      } else {
        console.error('Some grades failed to save:', result.errors);
      }
    } catch (error) {
      console.error('Error saving grades:', error);
    } finally {
      setSaving(false);
    }
  };

  const setAllMaxScores = (maxScore: number) => {
    setDefaultMaxScore(maxScore);
    setGrades(prev => prev.map(grade => 
      grade.isEditing ? { ...grade, maxScore } : grade
    ));
  };

  const getGradeLevel = (percentage: number): any => {
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
            <p className="text-gray-600">Loading assessment grades...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assessment Grade Entry
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Default Max Score:</span>
              <input
                type="number"
                value={defaultMaxScore}
                onChange={(e) => setAllMaxScores(Number(e.target.value))}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                min="1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAllMaxScores(defaultMaxScore)}
              >
                Apply to All
              </Button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="space-y-1">
          {grades.map((grade, index) => {
            const student = students.find(s => s._id === grade.studentId);
            if (!student) return null;
            
            const percentage = grade.maxScore > 0 ? (grade.actualScore / grade.maxScore) * 100 : 0;
            const gradeLevel = getGradeLevel(percentage);
            
            return (
              <div
                key={grade.studentId}
                className={`
                  p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors
                  ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}
                `}
              >
                <div className="flex items-center justify-between">
                  {/* Student Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-600">{student.studentId}</p>
                    </div>
                  </div>

                  {/* Grade Input/Display */}
                  <div className="flex items-center gap-4">
                    {grade.isEditing ? (
                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <GradeInput
                            value={grade.actualScore}
                            maxScore={grade.maxScore}
                            onChange={(score) => updateGrade(grade.studentId, 'actualScore', score)}
                            error={errors[grade.studentId]}
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-gray-600 mb-1">Max Score</label>
                          <input
                            type="number"
                            value={grade.maxScore}
                            onChange={(e) => updateGrade(grade.studentId, 'maxScore', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            min="1"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="w-48">
                        <GradeDisplay
                          score={grade.actualScore}
                          maxScore={grade.maxScore}
                          percentage={percentage}
                          gradeLevel={gradeLevel}
                          size="sm"
                        />
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleEditMode(grade.studentId)}
                      className="min-w-[80px]"
                    >
                      {grade.isEditing ? (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </>
                      ) : (
                        <>
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {grades.filter(g => g.isEditing).length} grades to be saved
            </div>
            
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || grades.filter(g => g.isEditing).length === 0}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Grades
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentGradeForm;
