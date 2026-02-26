"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  RefreshCw,
  Download,
  Eye,
  Filter,
} from "lucide-react";
import Badge from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { gradeRecordsApi } from "@/app/services/grade-records.service";
import { useAuth } from "@/app/hooks/useAuth";

interface AnalyticsKPITrackerProps {
  view: "school" | "class" | "course" | "teacher";
  entityId?: string;
  termId?: string;
  refreshInterval?: number;
}

interface KPIData {
  totalAssessments: number;
  studentsGraded: number;
  averageScore: number;
  pendingReviews: number;
  completionRate?: number;
  classTrend?: "improving" | "declining" | "stable";
}

interface GradeDistribution {
  [key: string]: number;
}

const AnalyticsKPITracker: React.FC<AnalyticsKPITrackerProps> = ({
  view,
  entityId,
  termId,
  refreshInterval = 30,
}) => {
  const { getAccessToken } = useAuth();
  const [kpiData, setKpiData] = useState<KPIData>({
    totalAssessments: 0,
    studentsGraded: 0,
    averageScore: 0,
    pendingReviews: 0,
  });
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        refreshData();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  useEffect(() => {
    refreshData();
  }, [view, entityId, termId]);

  const refreshData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) throw new Error("No authentication token");

      let kpis: KPIData;

      switch (view) {
        case "school":
          kpis = await gradeRecordsApi.getSchoolKpis(token);
          break;

        case "class":
          if (!entityId) throw new Error("Class ID required");
          kpis = await gradeRecordsApi.getClassKpis(entityId, token);
          break;

        case "teacher":
          if (!entityId || !termId)
            throw new Error("Teacher ID and Term ID required");
          const teacherProgress =
            await gradeRecordsApi.getTeacherGradingProgress(
              entityId,
              termId,
              token,
            );
          kpis = {
            totalAssessments: teacherProgress.assessmentsToGrade,
            studentsGraded: teacherProgress.studentsGraded,
            averageScore: 0,
            pendingReviews:
              teacherProgress.assessmentsToGrade -
              teacherProgress.assessmentsGraded,
            completionRate: teacherProgress.completionRate,
          };
          break;

        case "course":
          if (!entityId || !termId)
            throw new Error("Course ID and Term ID required");
          const courseStats = await gradeRecordsApi.getCourseGradeStatistics(
            entityId,
            termId,
            token,
          );
          kpis = {
            totalAssessments: 0,
            studentsGraded: courseStats.totalStudents,
            averageScore: courseStats.averageGrade,
            pendingReviews: 0,
          };
          setGradeDistribution(courseStats.gradeDistribution);
          break;

        default:
          throw new Error("Invalid view type");
      }

      setKpiData(kpis);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Error fetching analytics data:", err);
      setError(err.message || "Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = async () => {
    try {
      const reportData = {
        kpiData,
        gradeDistribution,
        metadata: {
          view,
          entityId,
          termId,
          generatedAt: new Date(),
          lastUpdated,
        },
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `grading_analytics_${view}_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting analytics:", error);
    }
  };

  const getCompletionStatus = (rate: number) => {
    if (rate >= 90)
      return {
        color: "text-green-600",
        label: "Excellent",
        bgColor: "bg-green-50",
      };
    if (rate >= 75)
      return { color: "text-blue-600", label: "Good", bgColor: "bg-blue-50" };
    if (rate >= 50)
      return {
        color: "text-yellow-600",
        label: "Fair",
        bgColor: "bg-yellow-50",
      };
    return {
      color: "text-red-600",
      label: "Needs Attention",
      bgColor: "bg-red-50",
    };
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Target className="h-4 w-4 text-blue-600" />;
    }
  };

  const completionRate =
    kpiData.completionRate ??
    (kpiData.totalAssessments > 0
      ? ((kpiData.totalAssessments - kpiData.pendingReviews) /
          kpiData.totalAssessments) *
        100
      : 0);

  const completionStatus = getCompletionStatus(completionRate);

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6" />
                {view === "school" && "School-wide Analytics"}
                {view === "class" && "Class Analytics"}
                {view === "course" && "Course Analytics"}
                {view === "teacher" && "Teacher Analytics"}
              </CardTitle>
              {lastUpdated && (
                <p className="text-sm text-gray-600 mt-1">
                  Last updated: {lastUpdated.toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? "bg-green-50 text-green-700" : ""}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
                />
                {autoRefresh ? "Auto-refresh On" : "Auto-refresh Off"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>

              <Button variant="outline" size="sm" onClick={exportAnalytics}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                Error loading analytics: {error}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assessments */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Assessments
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : kpiData.totalAssessments}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={100} className="h-2 bg-blue-200" />
            </div>
          </CardContent>
        </Card>

        {/* Students Graded */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Students Graded
                </p>
                <p className="text-2xl font-bold text-green-700">
                  {loading ? "..." : kpiData.studentsGraded}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={completionRate} className="h-2" />
              <div className="flex justify-between mt-1 text-xs text-gray-600">
                <span>Progress</span>
                <span>{Math.round(completionRate)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Score */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Average Score
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-purple-700">
                    {loading ? "..." : `${Math.round(kpiData.averageScore)}%`}
                  </p>
                  {kpiData.classTrend && getTrendIcon(kpiData.classTrend)}
                </div>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={kpiData.averageScore} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Reviews */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Reviews
                </p>
                <p className="text-2xl font-bold text-orange-700">
                  {loading ? "..." : kpiData.pendingReviews}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge
                text={completionStatus.label}
                color={
                  completionStatus.color.includes("green")
                    ? "green"
                    : completionStatus.color.includes("blue")
                      ? "blue"
                      : completionStatus.color.includes("yellow")
                        ? "yellow"
                        : "red"
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        {Object.keys(gradeDistribution).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Grade Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(gradeDistribution).map(([grade, count]) => {
                  const total = Object.values(gradeDistribution).reduce(
                    (sum, c) => sum + c,
                    0,
                  );
                  const percentage = total > 0 ? (count / total) * 100 : 0;

                  return (
                    <div
                      key={grade}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded ${
                            grade === "A+" || grade === "A"
                              ? "bg-green-500"
                              : grade === "B+" || grade === "B"
                                ? "bg-blue-500"
                                : grade === "C+" || grade === "C"
                                  ? "bg-yellow-500"
                                  : grade === "D+" || grade === "D"
                                    ? "bg-orange-500"
                                    : "bg-red-500"
                          }`}
                        />
                        <span className="font-medium">{grade}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {count} students
                        </span>
                        <span className="text-sm font-medium">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {}}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Detailed Reports
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {}}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Continue Grading
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {}}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter & Sort
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={exportAnalytics}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Full Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Completion Rate Insight */}
            <div className={`p-4 rounded-lg ${completionStatus.bgColor}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className={`h-5 w-5 ${completionStatus.color}`} />
                <h4 className={`font-medium ${completionStatus.color}`}>
                  Completion Status
                </h4>
              </div>
              <p className="text-sm text-gray-600">
                {completionRate >= 90
                  ? "Excellent progress! Keep up the good work."
                  : completionRate >= 75
                    ? "Good progress. A few more assessments to complete."
                    : completionRate >= 50
                      ? "Fair progress. Consider scheduling more grading time."
                      : "Attention needed. Many assessments are pending review."}
              </p>
            </div>

            {/* Performance Trend */}
            {kpiData.classTrend && (
              <div className="p-4 rounded-lg bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  {getTrendIcon(kpiData.classTrend)}
                  <h4 className="font-medium text-blue-900">
                    Performance Trend
                  </h4>
                </div>
                <p className="text-sm text-gray-600">
                  {kpiData.classTrend === "improving"
                    ? "Performance is improving over time."
                    : kpiData.classTrend === "declining"
                      ? "Performance is declining. May need intervention."
                      : "Performance is stable with consistent results."}
                </p>
              </div>
            )}

            {/* Next Steps */}
            <div className="p-4 rounded-lg bg-purple-50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium text-purple-900">Next Steps</h4>
              </div>
              <p className="text-sm text-gray-600">
                {kpiData.pendingReviews > 0
                  ? `Review ${kpiData.pendingReviews} pending assessments to complete the grading cycle.`
                  : "All assessments are graded. Consider generating student reports."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsKPITracker;
