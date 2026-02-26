"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Clock,
  Users,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Eye,
  Calculator,
  Download,
  RefreshCw,
  AlertCircle,
  Target,
} from "lucide-react";
import Badge from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Course } from "@/types/types";
import { Assessment } from "@/app/services/assessment-management.service";
import { gradeRecordsApi } from "@/app/services/grade-records.service";
import { useAuth } from "@/app/hooks/useAuth";

interface GradingWorkflowStepProps {
  course: Course;
  termId: string;
  onStepComplete?: (step: number) => void;
}

/**
 * Complete Grading Workflow Component
 * Guides teachers through the 4-step grading process:
 * 1. Assessment Scores → 2. Course Grades → 3. Student Term Grades → 4. Class Reports
 */
const GradingWorkflowSteps: React.FC<GradingWorkflowStepProps> = ({
  course,
  termId,
  onStepComplete,
}) => {
  const { getAccessToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState({
    assessments: [] as Assessment[],
    assessmentGrades: [] as any[],
    courseGrades: [] as any[],
    studentTermGrades: [] as any[],
    classReport: null as any,
  });
  const [loading, setLoading] = useState({
    assessments: false,
    grades: false,
    calculation: false,
  });
  const [progress, setProgress] = useState({
    step1: 0, // Assessment grading progress
    step2: 0, // Course grade generation progress
    step3: 0, // Student term grade progress
    step4: 0, // Class report progress
  });

  const steps = [
    {
      id: 1,
      title: "Record Assessment Scores",
      description: "Grade individual student assessments",
      icon: BookOpen,
      color: "bg-blue-500",
    },
    {
      id: 2,
      title: "Generate Course Grades",
      description: "Calculate cumulative course performance",
      icon: Calculator,
      color: "bg-green-500",
    },
    {
      id: 3,
      title: "Create Term Summaries",
      description: "Compile student term grades with rankings",
      icon: TrendingUp,
      color: "bg-purple-500",
    },
    {
      id: 4,
      title: "Generate Class Report",
      description: "Create comprehensive class analytics",
      icon: Target,
      color: "bg-orange-500",
    },
  ];

  useEffect(() => {
    loadStepData();
  }, [course, termId, currentStep]);

  const loadStepData = async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      setLoading((prev) => ({ ...prev, assessments: true }));

      // Load assessments for this term
      const assessments = await gradeRecordsApi.getAssessmentsForTerm(
        termId,
        token,
      );

      // Load existing grades if any
      const courseGrades = await gradeRecordsApi.getCourseGrades(
        course._id,
        termId,
        token,
      );

      setStepData((prev) => ({
        ...prev,
        assessments,
        courseGrades,
      }));

      // Calculate progress for each step
      await calculateProgress();
    } catch (error) {
      console.error("Error loading step data:", error);
    } finally {
      setLoading((prev) => ({ ...prev, assessments: false }));
    }
  };

  const calculateProgress = async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      // Get students count
      const students = await gradeRecordsApi.getStudentsForCourse(
        course._id,
        token,
      );
      const totalStudents = students.length;

      // Calculate assessment grading progress
      const assessmentGrades =
        await gradeRecordsApi.getAssessmentGradesByCourse(course._id, token);

      const assessmentsCount = stepData.assessments.length;
      const expectedGrades = totalStudents * assessmentsCount;
      const actualGrades = assessmentGrades.length;
      const step1Progress =
        expectedGrades > 0 ? (actualGrades / expectedGrades) * 100 : 0;

      // Calculate course grades progress
      const step2Progress =
        totalStudents > 0
          ? (stepData.courseGrades.length / totalStudents) * 100
          : 0;

      setProgress({
        step1: Math.min(step1Progress, 100),
        step2: Math.min(step2Progress, 100),
        step3: 0, // Will be calculated when implementing student term grades
        step4: 0, // Will be calculated when implementing class reports
      });
    } catch (error) {
      console.error("Error calculating progress:", error);
    }
  };

  const handleStepAction = async (stepId: number) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      setLoading((prev) => ({ ...prev, calculation: true }));

      switch (stepId) {
        case 1:
          // Navigate to assessment grading interface
          setCurrentStep(1);
          break;

        case 2:
          // Auto-generate course grades for all students
          const students = await gradeRecordsApi.getStudentsForCourse(
            course._id,
            token,
          );

          for (const student of students) {
            try {
              await gradeRecordsApi.autoCalculateCourseGrade(
                student._id,
                course._id,
                termId,
                token,
                course.classId,
              );
            } catch (error) {
              console.error(
                `Failed to calculate course grade for student ${student._id}:`,
                error,
              );
            }
          }

          // Refresh course grades
          const updatedCourseGrades = await gradeRecordsApi.getCourseGrades(
            course._id,
            termId,
            token,
          );

          setStepData((prev) => ({
            ...prev,
            courseGrades: updatedCourseGrades,
          }));
          await calculateProgress();

          if (onStepComplete) onStepComplete(2);
          break;

        case 3:
          // Auto-calculate student cumulative grades (for class teachers)
          if (course.classId) {
            const students = await gradeRecordsApi.getStudentsForCourse(
              course._id,
              token,
            );

            for (const student of students) {
              try {
                await gradeRecordsApi.autoCalculateStudentCumulative(
                  student._id,
                  termId,
                  token,
                );
              } catch (error) {
                console.error(
                  `Failed to calculate student cumulative for ${student._id}:`,
                  error,
                );
              }
            }
          }

          if (onStepComplete) onStepComplete(3);
          break;

        case 4:
          // Auto-calculate class cumulative report
          if (course.classId) {
            await gradeRecordsApi.autoCalculateClassCumulative(
              course.classId,
              termId,
              token,
            );
          }

          if (onStepComplete) onStepComplete(4);
          break;
      }
    } catch (error) {
      console.error(`Error executing step ${stepId}:`, error);
    } finally {
      setLoading((prev) => ({ ...prev, calculation: false }));
    }
  };

  const getStepStatus = (
    stepId: number,
  ): "completed" | "in-progress" | "pending" => {
    const progressKey = `step${stepId}` as keyof typeof progress;
    const stepProgress = progress[progressKey];

    if (stepProgress >= 100) return "completed";
    if (stepProgress > 0) return "in-progress";
    return "pending";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50";
      case "in-progress":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return CheckCircle;
      case "in-progress":
        return Clock;
      default:
        return AlertCircle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-blue-900">
            <BookOpen className="h-6 w-6" />
            Grading Workflow: {course.title}
          </CardTitle>
          <p className="text-blue-700 text-sm">
            Follow the 4-step grading process to complete all grading tasks for
            this course
          </p>
        </CardHeader>
      </Card>

      {/* Step Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const StatusIcon = getStatusIcon(status);
          const stepProgress =
            progress[`step${step.id}` as keyof typeof progress];

          return (
            <Card
              key={step.id}
              className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${
                currentStep === step.id ? "ring-2 ring-blue-500 shadow-md" : ""
              }`}
              onClick={() => setCurrentStep(step.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${step.color} text-white`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <Badge
                    text={
                      status === "completed"
                        ? "Done"
                        : status === "in-progress"
                          ? "Active"
                          : "Pending"
                    }
                    color={
                      status === "completed"
                        ? "green"
                        : status === "in-progress"
                          ? "blue"
                          : "gray"
                    }
                  />
                </div>

                <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-gray-600 mb-3">{step.description}</p>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Progress</span>
                    <span>{Math.round(stepProgress)}%</span>
                  </div>
                  <Progress value={stepProgress} className="h-2" />
                </div>

                {index < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-gray-400 mx-auto mt-2" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Step Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {React.createElement(steps[currentStep - 1]?.icon, {
              className: "h-6 w-6",
            })}
            Step {currentStep}: {steps[currentStep - 1]?.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <AssessmentGradingStep
              course={course}
              termId={termId}
              assessments={stepData.assessments}
              onProgress={calculateProgress}
            />
          )}

          {currentStep === 2 && (
            <CourseGradesStep
              course={course}
              termId={termId}
              courseGrades={stepData.courseGrades}
              onGenerate={() => handleStepAction(2)}
              loading={loading.calculation}
            />
          )}

          {currentStep === 3 && (
            <StudentTermGradesStep
              course={course}
              termId={termId}
              onGenerate={() => handleStepAction(3)}
              loading={loading.calculation}
            />
          )}

          {currentStep === 4 && (
            <ClassReportStep
              course={course}
              termId={termId}
              onGenerate={() => handleStepAction(4)}
              loading={loading.calculation}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Individual step components
const AssessmentGradingStep: React.FC<{
  course: Course;
  termId: string;
  assessments: Assessment[];
  onProgress: () => void;
}> = ({ course, termId, assessments, onProgress }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Record Assessment Scores</h3>
        <Button variant="outline" onClick={onProgress}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Progress
        </Button>
      </div>

      <p className="text-gray-600">
        Record individual student scores for each assessment. This forms the
        foundation for all subsequent grade calculations.
      </p>

      <div className="grid gap-3">
        {assessments.map((assessment) => (
          <div
            key={assessment._id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div>
              <h4 className="font-medium">{assessment.name}</h4>
              <p className="text-sm text-gray-600">{assessment.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge text={assessment.status} color="blue" />
              <Button size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Grade Students
              </Button>
            </div>
          </div>
        ))}
      </div>

      {assessments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No assessments available for this term</p>
        </div>
      )}
    </div>
  );
};

const CourseGradesStep: React.FC<{
  course: Course;
  termId: string;
  courseGrades: any[];
  onGenerate: () => void;
  loading: boolean;
}> = ({ course, termId, courseGrades, onGenerate, loading }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Generate Course Grades</h3>
        <Button
          onClick={onGenerate}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4 mr-2" />
          )}
          Auto-Calculate All
        </Button>
      </div>

      <p className="text-gray-600">
        Automatically calculate course grades by aggregating all assessment
        scores for each student. Grade levels are assigned based on percentage
        performance.
      </p>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Grade Scale:</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div>90-100%: A+</div>
          <div>80-89%: A</div>
          <div>75-79%: B+</div>
          <div>70-74%: B</div>
          <div>65-69%: C+</div>
          <div>60-64%: C</div>
          <div>55-59%: D+</div>
          <div>50-54%: D</div>
          <div>45-49%: E</div>
          <div>Below 45%: F</div>
        </div>
      </div>

      {courseGrades.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">
            Generated Course Grades: {courseGrades.length}
          </h4>
          <div className="text-sm text-gray-600">
            Course grades have been calculated and are ready for the next step.
          </div>
        </div>
      )}
    </div>
  );
};

const StudentTermGradesStep: React.FC<{
  course: Course;
  termId: string;
  onGenerate: () => void;
  loading: boolean;
}> = ({ course, termId, onGenerate, loading }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Create Student Term Summaries</h3>
        <Button
          onClick={onGenerate}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Users className="h-4 w-4 mr-2" />
          )}
          Generate Summaries
        </Button>
      </div>

      <p className="text-gray-600">
        Combine performance across all courses for each student to create
        comprehensive term summaries with class rankings and positions.
      </p>

      <div className="bg-purple-50 p-4 rounded-lg">
        <h4 className="font-medium text-purple-900 mb-2">This Step Will:</h4>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>• Aggregate all course grades for each student</li>
          <li>• Calculate overall term percentage</li>
          <li>• Assign term grade level</li>
          <li>• Determine class ranking/position</li>
          <li>• Generate student term reports</li>
        </ul>
      </div>
    </div>
  );
};

const ClassReportStep: React.FC<{
  course: Course;
  termId: string;
  onGenerate: () => void;
  loading: boolean;
}> = ({ course, termId, onGenerate, loading }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Generate Class Report</h3>
        <div className="flex gap-2">
          <Button
            onClick={onGenerate}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Target className="h-4 w-4 mr-2" />
            )}
            Generate Report
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <p className="text-gray-600">
        Create comprehensive class analytics including performance statistics,
        trends, and comparative analysis.
      </p>

      <div className="bg-orange-50 p-4 rounded-lg">
        <h4 className="font-medium text-orange-900 mb-2">Report Includes:</h4>
        <ul className="text-sm text-orange-800 space-y-1">
          <li>• Class average percentage</li>
          <li>• Performance distribution</li>
          <li>• Top and bottom performers</li>
          <li>• Subject-wise analysis</li>
          <li>• Historical comparisons</li>
          <li>• Recommendations for improvement</li>
        </ul>
      </div>
    </div>
  );
};

export default GradingWorkflowSteps;
