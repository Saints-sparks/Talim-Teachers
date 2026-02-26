"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Download,
  Save,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Eye,
  Edit3,
  RefreshCw,
  Calculator,
} from "lucide-react";
import Badge from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreateAssessmentGradeRecordDto,
  BulkGradeResult,
} from "@/types/grade-records";
import { Student } from "@/types/grading";
import { gradeRecordsApi } from "@/app/services/grade-records.service";
import { useAuth } from "@/app/hooks/useAuth";

interface BulkGradingOperationsProps {
  courseId: string;
  classId: string;
  schoolId: string;
  termId: string;
  assessmentId: string;
  assessmentName: string;
  students: Student[];
  onComplete?: (result: BulkGradeResult) => void;
  onCancel?: () => void;
}

interface GradeEntry {
  studentId: string;
  studentName: string;
  actualScore: number | "";
  maxScore: number;
  percentage: number;
  isValid: boolean;
  error?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const BulkGradingOperations: React.FC<BulkGradingOperationsProps> = ({
  courseId,
  classId,
  schoolId,
  termId,
  assessmentId,
  assessmentName,
  students,
  onComplete,
  onCancel,
}) => {
  const { getAccessToken } = useAuth();
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
  });

  const initializeGradeEntries = () => {
    const entries: GradeEntry[] = students.map((student) => ({
      studentId: student._id,
      studentName: student.name || student.email || "Unknown Student",
      actualScore: "",
      maxScore: 100,
      percentage: 0,
      isValid: false,
      error: undefined,
    }));
    setGradeEntries(entries);
  };

  useEffect(() => {
    initializeGradeEntries();
  }, [students]);

  const handleScoreChange = (studentId: string, actualScore: string) => {
    const numericScore = actualScore === "" ? "" : Number(actualScore);

    setGradeEntries((prev) =>
      prev.map((entry) => {
        if (entry.studentId === studentId) {
          const isValidScore =
            numericScore !== "" &&
            !isNaN(Number(numericScore)) &&
            Number(numericScore) >= 0 &&
            Number(numericScore) <= entry.maxScore;

          const percentage =
            numericScore !== "" && entry.maxScore > 0
              ? (Number(numericScore) / entry.maxScore) * 100
              : 0;

          return {
            ...entry,
            actualScore: numericScore,
            percentage,
            isValid: isValidScore,
          };
        }
        return entry;
      }),
    );
  };

  const validateAllGrades = useCallback((): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validEntries = gradeEntries.filter(
      (entry) => entry.actualScore !== "" && entry.isValid,
    );

    if (validEntries.length === 0) {
      errors.push("At least one valid grade entry is required");
    }

    const invalidEntries = gradeEntries.filter(
      (entry) => entry.actualScore !== "" && !entry.isValid,
    );

    if (invalidEntries.length > 0) {
      errors.push(`${invalidEntries.length} entries have invalid scores`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [gradeEntries]);

  useEffect(() => {
    const result = validateAllGrades();
    setValidationResult(result);
  }, [validateAllGrades]);

  const handleBulkSave = async () => {
    try {
      setProcessing(true);

      const token = getAccessToken();
      if (!token) throw new Error("No authentication token");

      const validation = validateAllGrades();
      if (!validation.isValid) {
        throw new Error("Please fix validation errors before saving");
      }

      const gradesData: CreateAssessmentGradeRecordDto[] = gradeEntries
        .filter((entry) => entry.actualScore !== "" && entry.isValid)
        .map((entry) => ({
          courseId,
          studentId: entry.studentId,
          assessmentId,
          actualScore: Number(entry.actualScore),
          maxScore: entry.maxScore,
          schoolId,
          classId,
        }));

      const result = await gradeRecordsApi.processBatchGrades(
        gradesData,
        token,
      );

      if (onComplete) {
        onComplete({
          success: true,
          created: result.successful,
          updated: 0,
          failed: result.failed,
          errors: result.results
            .filter((r) => !r.success)
            .map((r, index) => ({
              studentId: gradesData[index]?.studentId || "unknown",
              error: r.error || "Unknown error",
            })),
        });
      }
    } catch (error: any) {
      console.error("Error saving bulk grades:", error);
      if (onComplete) {
        onComplete({
          success: false,
          created: 0,
          updated: 0,
          failed: gradeEntries.length,
          errors: [{ studentId: "all", error: error.message }],
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const validGradesCount = gradeEntries.filter(
    (entry) => entry.actualScore !== "" && entry.isValid,
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Users className="h-6 w-6" />
            Bulk Grading: {assessmentName}
          </CardTitle>
          <div className="text-sm text-gray-600">
            Students: {students.length} | Valid Entries: {validGradesCount}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Grade Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {gradeEntries.map((entry, index) => (
              <div
                key={entry.studentId}
                className="flex items-center gap-4 p-3 border rounded-lg"
              >
                <div className="w-8 text-sm text-gray-500">{index + 1}</div>

                <div className="flex-1">
                  <div className="font-medium">{entry.studentName}</div>
                  <div className="text-xs text-gray-500">{entry.studentId}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Score"
                    value={entry.actualScore}
                    onChange={(e) =>
                      handleScoreChange(entry.studentId, e.target.value)
                    }
                    className="w-20"
                    min="0"
                    max={entry.maxScore}
                  />
                  <span className="text-sm text-gray-500">/100</span>
                </div>

                <div className="w-16 text-right">
                  {entry.actualScore !== "" && entry.isValid && (
                    <span className="text-sm font-medium">
                      {entry.percentage.toFixed(1)}%
                    </span>
                  )}
                </div>

                <div className="w-6">
                  {entry.actualScore !== "" &&
                    (entry.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!validationResult.isValid && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium mb-1">
              Please fix the following errors:
            </div>
            <ul className="list-disc list-inside text-sm space-y-1">
              {validationResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onCancel} disabled={processing}>
          Cancel
        </Button>

        <Button
          onClick={handleBulkSave}
          disabled={
            !validationResult.isValid || validGradesCount === 0 || processing
          }
          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
        >
          {processing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save {validGradesCount} Grades
        </Button>
      </div>
    </div>
  );
};

export default BulkGradingOperations;
