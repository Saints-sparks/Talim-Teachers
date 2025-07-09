import { useState, useCallback, useRef } from 'react';
import { createCurriculum, getCurricula, getCurriculumById, getCurriculumByCourse, updateCurriculum, deleteCurriculum } from '../services/curriculum.services';
import { useAuth } from './useAuth';

export function useCurriculum() {
  const { getAccessToken } = useAuth();
  const [curricula, setCurricula] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState<boolean>(false); // Add this state
  
  // Prevent multiple simultaneous requests
  const isLoadingRef = useRef<boolean>(false);

  // Fetch all curricula with optional filters
  const fetchCurricula = useCallback(async (filters: { course?: string; term?: string; teacherId?: string }) => {
    // Prevent multiple calls if one is already in progress
    if (isLoadingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const data = await getCurricula(filters, token);
      setCurricula(data);
    } catch (error: any) {
      setError(error.message);
      console.error('Error fetching curricula:', error);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [getAccessToken]);

  // Create a new curriculum
  const addCurriculum = async (curriculumData: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      const newCurriculum = await createCurriculum(curriculumData, token);
      setCurricula(prev => [...prev, newCurriculum]);
      return newCurriculum;
    } catch (error: any) {
      setError(error.message);
      console.error('Error creating curriculum:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch a single curriculum by ID
  const fetchCurriculumById = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      const data = await getCurriculumById(id, token);
      return data;
    } catch (error: any) {
      setError(error.message);
      console.error('Error fetching curriculum by ID:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch curriculum by course ID
  const fetchCurriculumByCourse = async (courseId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      const data = await getCurriculumByCourse(courseId, token);
      return data;
    } catch (error: any) {
      setError(error.message);
      console.error('Error fetching curriculum by course:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update a curriculum
  const editCurriculum = async (id: string, updatedData: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      const updatedCurriculum = await updateCurriculum(id, updatedData, token);
      setCurricula(prev => prev.map(curriculum => 
        curriculum._id === id ? updatedCurriculum : curriculum
      ));
      return updatedCurriculum;
    } catch (error: any) {
      setError(error.message);
      console.error('Error updating curriculum:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a curriculum
  const removeCurriculum = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      await deleteCurriculum(id, token);
      setCurricula(prev => prev.filter(curriculum => curriculum._id !== id));
    } catch (error: any) {
      setError(error.message);
      console.error('Error deleting curriculum:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    curricula,
    isLoading,
    error,
    showEditor,
    setShowEditor,
    fetchCurricula,
    addCurriculum,
    fetchCurriculumById,
    fetchCurriculumByCourse,
    editCurriculum,
    removeCurriculum,
  };
}