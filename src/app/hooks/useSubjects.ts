// src/app/hooks/useSubjects.ts

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'react-hot-toast';
import { Subject } from '../../types/types';
import SubjectService from '../services/subject.services';

interface UseSubjects {
  subjects: Subject[];
  loading: boolean;
  error: string | null;
  getSubjectsBySchool: () => Promise<void>;
}

export const useSubjects = (): UseSubjects => {
  const { getAccessToken } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getSubjectsBySchool = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const subjectService = new SubjectService(token);
      const data = await subjectService.getSubjectsBySchool();
      setSubjects(data);
    } catch (err: any) {
      console.error('Error fetching subjects:', err);
      setError(err.message || 'Failed to fetch subjects');
      toast.error(err.message || 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  return { subjects, loading, error, getSubjectsBySchool };
};

export default useSubjects;