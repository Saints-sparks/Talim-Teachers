'use client';

import React from 'react';
import { GradeLevel } from '@/types/grade-records';
import { Trophy, Award, Star, Target } from 'lucide-react';

interface GradeDisplayProps {
  score: number;
  maxScore: number;
  percentage: number;
  gradeLevel: GradeLevel;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const GradeDisplay: React.FC<GradeDisplayProps> = ({
  score,
  maxScore,
  percentage,
  gradeLevel,
  showDetails = true,
  size = 'md',
  className = ""
}) => {
  const getGradeColor = (grade: GradeLevel): string => {
    switch (grade) {
      case 'A+': case 'A': return 'text-green-600 bg-green-50 border-green-200';
      case 'B+': case 'B': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'C+': case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'D+': case 'D': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'E': case 'F': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getGradeIcon = (grade: GradeLevel) => {
    switch (grade) {
      case 'A+': return <Trophy className="h-4 w-4" />;
      case 'A': return <Award className="h-4 w-4" />;
      case 'B+': case 'B': return <Star className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Grade Badge */}
      <div className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${getGradeColor(gradeLevel)}
        ${sizeClasses[size]}
      `}>
        {getGradeIcon(gradeLevel)}
        <span>{gradeLevel}</span>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Score:</span>
            <span className="font-medium">{score} / {maxScore}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Percentage:</span>
            <span className={`font-medium ${getGradeColor(gradeLevel).split(' ')[0]}`}>
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeDisplay;
