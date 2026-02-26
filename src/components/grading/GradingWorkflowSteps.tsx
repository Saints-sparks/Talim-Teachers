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
  User,
  X,
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
 * 
 * Follows the exact 4-step grading process with correct API endpoints:
 * 
 * Step 1: Record Assessment Scores 📝
 *   - POST /grade-records (individual) ✅
 *   - POST /grade-records/bulk (multiple students) ✅
 * 
 * Step 2: Generate Course Grades 📊
 *   - POST /grade-records/course-grade-record (aggregates assessment grades) ✅
 * 
 * Step 3: Generate Student Term Summaries 👤
 *   - POST /grade-records/student-cumulative-term-grade-records/calculate/:studentId/:termId ✅
 *   - GET /grade-records/student-cumulative-term-grade-records/class/:classId/term/:termId (progress tracking) ✅
 * 
 * Step 4: Generate Class Reports 📈
 *   - POST /grade-records/class-cumulative-term-grade-records/calculate/:classId/:termId ✅
 * 
 * Supporting endpoints used:
 *   - GET /teachers/:id/courses (for teacher's courses) ✅
 *   - GET /students/by-class/:classId (for class students) ✅
 *   - GET /grade-records/assessment/:assessmentId/course/:courseId (for existing grades) ✅
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

  // Grading modal state
  const [gradingModal, setGradingModal] = useState<{
    isOpen: boolean;
    assessment: Assessment | null;
    student: any | null;
    students?: any[];
    existingGrades?: any[];
  }>({
    isOpen: false,
    assessment: null,
    student: null,
    students: [],
    existingGrades: [],
  });

  // Individual student grading modal
  const [studentGradingModal, setStudentGradingModal] = useState<{
    isOpen: boolean;
    student: any | null;
    assessment: Assessment | null;
    existingGrade: any | null;
  }>({
    isOpen: false,
    student: null,
    assessment: null,
    existingGrade: null,
  });

  useEffect(() => {
    loadStepData();
  }, [course, termId, currentStep]);

  const loadStepData = async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      setLoading((prev) => ({ ...prev, assessments: true }));

      // Load assessments for this term using GET /assessments/term/:termId
      const assessments = await gradeRecordsApi.getAssessmentsForTerm(
        termId,
        token,
      );

      // Load existing course grades using GET /grade-records/course-grade-records/course/:courseId/term/:termId
      const courseGrades = await gradeRecordsApi.getCourseGrades(
        course._id,
        termId,
        token,
      );

      // Load class-level progress using GET /grade-records/kpis/class/:classId
      let classKpis = null;
      if (course.classId) {
        try {
          classKpis = await gradeRecordsApi.getClassKpis(course.classId, token);
        } catch (error) {
          console.log("Class KPIs not available yet");
        }
      }

      setStepData((prev) => ({
        ...prev,
        assessments,
        courseGrades,
        classReport: classKpis,
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
      // Get students using the correct endpoint: GET /students/by-class/:classId
      const students = await gradeRecordsApi.getStudentsForCourse(
        course.classId,
        token,
      );
      const totalStudents = students.length;

      // Step 1: Assessment grading progress using GET /grade-records/course/:courseId
      const assessmentGrades = await gradeRecordsApi.getAssessmentGradesByCourse(
        course._id,
        token,
      );

      const assessmentsCount = stepData.assessments.length;
      const expectedGrades = totalStudents * assessmentsCount;
      const actualGrades = assessmentGrades.length;
      const step1Progress = expectedGrades > 0 ? (actualGrades / expectedGrades) * 100 : 0;

      // Step 2: Course grades progress using GET /grade-records/course-grade-records/course/:courseId/term/:termId
      const courseGrades = await gradeRecordsApi.getCourseGrades(
        course._id,
        termId,
        token,
      );
      const step2Progress = totalStudents > 0 ? (courseGrades.length / totalStudents) * 100 : 0;

      // Step 3: Student term summaries progress using GET /grade-records/student-cumulative-term-grade-records/class/:classId/term/:termId
      let step3Progress = 0;
      if (course.classId && totalStudents > 0) {
        try {
          const studentTermSummaries = await gradeRecordsApi.getStudentCumulativeByClass(
            course.classId,
            termId,
            token,
          );
          step3Progress = (studentTermSummaries.length / totalStudents) * 100;
        } catch (error) {
          // Student term summaries haven't been generated yet
          step3Progress = 0;
        }
      }

      // Step 4: Class report progress using GET /grade-records/class-cumulative-term-grade-records/:classId/:termId
      let step4Progress = 0;
      if (course.classId) {
        try {
          const classReport = await gradeRecordsApi.getClassCumulative(
            course.classId,
            termId,
            token,
          );
          step4Progress = classReport ? 100 : 0;
        } catch (error) {
          step4Progress = 0;
        }
      }

      setProgress({
        step1: Math.min(step1Progress, 100),
        step2: Math.min(step2Progress, 100),
        step3: Math.min(step3Progress, 100),
        step4: Math.min(step4Progress, 100),
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
          // Step 2: Generate Course Grades using POST /grade-records/course-grade-record
          const students = await gradeRecordsApi.getStudentsForCourse(
            course.classId,
            token,
          );

          for (const student of students) {
            try {
              // Get all assessment grades for this student in this course
              const assessmentGrades = await gradeRecordsApi.getAssessmentGradesByCourse(
                course._id,
                token,
              );
              
              // Filter to get this student's grades only
              const studentAssessmentGrades = assessmentGrades.filter((grade: any) => {
                const gradeStudentId = typeof grade.studentId === 'object' 
                  ? grade.studentId._id 
                  : grade.studentId;
                return gradeStudentId === student._id;
              });

              if (studentAssessmentGrades.length > 0) {
                // Create/update course grade using the correct endpoint
                await gradeRecordsApi.createCourseGrade(
                  {
                    courseId: course._id,
                    studentId: student._id,
                    termId: termId,
                    schoolId: course.schoolId || "", // Add required schoolId
                    classId: course.classId,
                  },
                  token,
                );
              }
            } catch (error) {
              console.error(
                `Failed to generate course grade for student ${student._id}:`,
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
          // Step 3: Generate Student Term Summaries using POST /grade-records/student-cumulative-term-grade-records/calculate/:studentId/:termId
          if (course.classId) {
            const students = await gradeRecordsApi.getStudentsForCourse(
              course.classId,
              token,
            );

            for (const student of students) {
              try {
                // Use the correct auto-calculate endpoint for student term summaries
                await gradeRecordsApi.autoCalculateStudentCumulative(
                  student._id,
                  termId,
                  token,
                );
              } catch (error) {
                console.error(
                  `Failed to generate student term summary for ${student._id}:`,
                  error,
                );
              }
            }
          }

          if (onStepComplete) onStepComplete(3);
          break;

        case 4:
          // Step 4: Generate Class Reports using POST /grade-records/class-cumulative-term-grade-records/calculate/:classId/:termId
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

  const handleGradeAssessment = async (assessment: Assessment) => {
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No authentication token");

      // Fetch students for this course (using classId from course)
      const students = await gradeRecordsApi.getStudentsForCourse(
        course.classId,
        token,
      );

      // Fetch existing grades for this assessment in this course
      const existingGrades = await gradeRecordsApi.getAssessmentGrades(
        assessment._id,
        token,
        course._id,
      );

      setGradingModal({
        isOpen: true,
        assessment,
        student: null,
        students,
        existingGrades,
      });
    } catch (error) {
      console.error("Error loading grading data:", error);
      // Show alert as fallback
      alert(`Error loading grading data: ${(error as Error).message}`);
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
              onGradeAssessment={handleGradeAssessment}
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

      {/* Assessment Grading Modal */}
      {gradingModal.isOpen && (
        <AssessmentGradingModal
          assessment={gradingModal.assessment!}
          course={course}
          students={gradingModal.students || []}
          existingGrades={gradingModal.existingGrades || []}
          onClose={() =>
            setGradingModal({ isOpen: false, assessment: null, student: null })
          }
          onGradeStudent={(student, existingGrade) => {
            setStudentGradingModal({
              isOpen: true,
              student,
              assessment: gradingModal.assessment,
              existingGrade,
            });
          }}
          onRefresh={() => {
            // Refresh the assessment grading data
            handleGradeAssessment(gradingModal.assessment!);
          }}
        />
      )}

      {/* Individual Student Grading Modal */}
      {studentGradingModal.isOpen && (
        <StudentGradeEntryModal
          student={studentGradingModal.student!}
          assessment={studentGradingModal.assessment!}
          course={course}
          existingGrade={studentGradingModal.existingGrade}
          onClose={() =>
            setStudentGradingModal({
              isOpen: false,
              student: null,
              assessment: null,
              existingGrade: null,
            })
          }
          onSave={async (gradeData) => {
            try {
              const token = getAccessToken();
              if (!token) throw new Error("No authentication token");

              if (studentGradingModal.existingGrade) {
                // Update existing grade
                await gradeRecordsApi.updateAssessmentGrade(
                  studentGradingModal.existingGrade._id,
                  gradeData,
                  token,
                );
              } else {
                // Create new grade
                await gradeRecordsApi.createAssessmentGrade(
                  {
                    courseId: course._id,
                    studentId: studentGradingModal.student._id,
                    assessmentId: studentGradingModal.assessment!._id,
                    ...gradeData,
                  },
                  token,
                );
              }

              // Close modal and refresh data
              setStudentGradingModal({
                isOpen: false,
                student: null,
                assessment: null,
                existingGrade: null,
              });
              handleGradeAssessment(gradingModal.assessment!);
              calculateProgress();
            } catch (error) {
              console.error("Error saving grade:", error);
            }
          }}
        />
      )}
    </div>
  );
};

// Individual step components
const AssessmentGradingStep: React.FC<{
  course: Course;
  termId: string;
  assessments: Assessment[];
  onProgress: () => void;
  onGradeAssessment: (assessment: Assessment) => void;
}> = ({ course, termId, assessments, onProgress, onGradeAssessment }) => {
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
              <Button size="sm" onClick={() => onGradeAssessment(assessment)}>
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

// Assessment Grading Modal Component
const AssessmentGradingModal: React.FC<{
  assessment: Assessment;
  course: Course;
  students: any[];
  existingGrades: any[];
  onClose: () => void;
  onGradeStudent: (student: any, existingGrade?: any) => void;
  onRefresh: () => void;
}> = ({
  assessment,
  course,
  students,
  existingGrades,
  onClose,
  onGradeStudent,
  onRefresh,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Grade Students</h2>
            <p className="text-gray-600">
              {assessment.name} - {course.title}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Students List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">
              Students ({students.length})
            </h3>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-medium">
                Graded: {existingGrades.length}
              </span>
              <span className="text-gray-600">
                Remaining: {students.length - existingGrades.length}
              </span>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No students found for this course</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {students.map((student) => {
                const existingGrade = existingGrades.find(
                  (grade) => grade.studentId._id === student._id,
                );

                return (
                  <div
                    key={student._id}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 ${
                      existingGrade ? "bg-green-50 border-green-200" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        existingGrade ? "bg-green-100" : "bg-blue-100"
                      }`}>
                        {existingGrade ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <User className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {student.userId.firstName} {student.userId.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">
                          ID: {student.userId.email}
                        </p>
                        {existingGrade && (
                          <Badge text="Graded" color="green" className="mt-1" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {existingGrade && (
                        <div className="text-right">
                          <div className="font-medium">
                            {existingGrade.actualScore}/{existingGrade.maxScore}
                          </div>
                          <div className="text-sm text-gray-600">
                            (
                            {Math.round(
                              (existingGrade.actualScore /
                                existingGrade.maxScore) *
                                100,
                            )}
                            %)
                          </div>
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant={existingGrade ? "outline" : "default"}
                        onClick={() => onGradeStudent(student, existingGrade)}
                      >
                        {existingGrade ? "Edit Grade" : "Add Grade"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// Individual Student Grade Entry Modal
const StudentGradeEntryModal: React.FC<{
  student: any;
  assessment: Assessment;
  course: Course;
  existingGrade?: any;
  onClose: () => void;
  onSave: (gradeData: any) => void;
}> = ({ student, assessment, course, existingGrade, onClose, onSave }) => {
  const [actualScore, setActualScore] = useState(
    existingGrade?.actualScore || 0,
  );
  const [maxScore, setMaxScore] = useState(existingGrade?.maxScore || 100);
  const [loading, setSaving] = useState(false);

  const handleSave = async () => {
    if (actualScore < 0 || actualScore > maxScore) {
      alert("Score must be between 0 and maximum score");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        actualScore: parseFloat(actualScore.toString()),
        maxScore: parseFloat(maxScore.toString()),
      });
    } catch (error) {
      console.error("Error saving grade:", error);
    } finally {
      setSaving(false);
    }
  };

  const percentage =
    maxScore > 0 ? Math.round((actualScore / maxScore) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {existingGrade ? "Edit" : "Add"} Grade
          </h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium">
              {student.userId.firstName} {student.userId.lastName}
            </div>
            <div className="text-sm text-gray-600">
              {assessment.name} - {course.title}
            </div>
          </div>

          {/* Score Input */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Score Obtained
              </label>
              <input
                type="number"
                min="0"
                max={maxScore}
                value={actualScore}
                onChange={(e) =>
                  setActualScore(parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter score"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Score
              </label>
              <input
                type="number"
                min="1"
                value={maxScore}
                onChange={(e) => setMaxScore(parseFloat(e.target.value) || 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter maximum score"
              />
            </div>

            {/* Percentage Display */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Percentage</div>
              <div className="text-2xl font-bold text-blue-600">
                {percentage}%
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {existingGrade ? "Update" : "Save"} Grade
          </Button>
        </div>
      </div>
    </div>
  );
};
