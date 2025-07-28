'use client';

import React from 'react';
import { BarChart3, TrendingUp, Users, Award } from 'lucide-react';

interface ClassPerformanceChartProps {
  classId: string;
}

const ClassPerformanceChart: React.FC<ClassPerformanceChartProps> = ({ classId }) => {
  // Mock data for the chart
  const performanceData = [
    { grade: 'A+', count: 3, percentage: 12, color: 'bg-green-500' },
    { grade: 'A', count: 5, percentage: 20, color: 'bg-green-400' },
    { grade: 'B+', count: 7, percentage: 28, color: 'bg-blue-500' },
    { grade: 'B', count: 6, percentage: 24, color: 'bg-blue-400' },
    { grade: 'C+', count: 3, percentage: 12, color: 'bg-yellow-500' },
    { grade: 'C', count: 1, percentage: 4, color: 'bg-yellow-400' },
    { grade: 'D', count: 0, percentage: 0, color: 'bg-orange-500' },
    { grade: 'F', count: 0, percentage: 0, color: 'bg-red-500' }
  ];

  const subjectPerformance = [
    { subject: 'Mathematics', average: 85.2, color: 'bg-blue-500' },
    { subject: 'English', average: 82.8, color: 'bg-green-500' },
    { subject: 'Physics', average: 79.5, color: 'bg-purple-500' },
    { subject: 'Chemistry', average: 81.3, color: 'bg-indigo-500' },
    { subject: 'Biology', average: 86.7, color: 'bg-pink-500' },
    { subject: 'History', average: 78.9, color: 'bg-yellow-500' }
  ];

  const maxHeight = 120; // Maximum bar height in pixels

  return (
    <div className="space-y-6">
      {/* Grade Distribution Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Grade Distribution
        </h3>
        
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
          {performanceData.map((item) => (
            <div key={item.grade} className="text-center">
              <div className="relative bg-gray-100 rounded-lg h-32 flex flex-col justify-end overflow-hidden">
                <div 
                  className={`${item.color} rounded-t transition-all duration-500 flex items-end justify-center pb-1`}
                  style={{ 
                    height: item.count > 0 ? `${(item.count / Math.max(...performanceData.map(d => d.count))) * maxHeight}px` : '4px'
                  }}
                >
                  {item.count > 0 && (
                    <span className="text-white text-xs font-medium">{item.count}</span>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-900">{item.grade}</p>
                <p className="text-xs text-gray-500">{item.percentage}%</p>
              </div>
            </div>
          ))}
        </div>

        {/* Grade Distribution Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Award className="h-4 w-4" />
              <span className="text-sm font-medium">Excellent (A+/A)</span>
            </div>
            <p className="text-xl font-bold text-green-700">
              {performanceData.filter(d => ['A+', 'A'].includes(d.grade)).reduce((sum, d) => sum + d.count, 0)}
            </p>
            <p className="text-xs text-gray-600">students</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Good (B+/B)</span>
            </div>
            <p className="text-xl font-bold text-blue-700">
              {performanceData.filter(d => ['B+', 'B'].includes(d.grade)).reduce((sum, d) => sum + d.count, 0)}
            </p>
            <p className="text-xs text-gray-600">students</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Average (C+/C)</span>
            </div>
            <p className="text-xl font-bold text-yellow-700">
              {performanceData.filter(d => ['C+', 'C'].includes(d.grade)).reduce((sum, d) => sum + d.count, 0)}
            </p>
            <p className="text-xs text-gray-600">students</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Below Average</span>
            </div>
            <p className="text-xl font-bold text-red-700">
              {performanceData.filter(d => ['D+', 'D', 'E', 'F'].includes(d.grade)).reduce((sum, d) => sum + d.count, 0)}
            </p>
            <p className="text-xs text-gray-600">students</p>
          </div>
        </div>
      </div>

      {/* Subject Performance Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Subject Performance (Class Average)
        </h3>
        
        <div className="space-y-3">
          {subjectPerformance.map((subject) => (
            <div key={subject.subject} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium text-gray-700 truncate">
                {subject.subject}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                <div 
                  className={`${subject.color} h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2`}
                  style={{ width: `${subject.average}%` }}
                >
                  <span className="text-white text-xs font-medium">
                    {subject.average}%
                  </span>
                </div>
              </div>
              <div className="w-16 text-right">
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  subject.average >= 85 ? 'text-green-600 bg-green-100' :
                  subject.average >= 75 ? 'text-blue-600 bg-blue-100' :
                  subject.average >= 65 ? 'text-yellow-600 bg-yellow-100' :
                  'text-red-600 bg-red-100'
                }`}>
                  {subject.average >= 85 ? 'A' :
                   subject.average >= 75 ? 'B' :
                   subject.average >= 65 ? 'C' : 'D'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Subject Performance Insights */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Top Performing Subjects</h4>
            <ul className="space-y-1 text-sm text-green-700">
              {subjectPerformance
                .sort((a, b) => b.average - a.average)
                .slice(0, 3)
                .map(subject => (
                  <li key={subject.subject}>
                    • {subject.subject}: {subject.average}%
                  </li>
                ))}
            </ul>
          </div>
          
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">Needs Attention</h4>
            <ul className="space-y-1 text-sm text-orange-700">
              {subjectPerformance
                .sort((a, b) => a.average - b.average)
                .slice(0, 2)
                .map(subject => (
                  <li key={subject.subject}>
                    • {subject.subject}: {subject.average}%
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Trends
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-blue-800">Class Average</p>
            <p className="text-2xl font-bold text-blue-900">82.5%</p>
            <p className="text-blue-700">↑ 2.3% from last term</p>
          </div>
          <div>
            <p className="font-medium text-blue-800">Top 10% Average</p>
            <p className="text-2xl font-bold text-blue-900">92.1%</p>
            <p className="text-blue-700">↑ 1.8% from last term</p>
          </div>
          <div>
            <p className="font-medium text-blue-800">Bottom 10% Average</p>
            <p className="text-2xl font-bold text-blue-900">68.4%</p>
            <p className="text-blue-700">↑ 4.2% from last term</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassPerformanceChart;
