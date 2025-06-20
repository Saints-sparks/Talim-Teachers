import axios, { AxiosInstance } from 'axios';
import { Subject } from '../../types/types';
import { Course } from '../../types/types';
import { ResponseMessageDto } from '../../types/response-message';
import { CreateSubjectDto, UpdateSubjectDto, CreateCourseDto, UpdateCourseDto } from '../../types/dtos';
import { API_BASE_URL } from '../lib/api/config';

export class SubjectService {
  private readonly axiosInstance: AxiosInstance;
  private readonly token: string | null;

  constructor(token: string | null) {
    this.token = token;
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  }

  // Fetch all subjects by school
  async getSubjectsBySchool(): Promise<Subject[]> {
    try {
      const response = await this.axiosInstance.get('/subjects-courses/by-school');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch subjects');
    }
  }

  // Fetch a single subject by ID
  async getSubject(subjectId: string): Promise<Subject> {
    try {
      const response = await this.axiosInstance.get(`/subjects-courses/subjects/${subjectId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching subject:', error);
      throw new Error(error.response?.data?.message || 'Subject not found');
    }
  }

  // Create a new subject
  async createSubject(createSubjectDto: CreateSubjectDto): Promise<ResponseMessageDto> {
    try {
      const response = await this.axiosInstance.post('/subjects-courses/subjects', createSubjectDto);
      return response.data;
    } catch (error: any) {
      console.error('Error creating subject:', error);
      throw new Error(error.response?.data?.message || 'Failed to create subject');
    }
  }

  // Update an existing subject
  async editSubject(subjectId: string, updateSubjectDto: UpdateSubjectDto): Promise<ResponseMessageDto> {
    try {
      const response = await this.axiosInstance.post(`/subjects-courses/subjects/${subjectId}`, updateSubjectDto);
      return response.data;
    } catch (error: any) {
      console.error('Error updating subject:', error);
      throw new Error(error.response?.data?.message || 'Failed to update subject');
    }
  }

  // Delete a subject
  async deleteSubject(subjectId: string): Promise<ResponseMessageDto> {
    try {
      const response = await this.axiosInstance.delete(`/subjects-courses/subjects/${subjectId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete subject');
    }
  }

  // Fetch courses by subject and school
  async getCoursesBySubject(subjectId: string): Promise<Course[]> {
    try {
      const response = await this.axiosInstance.get(`/subjects-courses/courses/subject/${subjectId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching courses by subject:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch courses');
    }
  }

  // Fetch all courses by school
  async getCoursesBySchool(): Promise<Course[]> {
    try {
      const response = await this.axiosInstance.get('/subjects-courses/courses/school');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching courses by school:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch courses');
    }
  }

  // Create a new course
  async createCourse(createCourseDto: CreateCourseDto): Promise<ResponseMessageDto> {
    try {
      const response = await this.axiosInstance.post('/subjects-courses/courses', createCourseDto);
      return response.data;
    } catch (error: any) {
      console.error('Error creating course:', error);
      throw new Error(error.response?.data?.message || 'Failed to create course');
    }
  }

  // Update an existing course
  async editCourse(courseId: string, updateCourseDto: UpdateCourseDto): Promise<ResponseMessageDto> {
    try {
      const response = await this.axiosInstance.put(`/subjects-courses/courses/${courseId}`, updateCourseDto);
      return response.data;
    } catch (error: any) {
      console.error('Error updating course:', error);
      throw new Error(error.response?.data?.message || 'Failed to update course');
    }
  }

  // Delete a course
  async deleteCourse(courseId: string): Promise<ResponseMessageDto> {
    try {
      const response = await this.axiosInstance.delete(`/subjects-courses/courses/${courseId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting course:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete course');
    }
  }

  // Fetch a single course by ID
  async getCourse(courseId: string): Promise<Course> {
    try {
      const response = await this.axiosInstance.get(`/subjects-courses/courses/${courseId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching course:', error);
      throw new Error(error.response?.data?.message || 'Course not found');
    }
  }
}

export default SubjectService;