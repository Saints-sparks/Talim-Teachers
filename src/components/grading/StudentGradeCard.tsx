'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import { 
  Edit3, 
  Eye, 
  User, 
  CheckCircle, 
  Clock, 
  Trophy,
  TrendingUp,
  Mail
} from 'lucide-react';
import { Student, GradeRecord, Assessment, GradeLevel } from '@/types/grading';

interface StudentGradeCardProps {
  student: Student;
  gradeRecord?: GradeRecord;
  assessment: Assessment | null;
  onGrade: () => void;
  onView: () => void;
}

const StudentGradeCard: React.FC<StudentGradeCardProps> = ({
  student,
  gradeRecord,
  assessment,
  onGrade,
  onView
}) => {
  const getGradeColor = (grade: GradeLevel) => {
    switch (grade) {
      case GradeLevel.A_PLUS:
      case GradeLevel.A:
        return 'text-green-600 bg-green-100';
      case GradeLevel.B_PLUS:
      case GradeLevel.B:
        return 'text-blue-600 bg-blue-100';
      case GradeLevel.C_PLUS:
      case GradeLevel.C:
        return 'text-yellow-600 bg-yellow-100';
      case GradeLevel.D_PLUS:
      case GradeLevel.D:
        return 'text-orange-600 bg-orange-100';
      case GradeLevel.E:
      case GradeLevel.F:
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const isGraded = !!gradeRecord;

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        {/* Student Info */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {student.avatar ? (
              <img 
                src={student.avatar} 
                alt={student.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
                {student.name.charAt(0)}
              </div>
            )}
            {isGraded && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{student.name}</h3>
              {isGraded && (
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(gradeRecord.grade)}`}>
                  {gradeRecord.grade}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{student.studentId}</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span>{student.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grade Info & Actions */}
        <div className="flex items-center gap-4">
          {isGraded ? (
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="font-bold text-lg text-gray-900">
                  {gradeRecord.percentage}%
                </span>
              </div>
              <div className="text-xs text-gray-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Score: {gradeRecord.totalScore}</span>
              </div>
              {gradeRecord.remarks && (
                <p className="text-xs text-gray-500 mt-1 max-w-32 truncate">
                  {gradeRecord.remarks}
                </p>
              )}
              <p className="text-xs text-gray-400">
                Updated: {formatDate(gradeRecord.updatedAt)}
              </p>
            </div>
          ) : (
            <div className="text-right">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Not Graded</span>
              </div>
              <p className="text-xs text-gray-500">
                {assessment ? `${assessment.name} pending` : 'Select assessment'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onView}
              className="flex items-center gap-1 hover:border-blue-400 hover:text-blue-600"
            >
              <Eye className="h-4 w-4" />
              View
            </Button>
            <Button
              size="sm"
              onClick={onGrade}
              disabled={!assessment}
              className={`flex items-center gap-1 ${
                isGraded 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              }`}
            >
              <Edit3 className="h-4 w-4" />
              {isGraded ? 'Edit' : 'Grade'}
            </Button>
          </div>
        </div>
      </div>

      {/* Score Breakdown for Graded Students */}
      {isGraded && gradeRecord.scores.length > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Score Breakdown:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {gradeRecord.scores.map((score, index) => (
              <div key={index} className="bg-gray-50 p-2 rounded">
                <div className="text-xs text-gray-600 capitalize">{score.assessmentType}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {score.actualScore}/{score.maxScore}
                  </span>
                  <span className="text-xs text-gray-500">
                    {score.weight}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentGradeCard;
