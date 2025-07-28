'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  X, 
  Save, 
  Calculator, 
  PlusCircle, 
  MinusCircle,
  User,
  BookOpen,
  Calendar,
  Trophy
} from 'lucide-react';
import { Student, Assessment, ScoreComponent, GradeLevel } from '@/types/grading';
import { Course } from '@/types/types';

interface GradeInputFormProps {
  student: Student;
  assessment: Assessment;
  course: Course;
  classId: string;
  onSubmit: (gradeData: any) => void;
  onCancel: () => void;
  existingGrade?: any;
}

const GradeInputForm: React.FC<GradeInputFormProps> = ({
  student,
  assessment,
  course,
  classId,
  onSubmit,
  onCancel,
  existingGrade
}) => {
  const [scores, setScores] = useState<ScoreComponent[]>([
    {
      assessmentType: 'test',
      maxScore: 30,
      actualScore: 0,
      weight: 30
    },
    {
      assessmentType: 'assignment',
      maxScore: 20,
      actualScore: 0,
      weight: 20
    },
    {
      assessmentType: 'exam',
      maxScore: 50,
      actualScore: 0,
      weight: 50
    }
  ]);
  const [remarks, setRemarks] = useState('');
  const [calculatedGrade, setCalculatedGrade] = useState<{
    totalScore: number;
    percentage: number;
    grade: string;
  }>({
    totalScore: 0,
    percentage: 0,
    grade: 'F'
  });

  useEffect(() => {
    if (existingGrade) {
      setScores(existingGrade.scores || scores);
      setRemarks(existingGrade.remarks || '');
    }
  }, [existingGrade]);

  useEffect(() => {
    calculateGrade();
  }, [scores]);

  const calculateGrade = () => {
    const totalWeight = scores.reduce((sum, score) => sum + score.weight, 0);
    
    if (totalWeight === 0) {
      setCalculatedGrade({ totalScore: 0, percentage: 0, grade: 'F' });
      return;
    }

    let weightedScore = 0;
    for (const score of scores) {
      const percentage = (score.actualScore / score.maxScore) * 100;
      weightedScore += (percentage * score.weight) / 100;
    }

    const finalPercentage = Math.round(weightedScore * 100) / 100;
    const grade = determineGradeLevel(finalPercentage);

    setCalculatedGrade({
      totalScore: finalPercentage,
      percentage: finalPercentage,
      grade
    });
  };

  const determineGradeLevel = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'C+';
    if (percentage >= 60) return 'C';
    if (percentage >= 55) return 'D+';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  };

  const updateScore = (index: number, field: keyof ScoreComponent, value: number | string) => {
    const newScores = [...scores];
    newScores[index] = { ...newScores[index], [field]: value };
    setScores(newScores);
  };

  const addScoreComponent = () => {
    setScores([
      ...scores,
      {
        assessmentType: 'quiz',
        maxScore: 10,
        actualScore: 0,
        weight: 10
      }
    ]);
  };

  const removeScoreComponent = (index: number) => {
    if (scores.length > 1) {
      const newScores = scores.filter((_, i) => i !== index);
      setScores(newScores);
    }
  };

  const handleSubmit = () => {
    const totalWeight = scores.reduce((sum, score) => sum + score.weight, 0);
    
    if (Math.abs(totalWeight - 100) > 0.01) {
      alert('Score weights must sum to 100%');
      return;
    }

    const hasInvalidScores = scores.some(score => score.actualScore > score.maxScore);
    if (hasInvalidScores) {
      alert('Actual scores cannot exceed maximum scores');
      return;
    }

    const gradeData = {
      assessmentId: assessment._id,
      studentId: student._id,
      courseId: course._id,
      classId,
      scores,
      remarks: remarks.trim()
    };

    onSubmit(gradeData);
  };

  const getGradeColor = (grade: string) => {
    if (['A+', 'A'].includes(grade)) return 'text-green-600 bg-green-100';
    if (['B+', 'B'].includes(grade)) return 'text-blue-600 bg-blue-100';
    if (['C+', 'C'].includes(grade)) return 'text-yellow-600 bg-yellow-100';
    if (['D+', 'D'].includes(grade)) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const totalWeight = scores.reduce((sum, score) => sum + score.weight, 0);
  const isValidWeight = Math.abs(totalWeight - 100) < 0.01;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-blue-500" />
              Grade Student
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Context Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              <div>
                <p className="font-medium">{student.name}</p>
                <p className="text-gray-600">{student.studentId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-500" />
              <div>
                <p className="font-medium">{course.title}</p>
                <p className="text-gray-600">{course.courseCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <div>
                <p className="font-medium">{assessment.name}</p>
                <p className="text-gray-600">{assessment.status}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Components */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Score Components</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addScoreComponent}
                  className="flex items-center gap-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Component
                </Button>
              </div>

              <div className="space-y-4">
                {scores.map((score, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Component {index + 1}</h4>
                      {scores.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeScoreComponent(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={score.assessmentType}
                          onChange={(e) => updateScore(index, 'assessmentType', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="test">Test</option>
                          <option value="quiz">Quiz</option>
                          <option value="assignment">Assignment</option>
                          <option value="exam">Exam</option>
                          <option value="project">Project</option>
                          <option value="presentation">Presentation</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Score
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={score.maxScore}
                          onChange={(e) => updateScore(index, 'maxScore', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Actual Score
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={score.maxScore}
                          value={score.actualScore}
                          onChange={(e) => updateScore(index, 'actualScore', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weight (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={score.weight}
                          onChange={(e) => updateScore(index, 'weight', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      Score: {score.actualScore}/{score.maxScore} ({Math.round((score.actualScore / score.maxScore) * 100)}%)
                    </div>
                  </div>
                ))}
              </div>

              {/* Weight Validation */}
              <div className={`mt-4 p-3 rounded-lg ${isValidWeight ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Total Weight: {totalWeight}% 
                    {isValidWeight ? ' ✓' : ' (Must equal 100%)'}
                  </span>
                </div>
              </div>

              {/* Remarks */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any additional comments about the student's performance..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            {/* Grade Summary */}
            <div className="lg:col-span-1">
              <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-blue-500" />
                    Grade Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 mb-2">
                        {calculatedGrade.percentage}%
                      </div>
                      <div className={`inline-block px-3 py-1 rounded-full text-lg font-bold ${getGradeColor(calculatedGrade.grade)}`}>
                        Grade {calculatedGrade.grade}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Score:</span>
                        <span className="font-medium">{calculatedGrade.totalScore}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Percentage:</span>
                        <span className="font-medium">{calculatedGrade.percentage}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Components:</span>
                        <span className="font-medium">{scores.length}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Component Breakdown:</h4>
                      <div className="space-y-1">
                        {scores.map((score, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="capitalize">{score.assessmentType}:</span>
                            <span>{score.actualScore}/{score.maxScore} ({score.weight}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleSubmit}
                  disabled={!isValidWeight}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  size="lg"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Grade
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="w-full"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeInputForm;
