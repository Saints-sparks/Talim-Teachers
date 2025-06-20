// src/app/types/types.ts

// Subject type based on the Mongoose schema
export interface Subject {
  _id: string;
  name: string;
  subjectId: string;
  code: string;
  schoolId: string;
  createdAt?: string;
  updatedAt?: string;
}

// Course type based on the CreateCourseDto and controller responses
export interface Course {
  _id: string;
  title: string;
  description: string;
  courseCode: string;
  subjectId: string;
  teacherId: string;
  classId: string;
  teacherRole: 'Academic' | 'NonAcademic';
  schoolId: string;
  createdAt?: string;
  updatedAt?: string;
}

// Response message DTO for success/error messages
export interface ResponseMessageDto {
  message: string;
}

// DTO for creating a new subject
export interface CreateSubjectDto {
  name: string;
  subjectId: string;
  code: string;
  schoolId: string;
}

// DTO for updating a subject
export interface UpdateSubjectDto {
  name?: string;
  code?: string;
}

// DTO for creating a new course
export interface CreateCourseDto {
  title: string;
  description: string;
  courseCode: string;
  subjectName: string;
  teacherId: string;
  classId: string;
  teacherRole: 'Academic' | 'NonAcademic';
  schoolId: string;
}

// DTO for updating a course
export interface UpdateCourseDto {
  title?: string;
  description?: string;
  courseCode?: string;
  subjectName?: string;
  teacherId?: string;
  classId?: string;
  teacherRole?: 'Academic' | 'NonAcademic';
}