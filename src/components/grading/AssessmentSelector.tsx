'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, AlertCircle, Play, Layout } from 'lucide-react';
import Badge from '@/components/ui/badge';
import { Assessment, AssessmentStatus } from '@/types/grading';
import { GradingService, Assessment as ApiAssessment } from '@/app/services/grading.service';
import { useAuth } from '@/app/hooks/useAuth';
import { getCurrentTerm } from '@/app/services/api.service';

interface AssessmentSelectorProps {
  onAssessmentSelect: (assessment: ApiAssessment | null) => void;
  selectedAssessment: ApiAssessment | null;
  termId?: string;
}

const AssessmentSelector: React.FC<AssessmentSelectorProps> = ({
  onAssessmentSelect,
  selectedAssessment,
  termId = 'current-term'
}) => {
  const [assessments, setAssessments] = useState<ApiAssessment[]>([]);
  const [loading, setLoading] = useState(false);
const { isAuthenticated, getAccessToken } = useAuth();

const token = getAccessToken();
if(!token) {
  return(
    <Layout>
            <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
              <div className="text-center bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 text-lg">Please log in .</p>
              </div>
            </div>
          </Layout>
  )
}
  const gradingService = new GradingService();

  useEffect(() => {
    loadAssessments();
  }, [termId]);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const term = await getCurrentTerm(token);
      if (term && term._id) {
        // Use the real API to get active assessments by term
        const assessmentsData = await gradingService.getActiveAssessmentsByTerm(term._id, token);
        setAssessments(assessmentsData);
      } else {
        console.warn('No current term found');
        setAssessments([]);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string | AssessmentStatus) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'completed':
      case AssessmentStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'active':
      case AssessmentStatus.ACTIVE:
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'pending':
      case AssessmentStatus.PENDING:
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'cancelled':
      case AssessmentStatus.CANCELLED:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string | AssessmentStatus) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'completed':
      case AssessmentStatus.COMPLETED:
        return 'green';
      case 'active':
      case AssessmentStatus.ACTIVE:
        return 'blue';
      case 'pending':
      case AssessmentStatus.PENDING:
        return 'orange';
      case 'cancelled':
      case AssessmentStatus.CANCELLED:
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading assessments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select 
        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        value={selectedAssessment?._id || ''}
        onChange={(e) => {
          const assessment = assessments.find(a => a._id === e.target.value);
          onAssessmentSelect(assessment || null);
        }}
      >
        <option value="">Choose an assessment...</option>
        {assessments.map(assessment => (
          <option key={assessment._id} value={assessment._id}>
            {assessment.name} ({assessment.status})
          </option>
        ))}
      </select>

      {/* Assessment Details */}
      {selectedAssessment && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">{selectedAssessment.name}</h4>
            <div className="flex items-center gap-1">
              {getStatusIcon(selectedAssessment.status)}
              <span className="text-sm font-medium" style={{ color: getStatusColor(selectedAssessment.status) }}>
                {selectedAssessment.status}
              </span>
            </div>
          </div>
          
          {selectedAssessment.description && (
            <p className="text-sm text-gray-600 mb-2">{selectedAssessment.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Start: {formatDate(selectedAssessment.startDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>End: {formatDate(selectedAssessment.endDate)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Assessment Overview */}
      {!selectedAssessment && assessments.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-green-50 rounded border border-green-200">
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              <span className="font-medium">Completed</span>
            </div>
            <p className="text-green-700 font-bold">
              {assessments.filter(a => a.status.toLowerCase() === 'completed').length}
            </p>
          </div>
          <div className="p-2 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center gap-1 text-blue-600">
              <Play className="h-3 w-3" />
              <span className="font-medium">Active</span>
            </div>
            <p className="text-blue-700 font-bold">
              {assessments.filter(a => a.status.toLowerCase() === 'active').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentSelector;
