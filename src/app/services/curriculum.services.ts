// Fetch curriculum by course and term

import axios from 'axios';
import { API_BASE_URL } from '../lib/api/config';

// Cache for curricula to prevent excessive API calls
let curriculaCache: { 
  data: any[]; 
  timestamp: number; 
  filters: string;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
let currentRequest: Promise<any> | null = null; // Prevent duplicate requests

// Create a new curriculum
export const createCurriculum = async (curriculumData: any, token: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/curriculum`, curriculumData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Clear cache after creating new curriculum
    curriculaCache = null;
    
    return response.data;
  } catch (error: any) {
    throw new Error(`Error creating curriculum: ${error.response?.data?.message || error.message}`);
  }
};

// Fetch all curricula for a school (optional filters for course, term, teacherId)
export const getCurricula = async (filters: { course?: string; term?: string; teacherId?: string }, token: string) => {
  try {
    const filterKey = JSON.stringify(filters);
    
    // Check if we have cached data that's still valid
    if (curriculaCache && 
        Date.now() - curriculaCache.timestamp < CACHE_DURATION &&
        curriculaCache.filters === filterKey) {
      console.log('Returning cached curricula data');
      return curriculaCache.data;
    }

    // If there's already a request in progress, wait for it
    if (currentRequest) {
      console.log('Waiting for existing request...');
      return await currentRequest;
    }

    // Make the request and cache it
    currentRequest = axios.get(`${API_BASE_URL}/curriculum`, { 
      params: filters,
      headers: { Authorization: `Bearer ${token}` }
    }).then(response => {
      // Cache the response
      curriculaCache = {
        data: response.data,
        timestamp: Date.now(),
        filters: filterKey
      };
      
      // Clear the current request
      currentRequest = null;
      
      return response.data;
    }).catch(error => {
      // Clear the current request on error
      currentRequest = null;
      throw error;
    });

    return await currentRequest;
    
  } catch (error: any) {
    throw new Error(`Error fetching curricula: ${error.response?.data?.message || error.message}`);
  }
};

// Clear curricula cache (useful when data changes)
export const clearCurriculaCache = () => {
  curriculaCache = null;
  currentRequest = null;
};

// Fetch a curriculum by its ID
export const getCurriculumById = async (id: string, token: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/curriculum/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(`Error fetching curriculum: ${error.response?.data?.message || error.message}`);
  }
};

// Update a curriculum by its ID
export const updateCurriculum = async (id: string, updatedData: any, token: string) => {
  try {
    const response = await axios.patch(`${API_BASE_URL}/curriculum/${id}`, updatedData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Clear cache after updating curriculum
    clearCurriculaCache();
    
    return response.data;
  } catch (error: any) {
    throw new Error(`Error updating curriculum: ${error.response?.data?.message || error.message}`);
  }
};

// Fetch curriculum by course ID
export const getCurriculumByCourse = async (courseId: string, token: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/curriculum/course/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return []; // Return empty array if no curriculum found for this course
    }
    throw new Error(`Error fetching curriculum by course: ${error.response?.data?.message || error.message}`);
  }
};

// Delete a curriculum by its ID
export const deleteCurriculum = async (id: string, token: string) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/curriculum/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Clear cache after deleting curriculum
    clearCurriculaCache();
    
    return response.data;
  } catch (error: any) {
    throw new Error(`Error deleting curriculum: ${error.response?.data?.message || error.message}`);
  }
};

export const getCurriculumByCourseAndTerm = async ({
  courseId,
  termId,
  token
}: {
  courseId: string;
  termId: string;
  token: string;
}) => {
  try {
      const response = await axios.post(
        `${API_BASE_URL}/curriculum/by-course-term`,
        { courseId, termId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error(`Error fetching curriculum by course and term: ${error.response?.data?.message || error.message}`);
  }
};