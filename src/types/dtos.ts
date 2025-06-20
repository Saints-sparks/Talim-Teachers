// src/app/types/dtos.ts

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