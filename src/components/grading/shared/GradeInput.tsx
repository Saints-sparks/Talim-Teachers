'use client';

import React from 'react';
import { GradeLevel } from '@/types/grade-records';

interface GradeInputProps {
  value: number | string;
  maxScore: number;
  onChange: (score: number) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const GradeInput: React.FC<GradeInputProps> = ({
  value,
  maxScore,
  onChange,
  error,
  disabled = false,
  placeholder = "Enter score",
  className = ""
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string for clearing
    if (inputValue === '') {
      onChange(0);
      return;
    }
    
    const numValue = parseFloat(inputValue);
    
    // Validate numeric input
    if (isNaN(numValue)) {
      return;
    }
    
    // Don't exceed max score
    if (numValue > maxScore) {
      onChange(maxScore);
      return;
    }
    
    // Don't allow negative values
    if (numValue < 0) {
      onChange(0);
      return;
    }
    
    onChange(numValue);
  };

  const percentage = maxScore > 0 ? ((Number(value) / maxScore) * 100).toFixed(1) : '0.0';
  
  const getGradeColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          min="0"
          max={maxScore}
          step="0.1"
          className={`
            w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          `}
        />
        <span className="text-sm text-gray-500 whitespace-nowrap">
          / {maxScore}
        </span>
      </div>
      
      {/* Percentage display */}
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${getGradeColor(Number(percentage))}`}>
          {percentage}%
        </span>
        {error && (
          <span className="text-red-600">{error}</span>
        )}
      </div>
    </div>
  );
};

export default GradeInput;
